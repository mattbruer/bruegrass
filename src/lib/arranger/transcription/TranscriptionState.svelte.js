/**
 * Transcribing a song from a recording, the way Logic does it: the
 * recording's beats and bars are found for you (its tempo map: the ruler
 * follows the recording), then the song is written on those bars in a
 * track grid, chords in their lane and the tune in the piano roll below.
 *
 * Opening a recording makes it the open song's recording: a new song on
 * its bars (asking first if the open song has unsaved changes), unless the
 * open song is already the one written from it. From then on, every change
 * to the bars, chords, key or time writes the chart again (chartFromBars.js).
 * Notes drawn in the roll go into the song's tune, as they do anywhere.
 *
 * The grid is plain data (beatGrid.js) and every change goes through its
 * functions; the recording is analysed once on opening
 * (beats/analyseRecording.js). The transcription is kept as a draft per
 * recording (transcriptionDraft.js), so nothing is lost on leaving.
 *
 * Call `dispose` when the page goes (the player has its own audio context).
 */
import { StretchPlayer } from '$lib/slowDowner/StretchPlayer.svelte.js';
import { waveformPeaks } from '../takes/waveformPeaks.js';
import { barAt, layOutBars, withBarLength, withBeatsPerBar } from './barPlan.js';
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
import { analyseRecording } from './beats/analyseRecording.js';
import { detectBeats } from './beats/detectBeats.js';
import { snapToHit } from './beats/snapToHit.js';
import {
	clearTranscriptionDraft,
	readTranscriptionDraft,
	writeTranscriptionDraft
} from './transcriptionDraft.js';
import { chartFromBars } from './chartFromBars.js';
import { slotsFromTyped, slotsOf } from './barChords.js';
import { DEFAULT_TIME, timeSignature } from './timeSignatures.js';
import { withKeyField } from '../chart/keyField.js';
import { quartersAt, secondsAt } from './tempoMap.js';
import { barStepTarget } from './barStep.js';
import { findTuning } from '$lib/slowDowner/findTuning.js';
import { clampCents } from '$lib/slowDowner/tuning.js';
import { STARTER_SONG } from '../starterSong.js';
import { okToDiscardChanges } from '../state/guardUnsavedChanges.svelte.js';
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
/** The recording lane's id among the lanes that can be muted and soloed. */
const RECORDING_LANE = 'recording';

export class TranscriptionState {
	player = new StretchPlayer();
	/** @type {Recording | null} */
	recording = $state.raw(null);
	/** @type {BeatGrid | null} */
	grid = $state.raw(null);
	/** @type {Record<number, Slots>} bar number → its chords, a slot per beat */
	chords = $state.raw({});
	/**
	 * The song's key as you named it ("G", "Em"; null: not named, so it's
	 * guessed from the first chord). Written into the chart, and the tune is
	 * spelled in it.
	 * @type {string | null}
	 */
	key = $state(null);
	/** The time signature's id (timeSignatures.js). */
	time = $state(DEFAULT_TIME);
	/** @type {import('./extraLanes.js').ExtraLane[]} the generic lanes (+ Lane), to write by ear */
	extraLanes = $state.raw([]);
	/** The generic lanes' notes, as the grid shows them. */
	laneNotes = $derived(
		this.extraLanes.map((lane) => ({
			id: lane.id,
			name: lane.name,
			notes: writtenBassNotes(readBassScore(this.laneAbc(lane), abcjsIfLoaded()))
		}))
	);
	/** The chart last written into the song from here ('' : none yet). */
	written = $state('');
	/** The part the piano roll edits (a voice id). */
	lane = $state(MELODY_CHANNEL);
	/** @type {Record<number, string>} bar number → the section (marker) starting there */
	markers = $state.raw({});
	/** The open bar's menu is for naming its marker (its name box takes the keys). */
	naming = $state(false);
	/**
	 * The part lanes as the grid shows them (it reads the written bass), to hear with the recording.
	 * @type {import('../tracks/lanes.js').BandLane[]}
	 */
	parts = $state.raw([]);
	/** The recording's own volume (dB), mute and solo (the parts' are their mixer channels'). */
	recordingLane = $state({ volume: 0, mute: false, solo: false });
	/** @type {(import('./transcriptionDraft.js').Transcription & { savedAt: string }) | null} unsaved work on this recording from last time, offered back */
	draftOffer = $state(null);

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
	clicksOn = $state(true);
	/** Logic's cycle: the region the player loops while it's on. */
	cycle = new CycleState(this);

	bars = $derived(this.grid ? layOutBars(this.grid.beats.length, this.grid.bars) : []);
	bar = $derived(this.bars.find((bar) => bar.number === this.openBar) ?? null);
	/** The song open now is the one written from here (its chart hasn't been changed elsewhere). */
	linked = $derived(this.written !== '' && this.arranger.arrangement.text === this.written);
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
	/** The written parts' notes, on the recording's time. */
	heardNotes = $derived(
		this.grid
			? heardNotes(this.parts, this.grid, (lane, pitch) => this.#soundingPitch(lane, pitch))
			: []
	);
	/** How loud the recording and each part are (volume, mute and solo). */
	levels = $derived.by(() => {
		const lanes = [
			{ id: RECORDING_LANE, ...this.recordingLane },
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
		const { [RECORDING_LANE]: recording, ...parts } = laneLevels(lanes);
		return { recording, parts };
	});
	/** The recording's usual tempo (beats a minute). */
	tempo = $derived.by(() => {
		const beats = this.grid?.beats ?? [];
		const tempos = beats.map((_, i) => tempoAt(beats, i)).toSorted((a, b) => a - b);
		return Math.round(tempos[tempos.length >> 1] ?? 0);
	});

	/** @type {AudioBuffer | null} */
	#audio = null;
	/** @type {import('./beats/analyseRecording.js').Analysis | null} */
	#analysis = null;

	/** @param {import('../state/Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.arranger = arranger;
	}

	/**
	 * Open a recording: find (or bring back) its beats and bars, and make it
	 * the open song's recording.
	 * @param {Recording} recording
	 */
	async open(recording) {
		this.recording = recording;
		this.grid = null;
		this.chords = {};
		this.key = null;
		this.time = DEFAULT_TIME;
		this.extraLanes = [];
		this.written = '';
		this.peaks = null;
		this.hits = null;
		this.downbeat = null;
		this.settingDownbeat = false;
		this.draftOffer = null;
		this.cycle.clear();
		this.markers = {};
		this.player.setCents(0);
		this.closeMenus();
		this.#audio = null;
		this.#analysis = null;
		const audio = await this.player.load(recording.source);
		if (!audio || this.recording !== recording) return;
		this.#audio = audio;
		this.peaks = waveformPeaks(channelsOf(audio), audio.sampleRate, PEAKS_PER_SECOND);

		this.finding = true;
		// Let "Finding the beats…" show: the analysis takes a second or two
		await new Promise((done) => setTimeout(done, 30));
		if (this.#audio !== audio) return;
		this.#analysis = analyseRecording(channelsOf(audio), audio.sampleRate);
		this.hits = hitsOf(this.#analysis);
		this.finding = false;

		const draft = readTranscriptionDraft(recording.key);
		if (draft && !this.#isSavedWork(draft)) this.draftOffer = draft;
		else this.#carryOn(draft);
	}

	/** Put back the unsaved work offered (draftOffer) on this recording. */
	restoreDraft() {
		const draft = this.draftOffer;
		this.draftOffer = null;
		this.#carryOn(draft);
	}

	/** Forget the unsaved work offered on this recording, and start it afresh. */
	discardDraft() {
		this.draftOffer = null;
		if (this.recording) clearTranscriptionDraft(this.recording.key);
		this.#carryOn(null);
	}

	/**
	 * Saved work comes back without asking: the open song is saved, unchanged,
	 * and is the one last written from this recording.
	 * @param {import('./transcriptionDraft.js').Transcription} draft
	 */
	#isSavedWork(draft) {
		const { song, arrangement } = this.arranger;
		return !song.isNew && !song.hasUnsavedChanges && arrangement.text === draft.written;
	}

	/**
	 * Go on from the draft (null: none), or place beat 1 first.
	 * @param {import('./transcriptionDraft.js').Transcription | null} draft
	 */
	#carryOn(draft) {
		// Beats come back only when you placed beat 1; an older draft's were guessed
		if (draft) {
			this.grid = draft.downbeat === null ? null : draft.grid;
			this.chords = draft.chords;
			this.key = draft.key;
			this.time = draft.time;
			this.extraLanes = draft.lanes;
			this.markers = draft.markers;
			this.player.setCents(draft.cents);
			this.written = draft.written;
			this.downbeat = draft.downbeat;
		}
		if (!this.grid) this.settingDownbeat = true;
		else if (!this.linked) this.startSong();
	}

	/** Beat 1 of bar 1 is where the playhead is (snapped to the hit nearest). */
	setDownbeatHere() {
		if (!this.#analysis) return;
		this.downbeat = snapToHit(this.player.time, this.#analysis);
	}

	/** Find the beats and bars through the placed beat 1, and start the song on them. */
	findBeatsFromDownbeat() {
		if (this.downbeat === null) return;
		this.settingDownbeat = false;
		this.player.pause();
		this.#findBeats();
		if (this.recording) clearTranscriptionDraft(this.recording.key);
		this.#writeChart();
		this.#keepDraft();
		if (!this.linked) this.startSong();
	}

	/** Go back to placing beat 1 (the beats stay until they're found again). */
	setDownbeatAgain() {
		this.player.pause();
		this.closeMenus();
		this.settingDownbeat = true;
	}

	/** Leave placing beat 1 without finding the beats again. */
	cancelSettingDownbeat() {
		this.settingDownbeat = false;
	}

	/**
	 * A new song on the recording's bars, at its tempo, with no tune yet.
	 * (Asks before discarding unsaved changes to the open song.)
	 */
	startSong() {
		if (!this.grid || !okToDiscardChanges(this.arranger.song)) return;
		const chart = this.#chart();
		this.arranger.song.startNew({
			...STARTER_SONG,
			arrangement: chart,
			abc: '',
			bass: '',
			tempo: this.tempo || STARTER_SONG.tempo
		});
		this.written = chart;
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
		this.key = name;
		this.#keepDraft();
		if (!this.linked) return;
		this.#writeChart();
		await this.arranger.nameSongKey(name);
		this.written = this.arranger.arrangement.text;
		this.#keepDraft();
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
	 * @param {number} number
	 * @param {(string | null)[]} typed what's in each beat's box
	 */
	setBarChords(number, typed) {
		const bar = this.bars.find((each) => each.number === number);
		if (!bar) return;
		const cleaned = typed.map((text) => (text ?? '').trim() || null);
		const first = (cleaned[0] ?? '').split(/[\s,|]+/).filter(Boolean);
		const onlyFirst = cleaned.slice(1).every((slot) => !slot);
		const slots =
			onlyFirst && first.length > 1
				? slotsFromTyped(first.join(' '), bar.beats)
				: slotsOf(cleaned, bar.beats).map((slot) => slot?.split(/[\s,|]+/)[0] ?? null);
		const chords = { ...this.chords };
		if (slots.some(Boolean)) chords[number] = slots;
		else delete chords[number];
		this.chords = chords;
		this.#keepDraft();
		this.#writeChart();
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
		this.markers = markers;
		this.#keepDraft();
		this.#writeChart();
	}

	/** A marker on the bar the playhead is in: its menu opens to name it. */
	markHere() {
		const grid = this.grid;
		if (!grid) return;
		const beat = Math.max(grid.bars.firstBeat, Math.floor(this.quartersNow + grid.bars.firstBeat));
		const bar = barAt(this.bars, beat) ?? this.bars.at(-1);
		if (!bar) return;
		this.openBarMenu(bar.number);
		this.naming = true;
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

	dispose() {
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

	#chart() {
		return withKeyField(
			chartFromBars(this.bars, timeSignature(this.time), this.chords, this.markers),
			this.key
		);
	}

	/** The song written from here gets the bars, chords, key and time as they are now. */
	#writeChart() {
		if (!this.linked) return;
		const chart = this.#chart();
		if (chart === this.written) return;
		this.written = chart;
		this.arranger.arrangement.text = chart;
		this.#keepDraft();
	}

	#keepDraft() {
		if (!this.recording || !this.grid) return;
		writeTranscriptionDraft(this.recording.key, {
			grid: this.grid,
			chords: this.chords,
			key: this.key,
			time: this.time,
			lanes: this.extraLanes,
			markers: this.markers,
			cents: this.player.cents,
			downbeat: this.downbeat,
			written: this.written
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
