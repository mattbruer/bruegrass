/**
 * Transcribing a song from a recording, the way Logic does it: the
 * recording's beats are found for you as it opens (its tempo map: the
 * ruler follows the recording). You say the time signature, which lays
 * the bars out, and slide the recording along the ruler until its ONE sits
 * on a bar line (a pickup goes in bar 1, the song's first ONE on bar 2),
 * trimming off what you don't want. Then the song is written on those bars
 * in a track grid, chords in their lane and the tune in the piano roll below.
 *
 * Opening a recording opens the song written from it (the song names its
 * recording); with none, a new song is made on its bars once the time is chosen. The song's chart is the
 * one place its chords, sections and key live, wherever they were typed:
 * Transcribe reads them from the chart on the recording's bars
 * (readChartOnBars.js), a chord typed here is written into its bar of the
 * chart in place (chart/withBarChords.js), and a change to the bars, time
 * or markers writes the chart again on the new bars (chartFromBars.js).
 * Notes drawn in the roll go into the song's tune, as they do anywhere.
 *
 * The grid is plain data (beatGrid.js) and every change goes through its
 * functions; the recording is analysed once on opening
 * (beats/analyseReference.js). The transcription is kept as a draft per
 * recording (transcriptionDraft.js), so nothing is lost on leaving.
 *
 * It lives on the Arranger, so the work stays while you visit its other
 * pages: `leave` when the Transcribe page goes (the recording stops),
 * `dispose` when the arranger goes (the player has its own audio context).
 */
import { StretchPlayer } from '$lib/slowDowner/StretchPlayer.svelte.js';
import { waveformPeaks } from '../takes/waveformPeaks.js';
import { evenBarPlan, withBarLength } from './barPlan.js';
import {
	beatSeconds,
	gridBars,
	newBeatGrid,
	nearestBeat,
	withOneAt,
	withSlide,
	withTrim,
	withBeatAdded,
	withBeatMoved,
	withBeatRemoved,
	withBeatsDoubled,
	withBeatsHalved,
	tempoAt
} from './beatGrid.js';
import { ANALYSIS_VERSION, analyseReference } from './beats/analyseReference.js';
import { readReferenceAnalysis, writeReferenceAnalysis } from '$lib/storage/referenceAnalyses.js';
import { detectBeats } from './beats/detectBeats.js';
import { snapToHit } from './beats/snapToHit.js';
import { readTranscriptionDraft, writeTranscriptionDraft } from './transcriptionDraft.js';
import { chartFromBars } from './chartFromBars.js';
import { readChartOnBars } from './readChartOnBars.js';
import { namedSections, withUniqueSectionNames } from './arrangementFromTranscription.js';
import { chartCell, isEmptyBar, isHeld, slotsOf } from './barChords.js';
import { guessChords } from './chords/guessChords.js';
import { DEFAULT_TIME, timeSignature } from './timeSignatures.js';
import { keyFieldName, withKeyField } from '../chart/keyField.js';
import { withBarChords } from '../chart/withBarChords.js';
import { NO_CHORD } from '../chart/noChord.js';
import { chordBoxProblem } from '../chart/knownChords.js';
import { listArrangements } from '$lib/storage/arrangements.js';
import { quartersAt, secondsAt } from './tempoMap.js';
import { barStepTarget } from './barStep.js';
import { findTuning } from '$lib/slowDowner/findTuning.js';
import { clampCents } from '$lib/slowDowner/tuning.js';
import { bestKey } from '../theory/keyFit.js';
import { STRING_BAND_KEYS } from '../theory/usualKeys.js';
import { bundledReference } from './bundledReferences.js';
import { STARTER_SONG } from '../starterSong.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { BASS_VOICE } from '../bass/readBass.js';
import { blankBassAbc } from '../bass/bassAbc.js';
import { bassSongOf } from '../bass/bassSong.js';
import { abcjsReady } from '../state/abcjsLoaded.svelte.js';
import {
	isExtraPart,
	nextExtraPart,
	withExtraPart,
	withoutExtraPart
} from '../melody/extraParts.js';
import { partName, withPartName } from '../melody/partNames.js';
import { rewriteAbc } from '../melody/roll/scoreToAbc.js';
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';
import { mixer } from '../mixer/mixer.svelte.js';
import { heardNotes, laneLevels } from './heardParts.js';
import { TranscribeParts } from './TranscribeParts.svelte.js';
import { TranscribeBand } from './TranscribeBand.svelte.js';
import { CycleState, leadInBefore } from './CycleState.svelte.js';

/**
 * @typedef {{ key: string, name: string, source: string | Blob }} Reference
 *   key: the same recording gets the same key (its URL, or a file's name and size)
 * @typedef {import('./beatGrid.js').BeatGrid} BeatGrid
 * @typedef {import('./barChords.js').Slots} Slots
 */

/** The song view's waveform detail (peaks a second). */
export const PEAKS_PER_SECOND = 200;
/** Onset strength (in its own spread) drawn full height. */
const HIT_SCALE = 6;
/** The recording's and the band's lane ids among the lanes that can be muted and soloed. */
const REFERENCE_LANE = 'reference';
const BAND_LANE = 'band';

/** How many changes to the beats Undo remembers. */
const UNDO_STEPS = 50;

export class TranscriptionState {
	player = new StretchPlayer();
	/** @type {Reference | null} */
	reference = $state.raw(null);
	/** @type {BeatGrid | null} */
	grid = $state.raw(null);
	/** The time signature's id (timeSignatures.js). */
	time = $state(DEFAULT_TIME);
	/** Whether you've said the time signature: until then there are beats but no bars. */
	timeChosen = $state(false);
	/**
	 * Find's other reading, a semitone from the tuning it chose (null: Find
	 * hasn't a second one).
	 * @type {number | null}
	 */
	tuningOtherWay = $state(null);
	/** Beats the recording is being dragged along the ruler by, before it's let go (0: not sliding). */
	slidePreview = $state(0);
	/**
	 * How early each section's tune starts, in beats before its marker's bar (its
	 * pickup: "I was…" sung before the verse's first bar). Only the tune: the
	 * chords and the band keep to the bar lines. Bar number → beats.
	 * @type {Record<number, number>}
	 */
	pickups = $state.raw({});
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
	referenceLane = $state({ volume: 0, mute: false, solo: false });

	/** @type {Float32Array | null} */
	peaks = $state.raw(null);
	/** @type {{ values: Float32Array, perSecond: number, offset: number } | null} how strongly something starts at each moment, 0 to 1 (the hits to line beats up with) */
	hits = $state.raw(null);
	/** @type {number | null} the bar whose menu is open, and that Loop plays */
	openBar = $state(null);
	/** @type {number | null} the beat whose menu is open (index into the grid's beats) */
	selectedBeat = $state(null);
	/**
	 * The Beats row (drag, add, remove beats, Undo) shows only while fixing them. Nothing turns
	 * it on for now (the user's call: a stray drag moved a beat); a button calling fixBeats(true) brings it back.
	 */
	fixingBeats = $state(false);
	/** The zoom across that fits the whole song in the grid's view; the grid works it out. */
	wholeSongZoom = $state(1);
	/** The grid before each change to the beats, newest last, for Undo. */
	#beatHistory = /** @type {BeatGrid[]} */ ($state.raw([]));
	/** The song you came from (sent from this transcription), to go back to in the arranger; null: none. */
	returnTo = /** @type {{ id: string, name: string } | null} */ ($state.raw(null));
	/** Choosing another recording, with one open. */
	pickingReference = $state(false);
	/**
	 * What has to happen before the workspace (null: nothing, it shows):
	 * choosing a recording, then loading it and finding its beats.
	 * @type {'reference' | 'loading' | null}
	 */
	setupStep = $derived(
		!this.reference || this.pickingReference ? 'reference' : !this.grid ? 'loading' : null
	);
	clicksOn = $state(true);
	/** Logic's cycle: the region the player loops while it's on. */
	cycle = new CycleState(this);

	bars = $derived(this.grid ? gridBars(this.grid) : []);
	bar = $derived(this.bars.find((bar) => bar.number === this.openBar) ?? null);
	/** The song open now is the one written from this recording. */
	linked = $derived(!!this.reference && this.arranger.song.reference?.key === this.reference.key);
	/** The open song's chart on the recording's bars (nothing while another song is open). */
	#chartOnBars = $derived(
		this.linked
			? readChartOnBars(this.arranger.arrangement.text, this.arranger.arrangement.sections)
			: readChartOnBars('', [])
	);
	/** @type {Record<number, Slots>} bar number → its chords, a slot per beat */
	chords = $derived(this.#chartOnBars.chords);
	/** Whether any bar has a chord (one carrying on the chord before doesn't count). */
	hasChords = $derived(Object.values(this.chords).some((slots) => !isEmptyBar(slots)));
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
	/** The key the chart names ("G", "Em"; null: none yet). */
	key = $derived(this.linked ? keyFieldName(this.arranger.arrangement.text) : null);
	/** Where the recording is now, in the song's quarters from bar 1. */
	quartersNow = $derived(this.grid ? quartersAt(this.grid, this.player.time) : 0);
	/**
	 * Where the song starts in the recording (seconds): bar 1, or where the
	 * trimmed recording starts if that's later. Anything before (a false
	 * start, an intro you trimmed off) is never played.
	 */
	startSeconds = $derived(
		this.grid
			? Math.max(0, this.grid.trim.from, beatSeconds(this.grid, this.grid.bars.firstBeat))
			: 0
	);
	/** Where the trimmed recording ends (seconds): playing stops there. */
	endSeconds = $derived(this.grid?.trim.to ?? this.player.duration);
	/** The written parts' notes, on the recording's time (a written bass plays on the band's upright instead). */
	heardNotes = $derived(
		this.grid
			? heardNotes(
					this.band.performance ? this.parts.filter((part) => part.id !== BASS_VOICE) : this.parts,
					this.grid
				)
			: []
	);
	/** How loud the reference recording and each part are (volume, mute and solo). */
	levels = $derived.by(() => {
		const lanes = [
			{ id: REFERENCE_LANE, ...this.referenceLane },
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
		const { [REFERENCE_LANE]: reference, [BAND_LANE]: band = 0, ...parts } = laneLevels(lanes);
		return { reference, band, parts };
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
	/** @type {import('./beats/analyseReference.js').Analysis | null} */
	#analysis = null;

	/** @param {import('../state/Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.arranger = arranger;
		/** The arranger's band playing the chart along with the recording. */
		this.band = new TranscribeBand(this);
		/** The parts written here, heard on their instruments. */
		this.writtenParts = new TranscribeParts(this);
		this.player.onClock = (clock) => {
			this.band.follow(clock);
			this.writtenParts.follow(clock);
		};
		this.player.onPause = () => {
			this.band.stop();
			this.writtenParts.stop();
		};
	}

	/** How loud the recording, the band and each part are heard now. */
	hearLevels() {
		this.player.setLevels({ recording: this.levels.reference });
		this.writtenParts.setLevels(this.levels.parts);
		this.band.setLevels(
			this.levels,
			this.parts.some((part) => part.id === BASS_VOICE)
		);
	}

	/**
	 * Open a recording: find (or bring back) its beats and bars, and make it
	 * the open song's recording.
	 * @param {Reference} reference
	 */
	async open(reference) {
		this.reference = reference;
		this.grid = null;
		this.#beatHistory = [];
		this.time = DEFAULT_TIME;
		this.timeChosen = false;
		this.slidePreview = 0;
		this.pickups = {};
		this.peaks = null;
		this.hits = null;
		this.pickingReference = false;
		this.cycle.clear();
		this.player.setCents(0);
		this.tuningOtherWay = null;
		this.closeMenus();
		this.#audio = null;
		this.#analysis = null;
		const audio = await this.player.load(reference.source);
		if (!audio || this.reference !== reference) return;
		this.#audio = audio;
		this.peaks = waveformPeaks(channelsOf(audio), audio.sampleRate, PEAKS_PER_SECOND);

		const analysis = await this.#analysisOf(reference, audio);
		if (!analysis || this.#audio !== audio) return;
		this.#analysis = analysis;
		this.hits = hitsOf(analysis);

		this.#carryOn(readTranscriptionDraft(reference.key), analysis, audio.duration);
		if (!this.linked) await this.#openWrittenSong();
		if (this.player.time < this.startSeconds) this.player.seek(this.startSeconds);
	}

	/**
	 * Go on from the draft, or start fresh: the beats found, bar 1 on the
	 * first of them, the whole recording used, no time signature yet.
	 * @param {import('./transcriptionDraft.js').Transcription | null} draft
	 * @param {import('./beats/analyseReference.js').Analysis} analysis
	 * @param {number} duration
	 */
	#carryOn(draft, analysis, duration) {
		if (draft) {
			this.grid = draft.grid;
			this.time = draft.time;
			this.timeChosen = draft.timeChosen;
			this.pickups = draft.pickups;
			this.player.setCents(draft.cents);
			return;
		}
		const beatsPerBar = timeSignature(this.time).beatsPerBar;
		this.grid = newBeatGrid(detectBeats(analysis), beatsPerBar, 0, { from: 0, to: duration });
		this.#keepDraft();
	}

	/** Open the song last written from this recording, if there is one. */
	async #openWrittenSong() {
		const key = this.reference?.key;
		const songs = await listArrangements();
		const written = songs.find((song) => song.reference?.key === key);
		if (!written || this.reference?.key !== key) return false;
		await this.arranger.song.open(written.id);
		return true;
	}

	/**
	 * What the recording's sound does (hits, bass, chords): kept on this device
	 * after the first time, since it depends only on the audio. Null if another
	 * recording was opened meanwhile.
	 * @param {Reference} reference
	 * @param {AudioBuffer} audio
	 */
	async #analysisOf(reference, audio) {
		const stamp = {
			version: ANALYSIS_VERSION,
			samples: audio.length,
			sampleRate: audio.sampleRate
		};
		const kept = await readReferenceAnalysis(reference.key, stamp).catch(() => null);
		if (kept || this.#audio !== audio) return kept;

		// Let "Listening to the recording…" show: the analysis takes a second or two
		await new Promise((done) => setTimeout(done, 30));
		const analysis =
			this.#audio === audio ? analyseReference(channelsOf(audio), audio.sampleRate) : null;
		if (!analysis) return null;
		writeReferenceAnalysis(reference.key, stamp, analysis).catch(console.error);
		return analysis;
	}

	/**
	 * Arriving with a song sent from a transcription (Send to the arranger):
	 * open that recording and its own song, and remember the way back.
	 */
	async openWhatItWasMadeFrom() {
		const { song } = this.arranger;
		const from = song.madeFrom;
		if (!from) return;
		this.returnTo = song.savedId ? { id: song.savedId, name: song.name } : null;
		if (this.reference?.key !== from.key) {
			const reference = bundledReference(from.key);
			if (reference) await this.open(reference);
		} else if (this.grid && !this.linked) await this.#openWrittenSong();
	}

	/** Open the recording the open song was written from, if it's one of the app's own and isn't open. */
	reopenSongsReference() {
		const wanted = this.arranger.song.reference;
		if (!wanted || this.reference?.key === wanted.key) return;
		const reference = bundledReference(wanted.key);
		if (reference) this.open(reference);
	}

	/** The open recording as the song keeps it: its key and name. */
	#songsReference() {
		return this.reference ? { key: this.reference.key, name: this.reference.name } : null;
	}

	/** Back to choosing the recording (the open one stays until another is chosen). */
	chooseReferenceAgain() {
		this.player.pause();
		this.closeMenus();
		this.pickingReference = true;
	}

	/**
	 * The time signature: beats in a usual bar, the same all through (a bar
	 * with more or fewer is fixed in its own menu). It lays the bars out from
	 * bar 1, where it is; the first time, the song is made on them.
	 * @param {string} id
	 */
	chooseTime(id) {
		const grid = this.grid;
		if (!grid) return;
		this.time = id;
		this.timeChosen = true;
		this.grid = {
			...grid,
			bars: evenBarPlan(timeSignature(id).beatsPerBar, grid.bars.firstBeat)
		};
		this.#beatHistory = [];
		if (this.linked) this.#writeChart();
		else this.startSong();
		this.#keepDraft();
	}

	/** Keep the open recording: back from choosing another. */
	keepReference() {
		this.pickingReference = false;
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

	/**
	 * A new song on the recording's bars, at its tempo, with no tune yet,
	 * named for the recording (rename it in the song bar), saved at once
	 * (the open song is saved first). Its key is named in the workspace.
	 */
	startSong() {
		if (!this.grid || !this.timeChosen) return;
		const chart = chartFromBars(this.bars, timeSignature(this.time), {}, {});
		const { song } = this.arranger;
		song.startNew(
			{
				...STARTER_SONG,
				arrangement: chart,
				abc: '',
				bass: '',
				tempo: this.tempo || STARTER_SONG.tempo,
				reference: this.#songsReference()
			},
			this.reference?.name ?? ''
		);
		song.name = this.reference?.name ?? '';
		song.keepAsYourOwn().catch(console.error);
		this.#keepDraft();
	}

	/**
	 * Find the beats again from the recording (forgets any fixes to them). Bar
	 * 1 stays where it was, on the beat found nearest it; ⌘Z brings the old beats back.
	 */
	findBeatsAgain() {
		const analysis = this.#analysis;
		if (!analysis) return;
		this.#edit((grid) => {
			const beats = detectBeats(analysis);
			const barOne = nearestBeat(beats, beatSeconds(grid, grid.bars.firstBeat));
			return { ...newBeatGrid(beats, grid.bars.beatsPerBar, barOne, grid.trim) };
		});
	}

	/**
	 * Slide the recording along the ruler by whole beats (later when
	 * positive), so another of its beats is on bar 1's line.
	 * @param {number} beats
	 */
	slideBy(beats) {
		if (Math.round(beats) !== 0) this.#edit((grid) => withSlide(grid, beats));
	}

	/**
	 * Use only this stretch of the recording (seconds): what's outside it isn't played or written on.
	 * @param {{ from: number, to: number }} trim
	 */
	setTrim(trim) {
		this.#edit((grid) => withTrim(grid, trim, this.player.duration));
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
	 * All of a bar's chords at once, a slot per beat (empty slots: the chord
	 * before carries on), one chord in each. Nothing is written if a slot
	 * holds more than one, or a chord the band can't play.
	 * @param {number} number
	 * @param {(string | null)[]} typed what's in each beat's box
	 * @returns {string} why it wasn't written ('' when it was)
	 */
	setBarChords(number, typed) {
		const bar = this.bars.find((each) => each.number === number);
		if (!bar) return '';
		const problem = typed.map((text) => chordBoxProblem(text ?? '')).find(Boolean);
		if (problem) return problem;
		const slots = slotsOf(
			typed.map((text) => (text ?? '').trim() || null),
			bar.beats
		);
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
	 * Fill the bars with no chord yet with a guess from the recording, to fix
	 * by ear. Chords you wrote are left alone. It's heard at your tuning, or
	 * the measured one before you've tuned, so the chords are spelled the
	 * way you tuned it.
	 */
	guessChords() {
		const audio = this.#audio;
		if (!audio || !this.grid || !this.linked) return;
		const channels = channelsOf(audio);
		const guessed = guessChords({
			channels,
			sampleRate: audio.sampleRate,
			cents: this.#bandsCents(audio),
			beats: this.grid.beats,
			bars: this.bars.filter((bar) => !(bar.number in this.chords)),
			key: this.key,
			duration: audio.duration
		});
		for (const [number, slots] of Object.entries(guessed)) this.setBarChords(Number(number), slots);
	}

	/** Empty every bar's chords, to guess again or start by ear. */
	clearChords() {
		for (const [number, slots] of Object.entries(this.chords)) {
			if (!isEmptyBar(slots)) this.setBarChords(Number(number), []);
		}
	}

	/**
	 * How far the band is from A = 440: as you've tuned the recording, or
	 * measured before you have.
	 * @param {AudioBuffer} audio
	 */
	#bandsCents(audio) {
		return this.player.cents ? -this.player.cents : (measureTuning(audio)?.cents ?? 0);
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

	/** Room for another lane (+ Lane): the tune has a free extra part (melody/extraParts.js). */
	canAddLane = $derived(nextExtraPart(this.arranger.melody.notation) !== null);

	/**
	 * + Lane: another line of the tune to write by ear (the vocal, a mandolin
	 * break), named by you, its bars empty, with its own channel and
	 * instrument. An unwritten tune is started from the chart first.
	 * @param {string} name
	 */
	async addLane(name) {
		await abcjsReady();
		const { melody } = this.arranger;
		if (!melody.hasNotation) this.arranger.startMelodyFromChart();
		const part = nextExtraPart(melody.notation);
		const lead = melody.voices?.[0];
		if (!part || !lead?.score.bars.length) return;
		const resting = rewriteAbc(melody.notation, lead.score, [], { every: true });
		melody.notation = withExtraPart(melody.notation, resting, part);
		this.renameLane(part.id, name);
		this.lane = part.id;
	}

	/**
	 * Take an added lane out of the tune, its notes and name with it.
	 * @param {string} id
	 */
	removeLane(id) {
		const { melody, song } = this.arranger;
		melody.notation = withoutExtraPart(melody.notation, id);
		song.partNames = withPartName(song.partNames, id, '');
		const channel = mixer.channels.find((each) => each.id === id);
		if (channel) channel.solo = false; // a hidden lane mustn't keep the rest silent
		if (this.lane === id) this.lane = MELODY_CHANNEL;
	}

	/**
	 * An added lane becomes the song's bass line, written by ear: its notes
	 * from bar 1 on (the bass keeps to the bar lines) and its name go to the
	 * bass, and the lane goes.
	 * @param {string} id
	 */
	useLaneAsBass(id) {
		const { melody, bass, song } = this.arranger;
		const notes = (melody.line?.notes ?? [])
			.filter((note) => note.channel === id && note.time >= 0)
			.map((note) => ({
				midi: note.pitch,
				start: Math.round(note.time * TICKS_PER_QUARTER),
				length: Math.round(note.length * TICKS_PER_QUARTER)
			}));
		const name = song.partNames[id];
		bass.notation = blankBassAbc(bassSongOf(this.arranger), notes);
		this.removeLane(id);
		if (name) song.partNames = withPartName(song.partNames, BASS_VOICE, name);
		this.lane = BASS_VOICE;
	}

	/**
	 * Give a lane a name of your own ('' gives the melody, a harmony part or
	 * the bass back its own; an added lane always keeps one of yours).
	 * @param {string} id
	 * @param {string} name
	 */
	renameLane(id, name) {
		const { song } = this.arranger;
		if (!name.trim() && isExtraPart(id)) return;
		song.partNames = withPartName(song.partNames, id, name);
	}

	/** @param {string} id a lane's name, as you named it */
	laneName(id) {
		return partName(id, this.arranger.song.partNames);
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
	 * the bar), taken from the end of the bar before. Not for bar 1: a
	 * pickup goes in bar 1 itself, with the song's first ONE on bar 2.
	 * @param {number} number the marker's bar
	 * @param {number} beats
	 */
	setSectionPickup(number, beats) {
		if (number === this.bars[0]?.number) return;
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
		return this.pickups[number] ?? 0;
	}

	#playAfterNaming = false;

	/** The marker's name is typed: close its menu, and play on if it was playing. */
	finishMarker() {
		this.closeMenus();
		if (this.#playAfterNaming) this.player.play();
		this.#playAfterNaming = false;
	}

	/** A marker at the bar line nearest the playhead (pressed a moment late or early), the playhead moved onto it: its menu opens to name it. */
	/** The bar whose start is nearest the playhead: the one the bar button opens. */
	get barHere() {
		return this.#barLineNearPlayhead()?.number ?? null;
	}

	/** Open the menu of the bar the playhead is at (its marker, beats, cycle), ready to name it. */
	openBarHere() {
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

	/**
	 * Measure how far the recording is from standard pitch, and tune it back
	 * by that much. Between two notes it goes the way that lands in a usual
	 * key, and keeps the other way for `tuneTheOtherWay`.
	 */
	findTuning() {
		const found = this.#audio && measureTuning(this.#audio);
		if (!found) return;
		this.setTuning(clampCents(-found.cents));
		this.tuningOtherWay = found.otherWay === null ? null : clampCents(-found.otherWay);
	}

	/** Swap to the other of Find's two readings (a semitone apart). */
	tuneTheOtherWay() {
		if (this.tuningOtherWay === null) return;
		const other = this.tuningOtherWay;
		this.tuningOtherWay = this.player.cents;
		this.setTuning(other);
		if (this.hasChords) {
			this.clearChords();
			this.guessChords();
		}
	}

	/** Back to where the song starts. */
	startOver() {
		this.player.seek(this.startSeconds);
	}

	/** Play on (from the cycle, if it's on); from outside the trimmed recording, from the song's start. */
	play() {
		this.cycle.startFromCycle();
		const time = this.player.time;
		if (time < this.startSeconds || time >= this.endSeconds) this.player.seek(this.startSeconds);
		this.player.play();
	}

	/** The trimmed recording has ended: stop there (the cycle loops before it gets here). */
	stopAtTheEnd() {
		if (!this.player.playing || this.player.time < this.endSeconds) return;
		this.player.pause();
		this.player.seek(this.endSeconds);
	}

	/** @param {1 | -1} step to the next bar, or back to this bar's start (the one before if it's only just started) */
	stepBar(step) {
		const grid = this.grid;
		if (!grid) return;
		const starts = this.bars.map((bar) => Math.max(0, beatSeconds(grid, bar.firstBeat)));
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

	/** @param {boolean} on show the Beats row, to move, add and remove beats */
	fixBeats(on) {
		this.fixingBeats = on;
		if (!on) this.closeMenus();
	}

	get canUndoBeats() {
		return this.#beatHistory.length > 0;
	}

	/** Put the beats back as they were before the last change to them. */
	undoBeats() {
		const before = this.#beatHistory.at(-1);
		if (!before || !this.reference) return;
		this.#beatHistory = this.#beatHistory.slice(0, -1);
		this.grid = before;
		this.selectedBeat = null;
		this.#keepDraft();
		this.#writeChart();
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
		this.writtenParts.dispose();
		this.player.dispose();
	}

	/** @param {(grid: BeatGrid) => BeatGrid} change */
	#edit(change) {
		if (!this.grid || !this.reference) return;
		this.#beatHistory = [...this.#beatHistory.slice(1 - UNDO_STEPS), this.grid];
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
		if (!this.linked || !this.timeChosen || arrangement.readError) return;
		arrangement.text = chart;
	}

	#keepDraft() {
		if (!this.reference || !this.grid) return;
		writeTranscriptionDraft(this.reference.key, {
			grid: this.grid,
			time: this.time,
			timeChosen: this.timeChosen,
			cents: this.player.cents,
			pickups: this.pickups
		});
	}
}

/**
 * The onset strength scaled to 0–1 for drawing.
 * @param {import('./beats/analyseReference.js').Analysis} analysis
 */
function hitsOf(analysis) {
	return {
		values: analysis.strength.map((value) => Math.min(1, value / HIT_SCALE)),
		perSecond: analysis.framesPerSecond,
		offset: analysis.offsetSeconds
	};
}

/**
 * How far the recording is from A = 440, choosing between two notes by the
 * keys string bands play in.
 * @param {AudioBuffer} audio
 */
function measureTuning(audio) {
	return findTuning(
		channelsOf(audio),
		audio.sampleRate,
		(noteWeights) => bestKey(noteWeights, STRING_BAND_KEYS).fit
	);
}

/** @param {AudioBuffer} audio */
function channelsOf(audio) {
	return Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
}
