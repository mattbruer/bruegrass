/**
 * Recording along with the band, and the open song's takes.
 *
 * Record: a count-in (the player's, playback/metronome/countIn.js), then the band plays the song (or the loop region)
 * once while the mic records onto the chosen track; it stops by itself at
 * the end, or when you press Stop. The take is saved on this device at once
 * (storage/songTakes.js), and from then on plays on its track's mixer channel
 * whenever the song plays. Recording again on a track keeps the old takes;
 * the newest is the one in use.
 *
 * Takes belong to a saved song, so a new song is saved before recording.
 */
import {
	addTake,
	deleteTake,
	listTakes,
	readTakeAudio,
	readTakeVideo,
	updateTake,
	useTake
} from '$lib/storage/songTakes.js';
import { downloadFile } from '$lib/utils/downloadFile.js';
import { slugify } from '$lib/utils/slugify.js';
import { RECORD_TRACKS, trackName } from '../takes/recordTracks.js';
import { freeTrack, takeLanes } from '../tracks/lanes.js';
import { partName, withPartName } from '../melody/partNames.js';
import { firstBar } from '../takes/takeTiming.js';
import { openRecordAlong } from '../takes/recordAlong.js';
import { readAudioFile, takeAsWav } from '../takes/takeFiles.js';
import { firstSound } from '../takes/takePickup.js';
import { clipLength, clipStart, clipsOfTrack } from '../takes/clips.js';
import { filmOffset } from '../takes/filmOffset.js';
import { isFilmed, withFilmedLane } from '../video/songVideo.js';

/** Shorter takes are stopped too soon to be worth keeping (seconds). */
const SHORTEST_TAKE = 1;

/**
 * @typedef {import('$lib/storage/songTakes.js').TakeDocument} TakeDocument
 * @typedef {{
 *   rig: import('../takes/recordAlong.js').RecordAlong,
 *   songId: string, trackId: string, bpm: number,
 *   regionStart: number, barOne: number, started: boolean, filmStarted: number
 * }} Recording
 *   regionStart: where the recorded pass starts in the song (seconds);
 *   barOne: the audio-clock time of its bar 1; started: the recorder is running;
 *   filmStarted: the audio-clock time the camera started (an A/V lane)
 */

export class RecordingState {
	/** @type {import('./Arranger.svelte.js').Arranger} */
	#arranger;

	/** The track the next take goes on. */
	trackId = $state(RECORD_TRACKS[0].id);
	/** 'idle', 'starting' (opening the mic), 'recording', or 'saving'. */
	status = $state(/** @type {'idle' | 'starting' | 'recording' | 'saving'} */ ('idle'));
	/** A problem to show in the record panel. */
	problem = $state('');
	/** The open song's takes, oldest first. */
	takes = $state.raw(/** @type {TakeDocument[]} */ ([]));
	/** What the last recording knew about the input (for the panel). */
	lastInput = $state.raw(
		/** @type {{ name: string, bluetooth: boolean, delayMs: number } | null} */ (null)
	);
	/** The camera while an A/V lane records (null: not filming), for a preview. */
	camera = $state.raw(/** @type {MediaStream | null} */ (null));

	isRecording = $derived(this.status === 'recording' || this.status === 'starting');
	/** The audio lanes on the Tracks page: record tracks with takes, or added and named. */
	lanes = $derived(
		takeLanes(
			this.takes,
			this.#arranger.song.partNames,
			this.#arranger.song.audioClips,
			this.#arranger.song.video.lanes
		)
	);
	/** The A/V lanes: each one a tile in the video view. */
	filmedLanes = $derived(this.lanes.filter((lane) => lane.filmed));
	/** The lane Record records on: the one armed, else the first (null: no lanes yet). */
	armedTrack = $derived(
		this.lanes.some((lane) => lane.id === this.trackId) ? this.trackId : (this.lanes[0]?.id ?? null)
	);
	canAddLane = $derived(freeTrack(this.lanes) !== null);
	/** Tracks with something to play: their mixer strips show. (Made afresh on each change, never changed.) */
	tracksInUse = $derived(
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		new Set(this.lanes.filter((lane) => lane.clips.length > 0).map((lane) => lane.id))
	);

	#songId = /** @type {string | null} */ (null);
	/** Each take's audio, ready to play, and where its sound begins, by take id (made once; audio, not UI state). */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#buffers = new Map();
	/** Each A/V take's film as a URL a <video> can play, by take id (made once; let go with the song). */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#films = new Map();

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
		arranger.player.takesToPlay = (leaveOut) => this.#playable(leaveOut);
	}

	/**
	 * Show this song's takes (null: a new song, which has none).
	 * @param {string | null} songId
	 */
	async showSong(songId) {
		if (songId === this.#songId) return;
		this.#songId = songId;
		this.#buffers.clear();
		this.#letGoOfFilms();
		this.takes = [];
		await this.#reload();
	}

	/** Read the open song's takes again (after takes arrive in a shared song). */
	async refreshTakes() {
		this.#buffers.clear();
		await this.#reload();
	}

	/**
	 * + Audio or + A/V: the next free record track, named, and armed to record on.
	 * @param {string} name
	 * @param {{ filmed?: boolean }} [options] filmed: an A/V lane, which films as it records
	 */
	addLane(name, { filmed = false } = {}) {
		const track = freeTrack(this.lanes);
		if (!track || !name.trim()) return;
		const { song } = this.#arranger;
		song.video = withFilmedLane(song.video, track.id, filmed);
		this.#name(track.id, name);
		this.trackId = track.id;
	}

	/**
	 * @param {string} trackId
	 * @param {string} name a blank one is refused: an empty lane without a name would go
	 */
	renameLane(trackId, name) {
		if (name.trim()) this.#name(trackId, name);
	}

	/** @param {string} trackId an empty lane: one with takes stays while it has them */
	removeLane(trackId) {
		const { song } = this.#arranger;
		song.video = withFilmedLane(song.video, trackId, false);
		this.#name(trackId, '');
		this.#arranger.parts.forget(trackId);
	}

	/** @param {string} trackId */
	laneName(trackId) {
		return partName(trackId, this.#arranger.song.partNames, trackName(trackId));
	}

	/** @param {string} trackId @param {string} name */
	#name(trackId, name) {
		const { song } = this.#arranger;
		song.partNames = withPartName(song.partNames, trackId, name);
	}

	async record() {
		const { player, song, arrangement, loop } = this.#arranger;
		const trackId = this.armedTrack;
		if (this.isRecording || !trackId) return;
		await song.keepAsYourOwn(); // a take belongs to a song: a template becomes yours here
		const songId = /** @type {string} */ (song.savedId);
		this.problem = '';
		this.status = 'starting';

		/** @type {import('../takes/recordAlong.js').RecordAlong | null} */
		let rig = null;
		try {
			const Tone = await import('tone');
			rig = await openRecordAlong(Tone, null, { filming: isFilmed(song.video, trackId) });
			this.camera = rig.camera;
			await rig.video?.start();
			const regionStart = arrangement.clock.secondsAt(loop.startInSong);
			/** @type {Recording} */
			const recording = {
				rig,
				songId,
				trackId,
				regionStart,
				bpm: arrangement.bpm,
				barOne: 0,
				started: false,
				filmStarted: rig.audio.currentTime
			};

			await player.play({
				countIn: true,
				passes: 1,
				leaveOutTrack: trackId,
				onStop: () => this.#finish(recording)
			});
			const playback = player.playback;
			if (!playback) throw new Error(player.problem || 'The band couldn’t start.');
			recording.barOne = playback.barOne;
			rig.recorder.start(player.countInAt);
			recording.started = true;

			addEventListener('visibilitychange', this.#stopWhenHidden);
			this.status = 'recording';
		} catch (problem) {
			rig?.close();
			this.camera = null;
			this.status = 'idle';
			this.problem = problem instanceof Error ? problem.message : String(problem);
		}
	}

	stop() {
		this.#arranger.player.stop();
	}

	// Switching apps on a phone: keep what's been recorded so far
	#stopWhenHidden = () => {
		if (document.visibilityState === 'hidden') this.stop();
	};

	/**
	 * The band has stopped: save the take.
	 * @param {Recording} recording
	 */
	async #finish({ rig, songId, trackId, regionStart, bpm, barOne, started, filmStarted }) {
		removeEventListener('visibilitychange', this.#stopWhenHidden);
		if (!started) return; // stopped before it began: record() lets go of the mic
		this.status = 'saving';
		try {
			const take = await rig.recorder.stop();
			const film = (await rig.video?.stop()) ?? null;
			const seconds = (take.channels[0]?.length ?? 0) / take.sampleRate;
			this.lastInput = {
				name: rig.inputName,
				bluetooth: rig.bluetooth,
				delayMs: Math.round(rig.roundTrip * 1000)
			};
			if (seconds < SHORTEST_TAKE) return;
			await addTake(
				{
					songId,
					trackId,
					from: 'recording',
					fileName: '',
					bpm,
					sampleRate: take.sampleRate,
					seconds,
					// The mic hears you a round trip after the band played: move the take back by it
					startsAt: regionStart + (take.startTime - barOne) - rig.roundTrip,
					nudgeMs: 0,
					latencyMs: Math.round(rig.roundTrip * 1000),
					video: film
						? { type: film.type, offset: await filmOffset(film, take, filmStarted, rig.audio) }
						: null
				},
				take.channels,
				film
			);
			if (songId === this.#songId) {
				await this.#reload();
				this.#playWhole(trackId);
			}
		} catch (problem) {
			this.problem = `The take couldn’t be saved: ${problem instanceof Error ? problem.message : problem}`;
		} finally {
			rig.close();
			this.camera = null;
			this.status = 'idle';
		}
	}

	/**
	 * Add a take from a file someone sent (a take file from this app starts
	 * one bar before bar 1, so it lines up).
	 * @param {File} file
	 * @param {string} trackId the audio lane it goes on
	 */
	async addFromFile(file, trackId) {
		const { song, arrangement } = this.#arranger;
		await song.keepAsYourOwn();
		this.problem = '';
		try {
			const Tone = await import('tone');
			const { channels, sampleRate } = await readAudioFile(file, Tone.getContext().rawContext);
			const bar = firstBar(arrangement.sections, arrangement.bpm);
			await addTake(
				{
					songId: song.savedId,
					trackId,
					from: 'file',
					fileName: file.name,
					bpm: arrangement.bpm,
					sampleRate,
					seconds: channels[0].length / sampleRate,
					startsAt: -bar.seconds,
					nudgeMs: 0,
					latencyMs: 0
				},
				channels
			);
			await this.#reload();
			this.#playWhole(trackId);
			this.#arranger.player.restartIfPlaying();
		} catch (problem) {
			this.problem = `That file couldn’t be read as audio: ${problem instanceof Error ? problem.message : problem}`;
		}
	}

	/** @param {TakeDocument} take */
	async download(take) {
		const channels = await readTakeAudio(take.id);
		if (!channels) return;
		const bar = firstBar(this.#arranger.arrangement.sections, take.bpm);
		const name = [this.#arranger.song.name, this.laneName(take.trackId), `${take.bpm}bpm`]
			.map(slugify)
			.join('-');
		downloadFile(takeAsWav(take, channels, bar.seconds), `${name}.wav`, 'audio/wav');
	}

	/**
	 * Move a take earlier (negative) or later by ear.
	 * @param {TakeDocument} take
	 * @param {number} changeMs
	 */
	async nudge(take, changeMs) {
		await updateTake({ ...take, nudgeMs: take.nudgeMs + changeMs });
		await this.#reload();
		this.#arranger.player.restartIfPlaying();
	}

	/** @param {TakeDocument} take make it the one its track plays, whole (Undo brings back the lane's edit) */
	async use(take) {
		await useTake(take);
		await this.#reload();
		this.#playWhole(take.trackId);
		this.#arranger.player.restartIfPlaying();
	}

	/**
	 * The lane plays its take in use, whole: its clips are forgotten (Undo brings them back).
	 * @param {string} trackId
	 */
	#playWhole(trackId) {
		const { song, history } = this.#arranger;
		if (!song.audioClips[trackId]) return;
		history.edit(() => {
			song.audioClips = Object.fromEntries(
				Object.entries(song.audioClips).filter(([id]) => id !== trackId)
			);
		});
	}

	/** @param {TakeDocument} take */
	async remove(take) {
		if (!confirm(`Delete this take from ${this.laneName(take.trackId)}? This can’t be undone.`))
			return;
		await deleteTake(take.id);
		this.#buffers.delete(take.id);
		const film = this.#films.get(take.id);
		if (film) URL.revokeObjectURL(film);
		this.#films.delete(take.id);
		await this.#reload();
		this.#arranger.player.restartIfPlaying();
	}

	async #reload() {
		this.takes = this.#songId ? await listTakes(this.#songId) : [];
	}

	/**
	 * Every audio lane's clips, as audio ready to play.
	 * @param {string | null} leaveOut a track to leave out (the one being recorded on)
	 * @returns {Promise<import('../takes/playTakes.js').PlayableClip[]>}
	 */
	async #playable(leaveOut) {
		const { audioClips } = this.#arranger.song;
		const clips = RECORD_TRACKS.filter((track) => track.id !== leaveOut).flatMap((track) =>
			clipsOfTrack(track.id, audioClips, this.takes)
		);
		const ready = [];
		for (const { clip, take } of clips) {
			const audio = await this.audioOf(take);
			if (!audio) continue;
			ready.push({
				trackId: take.trackId,
				buffer: audio.buffer,
				start: clipStart(clip, take),
				from: clip.from,
				seconds: clipLength(clip),
				gain: clip.gain,
				fadeIn: clip.fadeIn,
				fadeOut: clip.fadeOut,
				soundFrom: Math.max(0, audio.soundFrom - clip.from)
			});
		}
		return ready;
	}

	/**
	 * An A/V take's film, as a URL for a <video> (null: sound only, or it's gone).
	 * @param {TakeDocument} take
	 * @returns {Promise<string | null>}
	 */
	async filmOf(take) {
		if (!take.video) return null;
		const kept = this.#films.get(take.id);
		if (kept) return kept;
		const film = await readTakeVideo(take.id);
		if (!film) return null;
		const url = URL.createObjectURL(film);
		this.#films.set(take.id, url);
		return url;
	}

	#letGoOfFilms() {
		for (const url of this.#films.values()) URL.revokeObjectURL(url);
		this.#films.clear();
	}

	/**
	 * A take's audio, ready to play, and where its sound begins (null: it's gone).
	 * @param {TakeDocument} take
	 * @returns {Promise<{ buffer: AudioBuffer, soundFrom: number } | null>}
	 */
	async audioOf(take) {
		const kept = this.#buffers.get(take.id);
		if (kept) return kept;
		const channels = await readTakeAudio(take.id);
		if (!channels) return null;
		const Tone = await import('tone');
		const audio = Tone.getContext().rawContext;
		const buffer = audio.createBuffer(channels.length, channels[0].length, take.sampleRate);
		channels.forEach((channel, index) => buffer.copyToChannel(channel, index));
		const ready = { buffer, soundFrom: firstSound(channels[0], take.sampleRate) };
		this.#buffers.set(take.id, ready);
		return ready;
	}
}
