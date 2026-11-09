/**
 * Recording along with the band, and the open song's takes.
 *
 * Record: a bar of clicks, then the band plays the song (or the loop region)
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
	updateTake,
	useTake
} from '$lib/storage/songTakes.js';
import { downloadFile } from '$lib/utils/downloadFile.js';
import { slugify } from '$lib/utils/slugify.js';
import { RECORD_TRACKS, trackName } from '../takes/recordTracks.js';
import { firstBar } from '../takes/takeTiming.js';
import { openRecordAlong } from '../takes/recordAlong.js';
import { readAudioFile, takeAsWav } from '../takes/takeFiles.js';

/** How long recording runs past the song's end, for the last chord to ring (seconds). */
const RING_OUT = 2;
/** Shorter takes are stopped too soon to be worth keeping (seconds). */
const SHORTEST_TAKE = 1;

/**
 * @typedef {import('$lib/storage/songTakes.js').TakeDocument} TakeDocument
 * @typedef {{
 *   rig: import('../takes/recordAlong.js').RecordAlong,
 *   songId: string, trackId: string, bpm: number,
 *   regionStart: number, barOne: number, started: boolean, stopClicks: () => void
 * }} Recording
 *   regionStart: where the recorded pass starts in the song (seconds);
 *   barOne: the audio-clock time of its bar 1; started: the recorder is running
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

	isRecording = $derived(this.status === 'recording' || this.status === 'starting');
	/** Tracks with a take in use: their mixer strips show. (Made afresh on each change, never changed.) */
	tracksInUse = $derived(
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		new Set(this.takes.filter((take) => take.inUse).map((take) => take.trackId))
	);

	#songId = /** @type {string | null} */ (null);
	/** Each take's audio, ready to play, by take id (made once; audio, not UI state). */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#buffers = new Map();

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
		this.takes = [];
		await this.#reload();
	}

	async record() {
		const { player, song, arrangement, loop } = this.#arranger;
		if (this.isRecording || !song.savedId) return;
		const songId = song.savedId;
		const trackId = this.trackId;
		this.problem = '';
		this.status = 'starting';

		/** @type {import('../takes/recordAlong.js').RecordAlong | null} */
		let rig = null;
		try {
			const Tone = await import('tone');
			rig = await openRecordAlong(Tone, null);
			const bar = firstBar(loop.sectionsToPlay, arrangement.bpm);
			const regionStart = (loop.startInSong * 60) / arrangement.bpm;
			/** @type {Recording} */
			const recording = {
				rig,
				songId,
				trackId,
				regionStart,
				bpm: arrangement.bpm,
				barOne: 0,
				started: false,
				stopClicks: () => {}
			};

			await player.play({
				countIn: bar.seconds,
				passes: 1,
				leaveOutTrack: trackId,
				onStop: () => this.#finish(recording)
			});
			const playback = player.playback;
			if (!playback) throw new Error(player.problem || 'The band couldn’t start.');
			recording.barOne = playback.barOne;
			const countInAt = playback.barOne - bar.seconds;
			recording.stopClicks = rig.countIn(
				{ tempo: arrangement.bpm, beatsPerBar: bar.quarters },
				countInAt
			);
			rig.recorder.start(countInAt);
			recording.started = true;

			const endsIn = playback.barOne + playback.passLength + RING_OUT - rig.audio.currentTime;
			this.#endTimer = setTimeout(() => player.stop(), endsIn * 1000);
			addEventListener('visibilitychange', this.#stopWhenHidden);
			this.status = 'recording';
		} catch (problem) {
			rig?.close();
			this.status = 'idle';
			this.problem = problem instanceof Error ? problem.message : String(problem);
		}
	}

	stop() {
		this.#arranger.player.stop();
	}

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	#endTimer;

	// Switching apps on a phone: keep what's been recorded so far
	#stopWhenHidden = () => {
		if (document.visibilityState === 'hidden') this.stop();
	};

	/**
	 * The band has stopped: save the take.
	 * @param {Recording} recording
	 */
	async #finish({ rig, songId, trackId, regionStart, bpm, barOne, started, stopClicks }) {
		clearTimeout(this.#endTimer);
		removeEventListener('visibilitychange', this.#stopWhenHidden);
		stopClicks();
		if (!started) return; // stopped before it began: record() lets go of the mic
		this.status = 'saving';
		try {
			const take = await rig.recorder.stop();
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
					latencyMs: Math.round(rig.roundTrip * 1000)
				},
				take.channels
			);
			if (songId === this.#songId) await this.#reload();
		} catch (problem) {
			this.problem = `The take couldn’t be saved: ${problem instanceof Error ? problem.message : problem}`;
		} finally {
			rig.close();
			this.status = 'idle';
		}
	}

	/**
	 * Add a take from a file someone sent (a take file from this app starts
	 * one bar before bar 1, so it lines up).
	 * @param {File} file
	 */
	async addFromFile(file) {
		const { song, arrangement } = this.#arranger;
		if (!song.savedId) return;
		this.problem = '';
		try {
			const Tone = await import('tone');
			const { channels, sampleRate } = await readAudioFile(file, Tone.getContext().rawContext);
			const bar = firstBar(arrangement.sections, arrangement.bpm);
			await addTake(
				{
					songId: song.savedId,
					trackId: this.trackId,
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
		const name = [this.#arranger.song.name, trackName(take.trackId), `${take.bpm}bpm`]
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

	/** @param {TakeDocument} take make it the one its track plays */
	async use(take) {
		await useTake(take);
		await this.#reload();
		this.#arranger.player.restartIfPlaying();
	}

	/** @param {TakeDocument} take */
	async remove(take) {
		if (!confirm(`Delete this take from ${trackName(take.trackId)}? This can’t be undone.`)) return;
		await deleteTake(take.id);
		this.#buffers.delete(take.id);
		await this.#reload();
		this.#arranger.player.restartIfPlaying();
	}

	async #reload() {
		this.takes = this.#songId ? await listTakes(this.#songId) : [];
	}

	/**
	 * The takes in use, as audio ready to play.
	 * @param {string | null} leaveOut a track to leave out (the one being recorded on)
	 * @returns {Promise<import('../takes/playTakes.js').PlayableTake[]>}
	 */
	async #playable(leaveOut) {
		const inUse = this.takes.filter((take) => take.inUse && take.trackId !== leaveOut);
		if (inUse.length === 0) return [];
		const Tone = await import('tone');
		const audio = Tone.getContext().rawContext;
		const ready = [];
		for (const take of inUse) {
			let buffer = this.#buffers.get(take.id);
			if (!buffer) {
				const channels = await readTakeAudio(take.id);
				if (!channels) continue;
				buffer = audio.createBuffer(channels.length, channels[0].length, take.sampleRate);
				channels.forEach((channel, index) => buffer.copyToChannel(channel, index));
				this.#buffers.set(take.id, buffer);
			}
			ready.push({ ...take, buffer });
		}
		return ready;
	}
}
