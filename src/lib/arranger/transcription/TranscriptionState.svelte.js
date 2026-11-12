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
import { StretchPlayer } from '$lib/transcribe/StretchPlayer.svelte.js';
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
import { analyseRecording } from './beats/analyseRecording.js';
import { detectBeats } from './beats/detectBeats.js';
import { findDownbeat } from './beats/findDownbeat.js';
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
import { STARTER_SONG } from '../starterSong.js';
import { okToDiscardChanges } from '../state/guardUnsavedChanges.svelte.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';

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
/** Looping a bar starts this many beats before it, so you hear it come in. */
const LEAD_IN_BEATS = 2;

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
	/** @type {string[]} lanes added by hand (+ Lane), e.g. the bass before it has notes */
	addedLanes = $state.raw([]);
	/** The chart last written into the song from here ('' : none yet). */
	written = $state('');
	/** The part the piano roll edits (a voice id). */
	lane = $state(MELODY_CHANNEL);

	/** @type {Float32Array | null} */
	peaks = $state.raw(null);
	/** @type {{ values: Float32Array, perSecond: number, offset: number } | null} how strongly something starts at each moment, 0 to 1 (the hits to line beats up with) */
	hits = $state.raw(null);
	/** @type {number | null} the bar whose menu is open, and that Loop plays */
	openBar = $state(null);
	/** @type {number | null} the beat whose menu is open (index into the grid's beats) */
	selectedBeat = $state(null);
	finding = $state(false);
	clicksOn = $state(true);
	looping = $state(false);

	bars = $derived(this.grid ? layOutBars(this.grid.beats.length, this.grid.bars) : []);
	bar = $derived(this.bars.find((bar) => bar.number === this.openBar) ?? null);
	/** The song open now is the one written from here (its chart hasn't been changed elsewhere). */
	linked = $derived(this.written !== '' && this.arranger.arrangement.text === this.written);
	/** Where the recording is now, in the song's quarters from bar 1. */
	quartersNow = $derived(this.grid ? quartersAt(this.grid, this.player.time) : 0);
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
		this.addedLanes = [];
		this.written = '';
		this.peaks = null;
		this.hits = null;
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
		if (draft) {
			this.grid = draft.grid;
			this.chords = draft.chords;
			this.key = draft.key;
			this.time = draft.time;
			this.addedLanes = draft.addedLanes;
			this.written = draft.written;
		} else this.#findBeats();
		if (!this.linked) this.startSong();
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
		this.#findBeats();
		if (this.recording) clearTranscriptionDraft(this.recording.key);
		this.#writeChart();
		this.#keepDraft();
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
		this.#edit((grid) =>
			this.#withOneFound({ ...grid, bars: withBeatsPerBar(grid.bars, beatsPerBar) })
		);
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

	/** @param {string} id add an empty lane for this part (+ Lane) */
	addLane(id) {
		if (!this.addedLanes.includes(id)) this.addedLanes = [...this.addedLanes, id];
		this.lane = id;
		this.#keepDraft();
	}

	/** @param {number} quarters play from here in the song (quarters from bar 1) */
	seekToQuarters(quarters) {
		if (this.grid) this.player.seek(secondsAt(this.grid, quarters));
	}

	/** The beats were counted twice as slow as the song: one more between each. */
	doubleBeats() {
		this.#edit((grid) => this.#withOneFound(withBeatsDoubled(grid)));
		this.closeMenus();
	}

	/** The beats were counted twice as fast as the song: every other one. */
	halveBeats() {
		this.#edit((grid) => this.#withOneFound(withBeatsHalved(grid)));
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
		this.openBar = number;
		if (this.looping) this.#loopOpenBar();
		else if (!this.player.playing) this.player.seek(this.#leadInBefore(bar.firstBeat));
	}

	/** @param {number} beat open a beat's menu (A bar starts here, add, remove) */
	openBeatMenu(beat) {
		if (!this.grid) return;
		this.openBar = null;
		this.selectedBeat = Math.max(0, Math.min(this.grid.beats.length - 1, beat));
	}

	closeMenus() {
		this.openBar = null;
		this.selectedBeat = null;
		this.setLooping(false);
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

	/** @param {boolean} on play the open bar over and over */
	setLooping(on) {
		this.looping = on && this.bar !== null;
		if (this.looping) this.#loopOpenBar();
		else this.player.setLoop(null);
	}

	dispose() {
		this.player.dispose();
	}

	#findBeats() {
		if (!this.#analysis) return;
		const beatsPerBar = timeSignature(this.time).beatsPerBar;
		const beats = detectBeats(this.#analysis);
		this.grid = newBeatGrid(beats, beatsPerBar, findDownbeat(this.#analysis, beats, beatsPerBar));
		this.closeMenus();
	}

	#loopOpenBar() {
		const bar = this.bar;
		const beats = this.grid?.beats;
		if (!bar || !beats) return;
		const from = this.#leadInBefore(bar.firstBeat);
		this.player.setLoop({ from, to: beats[bar.firstBeat + bar.beats] ?? this.player.duration });
		if (!this.player.playing) this.player.seek(from);
	}

	/** @param {number} beat */
	#leadInBefore(beat) {
		const beats = this.grid?.beats ?? [];
		return beats[Math.max(0, beat - LEAD_IN_BEATS)] ?? 0;
	}

	/**
	 * The same grid with ONE found again from the recording, for a new count.
	 * @param {BeatGrid} grid
	 * @returns {BeatGrid}
	 */
	#withOneFound(grid) {
		if (!this.#analysis) return grid;
		const firstBeat = findDownbeat(this.#analysis, grid.beats, grid.bars.beatsPerBar);
		return { ...grid, bars: { ...grid.bars, firstBeat, lengths: {} } };
	}

	/** @param {(grid: BeatGrid) => BeatGrid} change */
	#edit(change) {
		if (!this.grid || !this.recording) return;
		this.grid = change(this.grid);
		this.#keepDraft();
		this.#writeChart();
	}

	#chart() {
		return withKeyField(chartFromBars(this.bars, timeSignature(this.time), this.chords), this.key);
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
			addedLanes: this.addedLanes,
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
