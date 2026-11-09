/**
 * The piano roll's state: the tune it draws (every voice read from the
 * ABC, or a melody shaped like the chart when there's none yet), which
 * voice is being edited, its notes, and the grid. The ABC stays the saved
 * tune: every finished edit is written straight into it (so drafts and
 * Save cover it), and any change to the ABC is read back here.
 */
import { barsInPlayOrder } from '../../chart/chartBars.js';
import { concertChord } from '../../chart/concertChords.js';
import { MELODY_CHANNEL } from '../harmony/partChannels.js';
import { HARMONY_PARTS } from '../harmony/harmonyParts.js';
import { readDrawnMelody, writeDrawnMelody } from './drawnMelody.js';
import { scoreFromChart } from './scoreFromChart.js';
import { chordsUnderBars } from './chordsUnderBars.js';
import { chordToneOptions } from './chordToneOptions.js';
import { gridTicks } from './ticks.js';
import { playheadTicks } from './playheadTicks.js';

/** Every voice's place in the colour wheel: the melody, then each harmony part. */
const VOICE_ORDER = [MELODY_CHANNEL, ...HARMONY_PARTS.map((part) => part.id)];

/**
 * @typedef {import('./readScore.js').Score} Score
 * @typedef {import('./editNotes.js').DrawnNote} DrawnNote
 * @typedef {import('./drawnMelody.js').DrawnVoice} DrawnVoice
 * @typedef {{
 *   voices: DrawnVoice[], sequence: any[][] | null,
 *   lineStarts: Set<number> | null
 * }} Read lineStarts: set when the melody came from the chart (a new tune)
 */

export class MelodyDrawing {
	/** @type {import('./ticks.js').GridId} */
	grid = $state('eighth');
	/** @type {Read | null} */
	read = $state.raw(null);
	/** The voice being edited (its channel id). */
	voice = $state(MELODY_CHANNEL);
	/** @type {DrawnNote[]} the edited voice's notes */
	notes = $state.raw([]);
	/** The note picked to delete or nudge (index into notes), or -1. */
	selected = $state(-1);
	/** New notes are drawn this long (ticks): the last length drawn. */
	drawLength = $state(gridTicks('eighth'));

	voices = $derived(this.read?.voices ?? []);
	current = $derived(this.voices.find((each) => each.id === this.voice) ?? this.voices[0] ?? null);
	score = $derived(this.current?.score ?? null);
	problem = $derived(this.current?.problem ?? '');
	end = $derived(this.score ? totalTicks(this.score) : 0);
	gridStep = $derived(gridTicks(this.grid));
	/** The other voices, drawn faintly behind the one being edited. */
	others = $derived(
		this.voices
			.filter((each) => each !== this.current)
			.map((each) => ({ colour: voiceColour(each.id), notes: each.score.notes }))
	);

	/** Where the band is on the roll: a time in the music (follow.js) to ticks, or null. */
	tickAt = $derived(playheadTicks(this.read?.lineStarts ? null : (this.read?.sequence ?? null)));

	/** Edits are written one after another, each from the ABC as the last one left it. */
	#writing = Promise.resolve();
	#reads = 0;

	/** @param {import('../../state/Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.arranger = arranger;
	}

	/**
	 * The chart's chords under the bars (names as the chart writes them).
	 * Read from the melody's bars: every part's bars line up with them.
	 */
	chordsUnder = $derived.by(() => {
		const { arrangement } = this.arranger;
		const melody = this.voices[0]?.score;
		if (!melody || !arrangement.isPlayable) return [];
		const sequence = this.read?.lineStarts ? null : (this.read?.sequence ?? null);
		return chordsUnderBars(melody, sequence, barsInPlayOrder(arrangement.sections));
	});

	/** Where the picked harmony note could go instead: the chord's other notes nearby. */
	options = $derived.by(() => {
		const note = this.notes[this.selected];
		if (!note || this.voice === MELODY_CHANNEL || this.problem) return [];
		const { arrangement, melodyKey } = this.arranger;
		const under = this.chordsUnder.find(
			(chord) => chord.at <= note.start && note.start < chord.at + chord.length
		);
		const chord = under ? concertChord(under.name, arrangement.key, arrangement.capoFret) : null;
		return chordToneOptions(chord, melodyKey.spelling, note.midi);
	});

	/** Read the tune's ABC again (or the chart, when there's no melody). */
	async load() {
		const { melody, arrangement } = this.arranger;
		const reading = ++this.#reads;
		const abc = melody.notation;
		const fromAbc = abc.trim() ? await readDrawnMelody(abc) : null;
		if (reading !== this.#reads) return;
		if (fromAbc) this.#show({ ...fromAbc, lineStarts: null });
		else if (arrangement.isPlayable) this.#show(this.#fromChart());
		else this.#show(null);
	}

	/** @param {string} id */
	editVoice(id) {
		this.voice = id;
		this.selected = -1;
		this.notes = this.current?.score.notes ?? [];
	}

	/**
	 * Keep these notes for the voice being edited, and write them into the ABC.
	 * @param {DrawnNote[]} notes
	 */
	commit(notes) {
		this.notes = notes;
		const voice = this.current?.id ?? MELODY_CHANNEL;
		this.#writing = this.#writing.then(() => this.#write(voice, notes)).catch(console.error);
		return this.#writing;
	}

	/** @param {import('./ticks.js').GridId} id */
	setGrid(id) {
		this.grid = id;
		this.drawLength = gridTicks(id);
	}

	/**
	 * @param {string} voice
	 * @param {DrawnNote[]} notes
	 */
	async #write(voice, notes) {
		const { melody } = this.arranger;
		const song = this.arranger.songForMelody();
		const abc = melody.notation;
		const current = abc.trim() ? await readDrawnMelody(abc) : null;
		const base = current ? { ...current, lineStarts: null } : this.#fromChart();
		const drawn = base.voices.find((each) => each.id === voice);
		if (!drawn || drawn.problem) return;
		const newTune = base.lineStarts
			? {
					title: this.arranger.title,
					keyText: this.arranger.melodyKey.keyText,
					lineStarts: base.lineStarts
				}
			: null;
		melody.notation = await writeDrawnMelody({
			abc,
			voice,
			score: drawn.score,
			notes,
			song,
			newTune
		});
	}

	/** @returns {Read} */
	#fromChart() {
		const { arrangement, melodyKey } = this.arranger;
		const bars = barsInPlayOrder(arrangement.sections);
		const { score, lineStarts } = scoreFromChart(
			bars,
			arrangement.key,
			arrangement.capoFret,
			melodyKey.spelling
		);
		const melodyVoice = { id: MELODY_CHANNEL, name: 'Melody', score, problem: '' };
		return { voices: [melodyVoice], sequence: null, lineStarts };
	}

	/** @param {Read | null} read */
	#show(read) {
		this.read = read;
		if (!this.voices.some((each) => each.id === this.voice)) this.voice = MELODY_CHANNEL;
		this.notes = this.current?.score.notes ?? [];
		if (this.selected >= this.notes.length) this.selected = -1;
	}
}

/**
 * A voice's colour, as a step round the colour wheel from the accent
 * (the same for a voice whichever others the tune has).
 * @param {string} id
 */
export function voiceColour(id) {
	return Math.max(0, VOICE_ORDER.indexOf(id));
}

/** @param {Score} score */
function totalTicks(score) {
	const last = score.bars.at(-1);
	return last ? last.start + last.length : 0;
}
