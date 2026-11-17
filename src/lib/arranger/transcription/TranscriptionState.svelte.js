/**
 * Transcribing a song from a recording, the way Logic does it: the
 * recording's beats and bars are found for you (its tempo map: the ruler
 * follows the recording), then the song is written on those bars in a
 * track grid, chords in their lane and the tune in the piano roll below.
 *
 * Opening a recording opens the song written from it (the song names its
 * recording), else makes a new song on its bars. The song's chart is the
 * one place its chords, sections and key live, wherever they were typed:
 * Transcribe reads them from the chart on the recording's bars
 * (readChartOnBars.js), a chord typed here is written into its bar of the
 * chart in place (chart/withBarChords.js), and a change to the bars, time
 * or markers writes the chart again on the new bars (chartFromBars.js).
 * Notes drawn in the roll go into the song's tune, as they do anywhere.
 *
 * The grid is plain data (beatGrid.js) and every change goes through its
 * functions; the recording is analysed once on opening
 * (beats/analyseRecording.js). The transcription is kept as a draft per
 * recording (transcriptionDraft.js), so nothing is lost on leaving.
 *
 * It lives on the Arranger, so the work stays while you visit its other
 * pages: `leave` when the Transcribe page goes (the recording stops),
 * `dispose` when the arranger goes (the player has its own audio context).
 */
import { StretchPlayer } from '$lib/slowDowner/StretchPlayer.svelte.js';
import { waveformPeaks } from '../takes/waveformPeaks.js';
import { layOutBars, withBarLength, withBeatsPerBar } from './barPlan.js';
import {
	newBeatGrid,
	nearestBeat,
	withOneAt,
	withBeatAdded,
	withBeatMoved,
	withBeatRemoved,
	withBeatsDoubled,
	withBeatsHalved,
	tempoAt
} from './beatGrid.js';
import { ANALYSIS_VERSION, analyseRecording } from './beats/analyseRecording.js';
import { readRecordingAnalysis, writeRecordingAnalysis } from '$lib/storage/recordingAnalyses.js';
import { detectBeats } from './beats/detectBeats.js';
import { snapToHit, tapToHit } from './beats/snapToHit.js';
import {
	clearTranscriptionDraft,
	readTranscriptionDraft,
	writeTranscriptionDraft
} from './transcriptionDraft.js';
import { chartFromBars } from './chartFromBars.js';
import { readChartOnBars, SECTION_END } from './readChartOnBars.js';
import { namedSections, withUniqueSectionNames } from './arrangementFromTranscription.js';
import { chartCell, isEmptyBar, isHeld, slotsFromTyped, slotsOf } from './barChords.js';
import { DEFAULT_TIME, timeSignature } from './timeSignatures.js';
import { keyFieldName, withKeyField } from '../chart/keyField.js';
import { withBarChords } from '../chart/withBarChords.js';
import { NO_CHORD } from '../chart/noChord.js';
import { isKnownChord, unknownChordMessage } from '../chart/knownChords.js';
import { listArrangements } from '$lib/storage/arrangements.js';
import { quartersAt, secondsAt } from './tempoMap.js';
import { barStepTarget } from './barStep.js';
import { findTuning } from '$lib/slowDowner/findTuning.js';
import { clampCents } from '$lib/slowDowner/tuning.js';
import { bundledRecording } from './bundledRecordings.js';
import { STARTER_SONG } from '../starterSong.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { BASS_VOICE, readBassScore, writtenBassNotes } from '../bass/readBass.js';
import { blankBassAbc } from '../bass/bassAbc.js';
import { bassSongOf } from '../bass/songBassStyle.svelte.js';
import { abcjsIfLoaded } from '../state/abcjsLoaded.svelte.js';
import { newExtraLane } from './extraLanes.js';
import { uprightPitch } from '../instruments/upright.js';
import { channelInstrument } from '../instruments/tuneInstruments.js';
import { mixer } from '../mixer/mixer.svelte.js';
import { heardNotes, laneLevels } from './heardParts.js';
import { TranscribeBand } from './TranscribeBand.svelte.js';
import { CycleState, leadInBefore } from './CycleState.svelte.js';
import { pickupLength, withPickupLength } from '../melody/roll/pickupBar.js';

/**
 * @typedef {{ key: string, name: string, source: string | Blob }} Recording
 *   key: the same recording gets the same key (its URL, or a file's name and size)
 * @typedef {import('./beatGrid.js').BeatGrid} BeatGrid
 * @typedef {import('./barChords.js').Slots} Slots
 */

/** The song view's waveform detail (peaks a second). */
export const PEAKS_PER_SECOND = 200;
/** Onset strength (in its own spread) drawn full height. */
const HIT_SCALE = 6;
/** Hearing beat 1 starts this long before it, so the count leads into it. */
const LISTEN_BEFORE_SECONDS = 2.5;
/** The recording's and the band's lane ids among the lanes that can be muted and soloed. */
const RECORDING_LANE = 'recording';
const BAND_LANE = 'band';

export class TranscriptionState {
	player = new StretchPlayer();
	/** @type {Recording | null} */
	recording = $state.raw(null);
	/** @type {BeatGrid | null} */
	grid = $state.raw(null);
	/** The time signature's id (timeSignatures.js). */
	time = $state(DEFAULT_TIME);
	/** @type {import('./extraLanes.js').ExtraLane[]} the generic lanes (+ Lane), to write by ear */
	extraLanes = $state.raw([]);
	/**
	 * How early each section's tune starts, in beats before its marker's bar (its
	 * pickup: "I was…" sung before the verse's first bar). Only the tune: the
	 * chords and the band keep to the bar lines. Bar number → beats.
	 * @type {Record<number, number>}
	 */
	pickups = $state.raw({});
	/** The generic lanes' notes, as the grid shows them. */
	laneNotes = $derived(
		this.extraLanes.map((lane) => ({
			id: lane.id,
			name: lane.name,
			notes: writtenBassNotes(readBassScore(this.laneAbc(lane), abcjsIfLoaded()))
		}))
	);
	/** The part the piano roll edits (a voice id). */
	lane = $state(MELODY_CHANNEL);
	/** The open bar's menu is for naming its marker (its name box takes the keys). */
	naming = $state(false);
	/**
	 * The part lanes as the grid shows them (it reads the written bass), to hear with the recording.
	 * @type {import('../tracks/lanes.js').BandLane[]}
	 */
	parts = $state.raw([]);
	/** The recording's own volume (dB), mute and solo (the parts' are their mixer channels'). */
	recordingLane = $state({ volume: 0, mute: false, solo: false });

	/** @type {Float32Array | null} */
	peaks = $state.raw(null);
	/** @type {{ values: Float32Array, perSecond: number, offset: number } | null} how strongly something starts at each moment, 0 to 1 (the hits to line beats up with) */
	hits = $state.raw(null);
	/** @type {number | null} the bar whose menu is open, and that Loop plays */
	openBar = $state(null);
	/** @type {number | null} the beat whose menu is open (index into the grid's beats) */
	selectedBeat = $state(null);
	finding = $state(false);
	/** Beat 1 of bar 1, in seconds into the recording, as you placed it (null: not yet). */
	downbeat = $state(/** @type {number | null} */ (null));
	/** Placing beat 1 comes before finding the beats. */
	settingDownbeat = $state(false);
	/** Whether the time signature was chosen (a new recording's must be, with beat 1, before its bars are found). */
	timeChosen = $state(false);
	/** Beat 1 was just tapped: hearing it with the count, to say whether it's right. */
	checkingDownbeat = $state(false);
	/** Listening through comes last: "one" fixed where it drifts, and every part named. */
	listening = $state(false);
	/** Choosing another recording, with one open (the setup's first step again). */
	pickingRecording = $state(false);
	/**
	 * Which step of setting up a transcription is showing (null: set up, the
	 * workspace shows). The steps are SETUP_STEPS, in order.
	 * @type {import('./setupSteps.js').SetupStep | null}
	 */
	setupStep = $derived(
		!this.recording || this.pickingRecording
			? 'recording'
			: this.settingDownbeat || !this.grid
				? 'downbeat'
				: this.listening
					? 'listen'
					: null
	);
	clicksOn = $state(true);
	/** Logic's cycle: the region the player loops while it's on. */
	cycle = new CycleState(this);

	bars = $derived(this.grid ? layOutBars(this.grid.beats.length, this.grid.bars) : []);
	bar = $derived(this.bars.find((bar) => bar.number === this.openBar) ?? null);
	/** The song open now is the one written from this recording. */
	linked = $derived(!!this.recording && this.arranger.song.recording?.key === this.recording.key);
	/** The open song's chart on the recording's bars (nothing while another song is open). */
	#chartOnBars = $derived(
		this.linked
			? readChartOnBars(this.arranger.arrangement.text, this.arranger.arrangement.sections)
			: readChartOnBars('', [])
	);
	/** @type {Record<number, Slots>} bar number → its chords, a slot per beat */
	chords = $derived(this.#chartOnBars.chords);
	/** @type {Record<number, string>} bar number → the section (marker) starting there */
	markers = $derived(this.#chartOnBars.markers);
	/**
	 * The sections you've named, which are the ones that can go to the
	 * arranger: each with its bars, its first line of words and its pickup (beats).
	 */
	sections = $derived(
		namedSections(
			withUniqueSectionNames(this.arranger.arrangement.text),
			this.arranger.arrangement.sections.map((section) => section.measures.length)
		).map((section) => ({ ...section, pickup: this.sectionPickup(section.from) }))
	);
	/** The key the chart names ("G", "Em"; null: none, guessed from the first chord). */
	key = $derived(this.linked ? keyFieldName(this.arranger.arrangement.text) : null);
	/** Where the recording is now, in the song's quarters from bar 1. */
	quartersNow = $derived(this.grid ? quartersAt(this.grid, this.player.time) : 0);
	/**
	 * The pickup an unwritten tune starts with (quarters), chosen by you: the
	 * recording can't tell a pickup from an intro or a kick-off.
	 */
	newTunePickup = $state(0);
	/** @type {{ abc: string, message: string } | null} a pickup change refused, and the tune it was refused on */
	#pickupRefused = $state(null);
	/** Why the last pickup change wasn't made, until the tune changes ('' when it was made). */
	pickupProblem = $derived(
		this.#pickupRefused?.abc === this.arranger.melody.notation ? this.#pickupRefused.message : ''
	);
	/** The tune's pickup now (quarters): the written tune's, or the one an unwritten tune will start with. */
	pickup = $derived.by(() => {
		const voices = this.arranger.melody.voices;
		return voices ? pickupLength(voices.map((voice) => voice.score)) : this.newTunePickup;
	});
	/** The pickups to choose from (quarters): none, up to a beat short of a bar. */
	pickupChoices = $derived(
		Array.from({ length: this.grid?.bars.beatsPerBar ?? 4 }, (_, beats) => beats)
	);
	/** The written parts' notes, on the recording's time (a written bass plays on the band's upright instead). */
	heardNotes = $derived(
		this.grid
			? heardNotes(
					this.band.performance ? this.parts.filter((part) => part.id !== BASS_VOICE) : this.parts,
					this.grid,
					(lane, pitch) => this.#soundingPitch(lane, pitch)
				)
			: []
	);
	/** How loud the recording and each part are (volume, mute and solo). */
	levels = $derived.by(() => {
		const lanes = [
			{ id: RECORDING_LANE, ...this.recordingLane },
			...(this.band.performance ? [{ id: BAND_LANE, ...this.band.lane }] : []),
			...this.parts.map((part) => {
				const channel = mixer.channels.find((each) => each.id === part.id);
				return {
					id: part.id,
					volume: channel?.volume ?? 0,
					mute: channel?.mute ?? false,
					solo: channel?.solo ?? false
				};
			})
		];
		const { [RECORDING_LANE]: recording, [BAND_LANE]: band = 0, ...parts } = laneLevels(lanes);
		return { recording, band, parts };
	});
	/** The recording's usual tempo (beats a minute). */
	tempo = $derived.by(() => {
		const beats = this.grid?.beats ?? [];
		const tempos = beats.map((_, i) => tempoAt(beats, i)).toSorted((a, b) => a - b);
		return Math.round(tempos[tempos.length >> 1] ?? 0);
	});

	/** @type {AudioBuffer | null} */
	#audio = $state.raw(null);

	/** The recording's audio, decoded (null until it's loaded): for drawing it in detail. */
	get audio() {
		return this.#audio;
	}
	/** @type {import('./beats/analyseRecording.js').Analysis | null} */
	#analysis = null;

	/** @param {import('../state/Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.arranger = arranger;
		/** The arranger's band playing the chart along with the recording. */
		this.band = new TranscribeBand(this);
		this.player.onClock = (clock) => this.band.follow(clock);
		this.player.onPause = () => this.band.stop();
	}

	/** How loud the recording, the band and each part are heard now. */
	hearLevels() {
		this.player.setLevels(this.levels);
		this.band.setLevels(
			this.levels,
			this.parts.some((part) => part.id === BASS_VOICE)
		);
	}

	/**
	 * Open a recording: find (or bring back) its beats and bars, and make it
	 * the open song's recording.
	 * @param {Recording} recording
	 */
	async open(recording) {
		this.recording = recording;
		this.grid = null;
		this.time = DEFAULT_TIME;
		this.extraLanes = [];
		this.pickups = {};
		this.peaks = null;
		this.hits = null;
		this.downbeat = null;
		this.settingDownbeat = false;
		this.checkingDownbeat = false;
		const placed = (readTranscriptionDraft(recording.key)?.downbeat ?? null) !== null;
		this.timeChosen = placed;
		this.listening = false;
		this.pickingRecording = false;
		this.cycle.clear();
		this.player.setCents(0);
		this.closeMenus();
		this.#audio = null;
		this.#analysis = null;
		const audio = await this.player.load(recording.source);
		if (!audio || this.recording !== recording) return;
		this.#audio = audio;
		this.peaks = waveformPeaks(channelsOf(audio), audio.sampleRate, PEAKS_PER_SECOND);

		const analysis = await this.#analysisOf(recording, audio);
		if (!analysis || this.#audio !== audio) return;
		this.#analysis = analysis;
		this.hits = hitsOf(analysis);

		await this.#carryOn(readTranscriptionDraft(recording.key));
	}

	/**
	 * Go on from the draft (null: none), or place beat 1 first.
	 * @param {import('./transcriptionDraft.js').Transcription | null} draft
	 */
	async #carryOn(draft) {
		// Beats come back only when you placed beat 1; an older draft's were guessed
		if (draft) {
			this.grid = draft.downbeat === null ? null : draft.grid;
			this.time = draft.time;
			this.extraLanes = draft.lanes;
			this.pickups = draft.pickups;
			this.player.setCents(draft.cents);
			this.downbeat = draft.downbeat;
			// A song written from it before songs named their recording
			if (draft.written && draft.written === this.arranger.arrangement.text)
				this.arranger.song.recording = this.#songsRecording();
		}
		if (!this.grid) this.settingDownbeat = true;
		else if (!this.linked) await this.#openSongOrStart();
		if (this.grid && this.sections.length === 0) this.listenThrough();
	}

	/** Open the song last written from this recording, or start one. */
	async #openSongOrStart() {
		const key = this.recording?.key;
		const songs = await listArrangements();
		const written = songs.find((song) => song.recording?.key === key);
		if (this.recording?.key !== key) return;
		if (written) await this.arranger.song.open(written.id);
		else this.startSong();
	}

	/**
	 * What the recording's sound does (hits, bass, chords): kept on this device
	 * after the first time, since it depends only on the audio. Null if another
	 * recording was opened meanwhile.
	 * @param {Recording} recording
	 * @param {AudioBuffer} audio
	 */
	async #analysisOf(recording, audio) {
		const stamp = {
			version: ANALYSIS_VERSION,
			samples: audio.length,
			sampleRate: audio.sampleRate
		};
		const kept = await readRecordingAnalysis(recording.key, stamp).catch(() => null);
		if (kept || this.#audio !== audio) return kept;

		this.finding = true;
		// Let "Listening to the recording…" show: the analysis takes a second or two
		await new Promise((done) => setTimeout(done, 30));
		const analysis =
			this.#audio === audio ? analyseRecording(channelsOf(audio), audio.sampleRate) : null;
		this.finding = false;
		if (!analysis) return null;
		writeRecordingAnalysis(recording.key, stamp, analysis).catch(console.error);
		return analysis;
	}

	/** Open the recording the open song was written from, if it's one of the app's own and isn't open. */
	reopenSongsRecording() {
		const wanted = this.arranger.song.recording;
		if (!wanted || this.recording?.key === wanted.key) return;
		const recording = bundledRecording(wanted.key);
		if (recording) this.open(recording);
	}

	/** The open recording as the song keeps it: its key and name. */
	#songsRecording() {
		return this.recording ? { key: this.recording.key, name: this.recording.name } : null;
	}

	/**
	 * Beat 1 is here: exactly at the playhead (paused: you put it there, often
	 * zoomed in, so it isn't moved), or on the hit just before it (tapped
	 * while it plays: a tap comes a little late). The beats and bars are
	 * found through it at once, to check by ear (listenToDownbeat).
	 */
	markDownbeatHere() {
		if (!this.#analysis || !this.timeChosen) return;
		const tapped = this.player.playing;
		this.player.pause();
		const at = this.player.time;
		this.downbeat = tapped ? tapToHit(at, this.#analysis) : Math.round(at * 1000) / 1000;
		this.#findBeatsFromDownbeat();
		this.checkingDownbeat = true;
	}

	/** Hear beat 1 with the count: from a little before it, a click on every beat, higher on ONE. */
	listenToDownbeat() {
		if (this.downbeat === null) return;
		this.clicksOn = true;
		this.player.seek(Math.max(0, this.downbeat - LISTEN_BEFORE_SECONDS));
		this.player.play();
	}

	/** Not right: back to marking it, the playhead on the one marked. */
	tryDownbeatAgain() {
		this.player.pause();
		this.checkingDownbeat = false;
		if (this.downbeat !== null) this.player.seek(this.downbeat);
	}

	/** Beat 1 sounds right: on to listening through. */
	downbeatSoundsRight() {
		this.player.pause();
		this.checkingDownbeat = false;
		this.settingDownbeat = false;
		if (!this.linked) this.#openSongOrStart();
		this.listenThrough();
	}

	/** Go to listening through (again): the count clicks on, to hear where each bar starts. */
	listenThrough() {
		this.closeMenus();
		this.clicksOn = true;
		this.player.seek(0);
		this.listening = true;
	}

	/** Done listening through: on to the chords and parts. */
	doneListening() {
		this.player.pause();
		this.closeMenus();
		this.listening = false;
	}

	/**
	 * "One" is here: a bar starts on the beat nearest the playhead (or, tapped
	 * while it plays, the beat just before the tap). The bar before gets
	 * whatever beats it had, so the bars after line up again; nothing to count.
	 */
	oneIsHere() {
		const grid = this.grid;
		if (!grid || !this.#analysis) return;
		const tapped = this.player.playing;
		const seconds = tapped ? tapToHit(this.player.time, this.#analysis) : this.player.time;
		const beat = nearestBeat(grid.beats, seconds);
		if (beat === -1) return;
		this.#edit((each) => withOneAt(each, beat));
		if (!tapped) this.player.seek(grid.beats[beat]);
	}

	/** The beats and bars found through the placed beat 1, and the chart written on them. */
	#findBeatsFromDownbeat() {
		if (this.downbeat === null) return;
		this.#findBeats();
		if (this.recording) clearTranscriptionDraft(this.recording.key);
		this.#writeChart();
		this.#keepDraft();
	}

	/** Back to choosing the recording (the open one stays until another is chosen). */
	chooseRecordingAgain() {
		this.player.pause();
		this.closeMenus();
		this.pickingRecording = true;
	}

	/**
	 * The time signature, chosen on the beat 1 step: beats in a usual bar,
	 * the same all through (a bar with more or fewer is fixed later, in its
	 * own menu). With beat 1 marked, the bars are found again in it.
	 * @param {string} id
	 */
	chooseTime(id) {
		this.time = id;
		this.timeChosen = true;
		if (this.checkingDownbeat) this.#findBeatsFromDownbeat();
	}

	/** Keep the open recording: back from choosing another. */
	keepRecording() {
		this.pickingRecording = false;
	}

	/** Whether the song's first bar has a part named (every bar is in a part after it). */
	get firstPartNamed() {
		const first = this.bars[0]?.number;
		const name = first === undefined ? undefined : this.markers[first];
		return !!name && name !== SECTION_END;
	}

	/** Open bar 1's menu to name the part the song starts with. */
	nameFirstPart() {
		const first = this.bars[0]?.number;
		if (first === undefined) return;
		this.openBarMenu(first);
		this.naming = true;
	}

	/** The bar whose start is nearest the playhead (a tap is often a little early or late). */
	#barLineNearPlayhead() {
		const grid = this.grid;
		if (!grid) return null;
		const beat = this.quartersNow + grid.bars.firstBeat;
		return this.bars.reduce(
			(nearest, bar) =>
				!nearest || Math.abs(bar.firstBeat - beat) < Math.abs(nearest.firstBeat - beat)
					? bar
					: nearest,
			/** @type {import('./barPlan.js').Bar | null} */ (null)
		);
	}

	/** Go back to placing beat 1 (the beats stay until they're found again). */
	setDownbeatAgain() {
		this.player.pause();
		this.closeMenus();
		this.settingDownbeat = true;
	}

	/** Leave placing beat 1 without finding the beats again. */
	cancelSettingDownbeat() {
		this.player.pause();
		this.checkingDownbeat = false;
		this.settingDownbeat = false;
	}

	/**
	 * A new song on the recording's bars, at its tempo, with no tune yet,
	 * named for the recording and saved at once (the open song is saved first).
	 */
	startSong() {
		if (!this.grid) return;
		const chart = chartFromBars(this.bars, timeSignature(this.time), {}, {});
		const { song } = this.arranger;
		song.startNew(
			{
				...STARTER_SONG,
				arrangement: chart,
				abc: '',
				bass: '',
				tempo: this.tempo || STARTER_SONG.tempo,
				recording: this.#songsRecording()
			},
			this.recording?.name ?? ''
		);
		song.keepAsYourOwn().catch(console.error);
		this.#keepDraft();
	}

	/** Find the beats and bars again from the recording (forgets any fixes to them). */
	findBeatsAgain() {
		if (this.downbeat === null) return this.setDownbeatAgain();
		this.#findBeats();
		if (this.recording) clearTranscriptionDraft(this.recording.key);
		this.#writeChart();
		this.#keepDraft();
	}

	/**
	 * Make the tune's pickup this long (quarters; 0: none), in every voice.
	 * Its notes keep their place before bar 1; a change that would cut some off isn't made.
	 * @param {number} quarters
	 */
	setPickup(quarters) {
		const { melody } = this.arranger;
		this.#pickupRefused = null;
		if (!melody.voices) {
			this.newTunePickup = quarters;
			return;
		}
		const scores = melody.voices.map((voice) => voice.score);
		const result = withPickupLength(melody.notation, scores, quarters);
		if (result.blocked)
			this.#pickupRefused = {
				abc: melody.notation,
				message: 'Notes are in the way. Move or delete them first, then shorten the pickup.'
			};
		else melody.notation = result.abc;
	}

	/**
	 * Name the song's key (null: none, guess it from the first chord). The
	 * song's chart says it, and its tune and bass are spelled in it.
	 * @param {string | null} name
	 */
	async setKey(name) {
		if (this.linked) await this.arranger.nameSongKey(name);
	}

	/**
	 * The song's time signature: the bars are laid out again in it, and ONE found again.
	 * @param {string} id
	 */
	setTime(id) {
		this.time = id;
		const beatsPerBar = timeSignature(id).beatsPerBar;
		this.#edit((grid) => ({ ...grid, bars: withBeatsPerBar(grid.bars, beatsPerBar) }));
		this.closeMenus();
	}

	/**
	 * All of a bar's chords at once, a slot per beat (empty slots: the chord
	 * before carries on). One name typed on the first beat and nothing else,
	 * or several there ("G C"), are spread over the bar as the chart would.
	 * Nothing is written if a chord isn't one the band can play.
	 * @param {number} number
	 * @param {(string | null)[]} typed what's in each beat's box
	 * @returns {string} why it wasn't written ('' when it was)
	 */
	setBarChords(number, typed) {
		const bar = this.bars.find((each) => each.number === number);
		if (!bar) return '';
		const cleaned = typed.map((text) => (text ?? '').trim() || null);
		const first = (cleaned[0] ?? '').split(/[\s,|]+/).filter(Boolean);
		const onlyFirst = cleaned.slice(1).every((slot) => !slot);
		const slots =
			onlyFirst && first.length > 1
				? slotsFromTyped(first.join(' '), bar.beats)
				: slotsOf(cleaned, bar.beats).map((slot) => slot?.split(/[\s,|]+/)[0] ?? null);
		const unknown = slots.find((slot) => slot && !isKnownChord(slot));
		if (unknown) return unknownChordMessage(unknown);
		if (isEmptyBar(slots) && this.isHeld(bar)) return ''; // still holding the chord before
		const place = this.#chartOnBars.places[number];
		if (!place) {
			const chords = { ...this.chords, [number]: slots };
			if (isEmptyBar(slots)) delete chords[number]; // cleared: no chord
			this.#writeChart({ chords });
		} else {
			const cell = isEmptyBar(slots) ? NO_CHORD : chartCell(slots, this.#lastChordBefore(number));
			this.#changeChart(withBarChords(this.arranger.arrangement.text, place, cell));
		}
		return '';
	}

	/**
	 * The chord sounding at the end of the bar before (what a bar starting
	 * with an empty beat carries on).
	 * @param {number} number
	 */
	#lastChordBefore(number) {
		let before = number - 1;
		while (isHeld(this.chords[before])) before--;
		return this.chords[before]?.findLast(Boolean) ?? NO_CHORD;
	}

	/**
	 * Left empty in the chart, so it holds the chord before.
	 * @param {import('./barPlan.js').Bar} bar
	 */
	isHeld(bar) {
		return isHeld(this.chords[bar.number]);
	}

	/**
	 * A bar's chords, a slot per beat.
	 * @param {import('./barPlan.js').Bar} bar
	 */
	slotsOf(bar) {
		return slotsOf(this.chords[bar.number], bar.beats);
	}

	/** + Lane: an empty lane to write by ear, for any instrument. */
	addLane() {
		const lane = newExtraLane(this.extraLanes);
		this.extraLanes = [...this.extraLanes, lane];
		this.lane = lane.id;
		this.#keepDraft();
	}

	/** @param {string} id */
	removeLane(id) {
		this.extraLanes = this.extraLanes.filter((lane) => lane.id !== id);
		if (this.lane === id) this.lane = MELODY_CHANNEL;
		this.#keepDraft();
	}

	/**
	 * The lane becomes the song's bass line: the bass is written from its
	 * notes, and the lane goes.
	 * @param {string} id
	 */
	useLaneAsBass(id) {
		const lane = this.extraLanes.find((each) => each.id === id);
		if (!lane) return;
		this.arranger.bass.notation = this.laneAbc(lane);
		this.removeLane(id);
		this.lane = BASS_VOICE;
	}

	/**
	 * A lane's ABC: what it holds, or an empty part shaped like the song.
	 * @param {import('./extraLanes.js').ExtraLane} lane
	 */
	laneAbc(lane) {
		return lane.abc || blankBassAbc(bassSongOf(this.arranger));
	}

	/**
	 * @param {string} id
	 * @param {string} abc
	 */
	setLaneAbc(id, abc) {
		this.extraLanes = this.extraLanes.map((lane) => (lane.id === id ? { ...lane, abc } : lane));
		this.#keepDraft();
	}

	/**
	 * Play from the start of a bar.
	 * @param {number} number
	 */
	playFromBar(number) {
		const bar = this.bars.find((each) => each.number === number);
		if (!bar) return;
		this.#seekToBar(bar);
		this.player.play();
	}

	/** @param {import('./barPlan.js').Bar} bar the playhead to its first beat */
	#seekToBar(bar) {
		if (this.grid) this.seekToQuarters(bar.firstBeat - this.grid.bars.firstBeat);
	}

	/** @param {number} quarters play from here in the song (quarters from bar 1) */
	seekToQuarters(quarters) {
		if (this.grid) this.player.seek(secondsAt(this.grid, quarters));
	}

	/**
	 * Name the section starting at a bar (a marker); an empty name takes the marker away.
	 * @param {number} number
	 * @param {string} name
	 */
	setMarker(number, name) {
		const markers = { ...this.markers };
		const cleaned = name.replaceAll('"', '').trim();
		if (cleaned) markers[number] = cleaned;
		else delete markers[number];
		this.#writeChart({ markers });
	}

	/**
	 * How many beats before a marker's bar its section's tune starts (0: on
	 * the bar). On the first bar that's the tune's own pickup, before bar 1.
	 * @param {number} number the marker's bar
	 * @param {number} beats
	 */
	setSectionPickup(number, beats) {
		if (number === this.bars[0]?.number) return this.setPickup(beats);
		const pickups = { ...this.pickups };
		if (beats > 0) pickups[number] = beats;
		else delete pickups[number];
		this.pickups = pickups;
		this.#keepDraft();
	}

	/**
	 * How many beats before a marker's bar its section's tune starts.
	 * @param {number} number
	 */
	sectionPickup(number) {
		return number === this.bars[0]?.number ? this.pickup : (this.pickups[number] ?? 0);
	}

	#playAfterNaming = false;

	/** The marker's name is typed: close its menu, and play on if it was playing. */
	finishMarker() {
		this.closeMenus();
		if (this.#playAfterNaming) this.player.play();
		this.#playAfterNaming = false;
	}

	/** A marker at the bar line nearest the playhead (pressed a moment late or early), the playhead moved onto it: its menu opens to name it. */
	markHere() {
		const bar = this.#barLineNearPlayhead();
		if (!bar) return;
		// Pause to type the name, the playhead on the marker's bar line (named, it plays on from there: finishMarker)
		this.#playAfterNaming = this.player.playing;
		this.player.pause();
		this.openBarMenu(bar.number);
		this.naming = true;
		// After the menu, which would set the playhead a couple of beats before the bar
		this.#seekToBar(bar);
	}

	/**
	 * Move the recording's pitch a few cents, so its notes sit on standard pitch.
	 * @param {number} cents
	 */
	setTuning(cents) {
		this.player.setCents(cents);
		this.#keepDraft();
	}

	/** Measure how far the recording is from standard pitch, and tune it back by that much. */
	findTuning() {
		const audio = this.#audio;
		const off = audio && findTuning(channelsOf(audio), audio.sampleRate);
		if (off !== null && off !== undefined) this.setTuning(clampCents(-off));
	}

	/** Back to the very start of the recording. */
	startOver() {
		this.player.seek(0);
	}

	/** @param {1 | -1} step to the next bar, or back to this bar's start (the one before if it's only just started) */
	stepBar(step) {
		const beats = this.grid?.beats;
		if (!beats) return;
		const starts = this.bars.map((bar) => beats[bar.firstBeat]);
		const target = barStepTarget(starts, this.player.time, step);
		if (target !== null) this.player.seek(target);
	}

	/** The beats were counted twice as slow as the song: one more between each. */
	doubleBeats() {
		this.#edit(withBeatsDoubled);
		this.closeMenus();
	}

	/** The beats were counted twice as fast as the song: every other one. */
	halveBeats() {
		this.#edit(withBeatsHalved);
		this.closeMenus();
	}

	/**
	 * Open a bar's menu (its beats, Loop). While stopped, the player waits a
	 * couple of beats before it.
	 * @param {number} number
	 */
	openBarMenu(number) {
		const bar = this.bars.find((each) => each.number === number);
		if (!bar) return;
		this.selectedBeat = null;
		this.naming = false;
		this.openBar = number;
		if (!this.player.playing) this.player.seek(leadInBefore(this.grid?.beats ?? [], bar.firstBeat));
	}

	/** @param {number} beat open a beat's menu (A bar starts here, add, remove) */
	openBeatMenu(beat) {
		if (!this.grid) return;
		this.openBar = null;
		this.selectedBeat = Math.max(0, Math.min(this.grid.beats.length - 1, beat));
	}

	closeMenus() {
		this.naming = false;
		this.openBar = null;
		this.selectedBeat = null;
	}

	/**
	 * A beat dragged onto its hit: it snaps onto the strongest hit near where it was dropped.
	 * @param {number} index
	 * @param {number} seconds where in the recording it was dropped
	 */
	moveBeatTo(index, seconds) {
		const analysis = this.#analysis;
		this.#edit((grid) =>
			withBeatMoved(grid, index, analysis ? snapToHit(seconds, analysis) : seconds)
		);
	}

	/**
	 * Move the picked beat a little, without snapping (fine adjustment by key).
	 * @param {number} seconds earlier when negative
	 */
	nudgeBeat(seconds) {
		const beat = this.selectedBeat;
		if (beat === null) return;
		this.#edit((grid) => withBeatMoved(grid, beat, grid.beats[beat] + seconds));
	}

	/** The picked beat is a ONE: the nearest bar line moves onto it, and the bars after it move along. */
	barStartsHere() {
		const beat = this.selectedBeat;
		if (beat === null) return;
		this.#edit((grid) => withOneAt(grid, beat));
		this.closeMenus();
	}

	/** @param {1 | -1} change a beat more or fewer in the open bar */
	changeBarLength(change) {
		const bar = this.bar;
		if (!bar) return;
		this.#edit((grid) => ({
			...grid,
			bars: withBarLength(grid.bars, bar.number, bar.beats + change)
		}));
	}

	/** A beat the finder missed: halfway after the picked one. */
	addBeat() {
		const grid = this.grid;
		const picked = this.selectedBeat;
		if (!grid || picked === null) return;
		const next = grid.beats[picked + 1] ?? grid.beats[picked] + 0.5;
		const seconds = (grid.beats[picked] + next) / 2;
		this.#edit((grid) => withBeatAdded(grid, seconds));
		this.openBeatMenu(nearestBeat(this.grid?.beats ?? [], seconds));
	}

	/** A beat the finder heard that isn't there. */
	removeBeat() {
		const beat = this.selectedBeat;
		if (beat === null) return;
		this.#edit((grid) => withBeatRemoved(grid, beat));
		this.closeMenus();
	}

	/** Leaving the page for another of the arranger's: the recording stops, the work stays. */
	leave() {
		this.player.pause();
		this.closeMenus();
	}

	dispose() {
		this.band.dispose();
		this.player.dispose();
	}

	/**
	 * A written note's pitch as heard: as the roll plays it when you tap it
	 * (the part's instrument, the bass on the upright).
	 * @param {string} lane
	 * @param {number} pitch as written
	 */
	#soundingPitch(lane, pitch) {
		const shift = this.arranger.arrangement.transpose;
		if (lane === BASS_VOICE) return uprightPitch(pitch + shift);
		const octave = channelInstrument(mixer.channels, lane).synth?.octave ?? 0;
		return pitch - 12 + shift + octave;
	}

	#findBeats() {
		if (!this.#analysis || this.downbeat === null) return;
		const beatsPerBar = timeSignature(this.time).beatsPerBar;
		const { beats, firstBeat } = detectBeats(this.#analysis, this.downbeat, beatsPerBar);
		this.grid = newBeatGrid(beats, beatsPerBar, firstBeat);
		this.closeMenus();
	}

	/** @param {(grid: BeatGrid) => BeatGrid} change */
	#edit(change) {
		if (!this.grid || !this.recording) return;
		this.grid = change(this.grid);
		this.#keepDraft();
		this.#writeChart();
	}

	/**
	 * Write the song's chart again on the recording's bars as they are now,
	 * with its chords, sections, words and key (or the changed ones given).
	 * Bars past the recording's end are dropped, and repeats are written out.
	 * @param {{ chords?: Record<number, Slots>, markers?: Record<number, string> }} [changed]
	 */
	#writeChart(changed = {}) {
		const { chords = this.chords, markers = this.markers } = changed;
		const bars = chartFromBars(
			this.bars,
			timeSignature(this.time),
			chords,
			markers,
			this.#chartOnBars.lyrics
		);
		this.#changeChart(withKeyField(bars, this.key));
	}

	/**
	 * The song's chart, changed from here. Nothing is written while another
	 * song is open, or while the chart can't be read (it would be lost).
	 * @param {string} chart
	 */
	#changeChart(chart) {
		const { arrangement } = this.arranger;
		if (!this.linked || arrangement.readError) return;
		arrangement.text = chart;
	}

	#keepDraft() {
		if (!this.recording || !this.grid) return;
		writeTranscriptionDraft(this.recording.key, {
			grid: this.grid,
			time: this.time,
			lanes: this.extraLanes,
			cents: this.player.cents,
			downbeat: this.downbeat,
			pickups: this.pickups
		});
	}
}

/**
 * The onset strength scaled to 0–1 for drawing.
 * @param {import('./beats/analyseRecording.js').Analysis} analysis
 */
function hitsOf(analysis) {
	return {
		values: analysis.strength.map((value) => Math.min(1, value / HIT_SCALE)),
		perSecond: analysis.framesPerSecond,
		offset: analysis.offsetSeconds
	};
}

/** @param {AudioBuffer} audio */
function channelsOf(audio) {
	return Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
}
