/**
 * The piano roll's state: the tune it draws (every voice read from the
 * ABC, or a melody shaped like the chart when there's none yet), the bass
 * line, which voice is being edited, its notes, and the grid. The ABC stays
 * the saved tune: every finished edit is written straight into it (so
 * drafts and Save cover it), and any change to the ABC is read back here.
 *
 * The bass is a voice of its own, in the song's bass field rather than the
 * tune (bass/): written as played, bar for bar with the chart, on lower
 * rows. Until it's edited it shows the band's own line, and the first edit
 * writes that line out with the change.
 */
import { barsInPlayOrder } from '../../chart/chartBars.js';
import { concertChord } from '../../chart/concertChords.js';
import { MELODY_CHANNEL } from '../harmony/partChannels.js';
import { HARMONY_PARTS } from '../harmony/harmonyParts.js';
import { readDrawnMelody, writeDrawnMelody } from './drawnMelody.js';
import { blankScoreForSong } from './scoreFromChart.js';
import { chordsUnderBars } from './chordsUnderBars.js';
import { chordToneOptions } from './chordToneOptions.js';
import { gridTicks } from './ticks.js';
import { playheadTicks } from './playheadTicks.js';
import { rewriteAbc } from './scoreToAbc.js';
import { BASS_ROWS, MELODY_ROWS } from './pitchRows.js';
import { BASS_VOICE, readBassScore, readBassVoice } from '../../bass/readBass.js';
import { bassAbcInUse, bassSongOf } from '../../bass/bassAbc.js';

/** Every voice's place in the colour wheel: the melody, then each harmony part. */
const VOICE_ORDER = [MELODY_CHANNEL, ...HARMONY_PARTS.map((part) => part.id)];
/** The bass sits opposite the melody on the wheel (each step turns 75°, theme/ui.css). */
const BASS_COLOUR = 2.4;

/**
 * @typedef {import('./readScore.js').Score} Score
 * @typedef {import('./editNotes.js').DrawnNote} DrawnNote
 * @typedef {import('./drawnMelody.js').DrawnVoice} DrawnVoice
 * @typedef {{
 *   voices: DrawnVoice[], sequence: any[][] | null,
 *   lineStarts: Map<number, string> | null
 * }} Read lineStarts: map when the melody came from the chart (a new tune)
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
	isBass = $derived(this.current?.id === BASS_VOICE);
	/** A harmony part: one of the tune's voices, not the melody. */
	isHarmonyPart = $derived(
		Boolean(this.current) && !this.isBass && this.current?.id !== MELODY_CHANNEL
	);
	range = $derived(this.isBass ? BASS_ROWS : MELODY_ROWS);
	end = $derived(this.score ? totalTicks(this.score) : 0);
	gridStep = $derived(gridTicks(this.grid));
	/**
	 * The tune's other voices, drawn faintly behind the one being edited.
	 * Not behind the bass: it's written as played, the tune as written.
	 */
	others = $derived(
		this.isBass
			? []
			: this.voices
					.filter((each) => each !== this.current && each.id !== BASS_VOICE)
					.map((each) => ({ colour: voiceColour(each.id), notes: each.score.notes }))
	);

	/** The tune's own bars, as played (null: written as played already). */
	#sequence = $derived(this.read?.lineStarts ? null : (this.read?.sequence ?? null));

	/** Where the band is on the roll: a time in the music (follow.js) to ticks, or null. */
	tickAt = $derived(playheadTicks(this.isBass ? null : this.#sequence));

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
	 * The bass has its own bars.
	 */
	chordsUnder = $derived.by(() => {
		const { arrangement } = this.arranger;
		const score = this.isBass ? this.score : this.voices[0]?.score;
		if (!score || !arrangement.isPlayable) return [];
		const sequence = this.isBass ? null : this.#sequence;
		return chordsUnderBars(score, sequence, barsInPlayOrder(arrangement.sections));
	});

	/** Where the picked harmony or bass note could go instead: the chord's other notes nearby. */
	options = $derived.by(() => {
		const note = this.notes[this.selected];
		if (!note || this.voice === MELODY_CHANNEL || this.problem) return [];
		const { arrangement, melodyKey } = this.arranger;
		const under = this.chordsUnder.find(
			(chord) => chord.at <= note.start && note.start < chord.at + chord.length
		);
		const chord = under ? concertChord(under.name, arrangement.key, arrangement.capoFret) : null;
		return chordToneOptions(chord, melodyKey.spelling, note.midi, this.range);
	});

	/** Read the tune's ABC and the bass line again (or the chart, when there's no melody). */
	async load() {
		const { melody, arrangement } = this.arranger;
		const reading = ++this.#reads;
		const abc = melody.notation;
		const [fromAbc, bass] = await Promise.all([
			abc.trim() ? readDrawnMelody(abc) : null,
			arrangement.isPlayable ? readBassVoice(this.#bassAbc()) : null
		]);
		if (reading !== this.#reads) return;
		const read = fromAbc
			? { ...fromAbc, lineStarts: null }
			: arrangement.isPlayable
				? this.#fromChart()
				: null;
		this.#show(read && bass ? { ...read, voices: [...read.voices, bass] } : read);
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
		if (voice === BASS_VOICE) return this.#writeBass(notes);
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

	/**
	 * The bass line with these notes, saved in the song's bass field. The
	 * first edit writes out the band's own line with it.
	 * @param {DrawnNote[]} notes
	 */
	async #writeBass(notes) {
		const abc = this.#bassAbc();
		const read = await readBassScore(abc);
		if (!read || read.problem) return;
		this.arranger.bass.notation = rewriteAbc(abc, read.score, notes);
	}

	#bassAbc() {
		return bassAbcInUse(this.arranger.bass.notation, bassSongOf(this.arranger));
	}

	/** @returns {Read} */
	#fromChart() {
		const { score, lineStarts } = blankScoreForSong(this.arranger);
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
	if (id === BASS_VOICE) return BASS_COLOUR;
	return Math.max(0, VOICE_ORDER.indexOf(id));
}

/** @param {Score} score */
function totalTicks(score) {
	const last = score.bars.at(-1);
	return last ? last.start + last.length : 0;
}
