/**
 * The piano roll's state: the tune it draws (every voice read from the
 * ABC, or a melody shaped like the chart when there's none yet), the bass
 * line, which voice is being edited, its notes, and the grid. The ABC stays
 * the saved tune: every finished edit is written straight into it (so
 * drafts and Save cover it), and any change to the ABC is read back here
 * (from MelodyState and BassState, which parse them once).
 *
 * The bass is a voice of its own, in the song's bass field rather than the
 * tune (bass/): written as played, bar for bar with the chart, on lower
 * rows. Until it's edited it shows the band's own line, and the first edit
 * writes that line out with the change.
 */
import { barsInPlayOrder } from '../../chart/chartBars.js';
import { withoutVariant } from '../../instruments/chordBook.js';
import { isNoChord } from '../../chart/noChord.js';
import { MELODY_CHANNEL } from '../harmony/partChannels.js';
import { isGenerated } from '../harmony/generatedParts.js';
import { keptBars } from '../harmony/keptBars.js';
import { transposedDrawnMelody, writeDrawnMelody } from './drawnMelody.js';
import { OCTAVE, staysOnPiano, transposed } from './octaves.js';
import { blankScoreForSong } from './scoreFromChart.js';
import { chordsUnderBars } from './chordsUnderBars.js';
import { chordToneOptions } from './chordToneOptions.js';
import { gridTicks } from './ticks.js';
import { playedTime, playheadTicks } from './playheadTicks.js';
import { rewriteAbc } from './scoreToAbc.js';
import { BASS_ROWS, LANE_ROWS, MELODY_ROWS } from './pitchRows.js';
import { UPRIGHT_RANGE, isOutside } from '../../instruments/instrumentRanges.js';
import { isExtraPart } from '../extraParts.js';
import { echoZone, withoutPickupEcho, withPickupEcho } from './pickupEcho.js';
import { isShortBar } from './rollLayout.js';
import { BASS_VOICE, bassVoice, readBassScore } from '../../bass/readBass.js';
import { bassAbcInUse } from '../../bass/bassInUse.js';
import { voiceColour } from '../voiceColours.js';
import { abcjsIfLoaded } from '../../state/abcjsLoaded.svelte.js';

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
	/** @type {import('./pickupEcho.js').RollNote[]} the edited voice's notes, with the pickup shown again at the end */
	notes = $state.raw([]);
	/** The note picked to delete or nudge (index into notes), or -1. */
	selected = $state(-1);
	/**
	 * Until the bass is edited, show it empty (to write by ear) rather than
	 * the band's own line (to change). Transcribe sets this.
	 */
	bassStartsEmpty = false;
	/** A tune not written yet starts with a pickup bar this long (quarters; 0: none). Transcribe sets it from the recording's lead-in. */
	pickupQuarters = 0;
	/** New notes are drawn this long (ticks): the last length drawn. */
	drawLength = $state(gridTicks('eighth'));

	voices = $derived(this.read?.voices ?? []);
	current = $derived(this.voices.find((each) => each.id === this.voice) ?? this.voices[0] ?? null);
	score = $derived(this.current?.score ?? null);
	problem = $derived(this.current?.problem ?? '');
	isBass = $derived(this.current?.id === BASS_VOICE);
	/** An extra part: a line of the tune beside the melody (yours, or generated), for any instrument. */
	isExtra = $derived(isExtraPart(this.current?.id ?? ''));
	/** The bass is written as played, bar for bar with the chart: its own bars. */
	ownBars = $derived(this.isBass);
	/**
	 * A generated line: written from another lane and the chords, and
	 * following them, except in the bars you lock (a bar you change is locked for you).
	 */
	isHarmonyPart = $derived(isGenerated(this.arranger.melody.generated, this.current?.id ?? ''));
	/** The bars of a generated line you've locked (harmony/keptBars.js); none on any other line. */
	kept = $derived(
		keptBars(this.arranger.melody.notation, this.isHarmonyPart ? (this.score?.bars ?? []) : [])
	);
	/** The notes can't be changed here: a tune the roll can't write. */
	readOnly = $derived(this.problem !== '');
	/** Where this part usually plays (the rows are always the piano's). */
	usualRange = $derived(
		this.isBass ? BASS_ROWS : this.isExtra && !this.isHarmonyPart ? LANE_ROWS : MELODY_ROWS
	);
	/** Where this part's instrument can naturally play, or null when it isn't known. */
	playable = $derived(this.isBass ? UPRIGHT_RANGE : null);
	/** How many notes sit outside it. */
	notesOutside = $derived(
		this.playable
			? this.notes.filter((note) => isOutside(note.midi, /** @type {any} */ (this.playable))).length
			: 0
	);
	end = $derived(this.score ? totalTicks(this.score) : 0);
	gridStep = $derived(gridTicks(this.grid));
	/** Where the pickup shows again, in the last bar's closing beats (not on the bass: written as played). */
	echo = $derived(this.score && !this.ownBars ? echoZone(this.score.bars, isShortBar) : null);
	/**
	 * The tune's other voices, drawn faintly behind the one being edited; the
	 * given line (the one it's worked out from) less faintly, outlined.
	 * Not behind the bass: it's written as played, the tune as written.
	 */
	others = $derived(
		this.ownBars
			? []
			: this.voices
					.filter((each) => each !== this.current && each.id !== BASS_VOICE)
					.map((each) => ({
						colour: voiceColour(each.id, this.arranger.melody.generated),
						notes: each.score.notes,
						given: each.id === this.#given
					}))
	);

	/** The line the one shown is worked out from: a generated line's lead, else the melody. */
	#given = $derived(
		this.arranger.melody.generated.find((part) => part.id === this.current?.id)?.lead ??
			MELODY_CHANNEL
	);

	/** The tune's own bars, as played (null: written as played already). */
	#sequence = $derived(this.read?.lineStarts ? null : (this.read?.sequence ?? null));

	/** Where the band is on the roll: a time in the music (follow.js) to ticks, or null. */
	tickAt = $derived(playheadTicks(this.ownBars ? null : this.#sequence));
	/** A place on the roll (ticks) as a time in the music, the first time it's played. */
	timeAt = $derived(playedTime(this.ownBars ? null : this.#sequence));

	/** The band's own bass line (not saved in the song), read once per version of it. */
	#ownBass = {
		abc: '',
		read: /** @type {import('../../bass/readBass.js').ReadBass | null} */ (null)
	};

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
		const score = this.ownBars ? this.score : this.voices[0]?.score;
		if (!score || !arrangement.isPlayable) return [];
		const sequence = this.ownBars ? null : this.#sequence;
		return chordsUnderBars(score, sequence, barsInPlayOrder(arrangement.sections));
	});

	/** Where the picked note of a part could go instead: the chord's other notes nearby. */
	options = $derived.by(() => {
		const note = this.notes[this.selected];
		if (!note || this.voice === MELODY_CHANNEL || this.readOnly) return [];
		const { melodyKey } = this.arranger;
		const under = this.chordsUnder.find(
			(chord) => chord.at <= note.start && note.start < chord.at + chord.length
		);
		const chord = under && !isNoChord(under.name) ? withoutVariant(under.name) : null;
		return chordToneOptions(chord, melodyKey.spelling, note.midi);
	});

	/** Show the tune and the bass line as they're read now (or the chart, when there's no melody). */
	load() {
		const { arrangement } = this.arranger;
		const bass = arrangement.isPlayable ? bassVoice(this.#bassRead()) : null;
		const read = this.#fromAbc() ?? (arrangement.isPlayable ? this.#fromChart() : null);
		if (!read) return this.#show(null);
		const voices = [...read.voices, ...(bass ? [bass] : [])];
		this.#show({ ...read, voices });
	}

	/** @param {string} id */
	editVoice(id) {
		this.voice = id;
		this.selected = -1;
		this.notes = this.#shown();
	}

	/**
	 * Keep these notes for the voice being edited, and write them into the ABC.
	 * @param {DrawnNote[]} notes
	 */
	commit(notes) {
		if (this.readOnly) return;
		const own = withoutPickupEcho(notes, this.current?.score.notes ?? [], this.echo);
		this.notes = withPickupEcho(own, this.echo);
		this.#write(this.current?.id ?? MELODY_CHANNEL, own);
	}

	/**
	 * The voices an octave move takes: a lane brings the lines generated
	 * from it along (they're written from it).
	 */
	#octaveVoices = $derived.by(() => {
		const current = this.current;
		if (!current || this.read?.lineStarts) return [];
		const lines = this.arranger.melody.generated
			.filter((part) => part.lead === current.id)
			.map((part) => part.id);
		return this.voices.filter((each) => each === current || lines.includes(each.id));
	});

	/** @param {1 | -1} direction up or down */
	canMoveOctave(direction) {
		if (this.isHarmonyPart) return false;
		const voices = this.#octaveVoices;
		return (
			voices.some((each) => each.score.notes.length > 0) &&
			voices.every((each) => !each.problem && staysOnPiano(each.score.notes, OCTAVE * direction))
		);
	}

	/**
	 * Move the edited part (the melody with its harmony parts) up or down an octave.
	 * @param {1 | -1} direction
	 */
	moveOctave(direction) {
		if (!this.canMoveOctave(direction)) return;
		const semitones = OCTAVE * direction;
		if (this.#octaveVoices.length === 1) return this.commit(transposed(this.notes, semitones));
		const { melody } = this.arranger;
		melody.notation = transposedDrawnMelody(melody.notation, this.#octaveVoices, semitones);
	}

	/** The voice's notes as the roll shows them. */
	#shown() {
		return withPickupEcho(this.current?.score.notes ?? [], this.echo);
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
	#write(voice, notes) {
		if (voice === BASS_VOICE) return this.#writeBass(notes);
		const { melody } = this.arranger;
		const song = this.arranger.songForMelody();
		const abc = melody.notation;
		const base = this.#fromAbc() ?? this.#fromChart();
		const drawn = base.voices.find((each) => each.id === voice);
		if (!drawn || drawn.problem) return;
		const newTune = base.lineStarts
			? {
					title: this.arranger.title,
					keyText: this.arranger.melodyKey.keyText,
					lineStarts: base.lineStarts
				}
			: null;
		melody.notation = writeDrawnMelody({
			abc,
			voice,
			score: drawn.score,
			notes,
			song,
			newTune,
			abcjs: abcjsIfLoaded()
		});
		// A tune drawn from the chart starts kept by section
		if (newTune) this.arranger.splitTuneIntoSections();
	}

	/**
	 * The bass line with these notes, saved in the song's bass field. The
	 * first edit writes out the band's own line with it.
	 * @param {DrawnNote[]} notes
	 */
	#writeBass(notes) {
		const read = this.#bassRead();
		if (!read || read.problem) return;
		this.arranger.bass.notation = rewriteAbc(this.#bassAbc(), read.score, notes);
	}

	/** The bass line in use, read: the song's edited one, else the band's own. */
	#bassRead() {
		const { bass } = this.arranger;
		if (bass.isWritten) return bass.read;
		const abc = this.#bassAbc();
		if (abc !== this.#ownBass.abc || !this.#ownBass.read)
			this.#ownBass = { abc, read: readBassScore(abc, abcjsIfLoaded()) };
		return this.#ownBass.read;
	}

	#bassAbc() {
		return bassAbcInUse(this.arranger, { startsEmpty: this.bassStartsEmpty });
	}

	/** @returns {Read | null} the tune's voices as MelodyState read them */
	#fromAbc() {
		const { voices, sequence } = this.arranger.melody;
		return voices ? { voices, sequence, lineStarts: null } : null;
	}

	/** @returns {Read} */
	#fromChart() {
		const { score, lineStarts } = blankScoreForSong(this.arranger, this.pickupQuarters);
		const melodyVoice = { id: MELODY_CHANNEL, name: 'Melody', score, problem: '' };
		return { voices: [melodyVoice], sequence: null, lineStarts };
	}

	/** @param {Read | null} read */
	#show(read) {
		this.read = read;
		if (!this.voices.some((each) => each.id === this.voice)) this.voice = MELODY_CHANNEL;
		this.notes = this.#shown();
		if (this.selected >= this.notes.length) this.selected = -1;
	}
}

/** @param {Score} score */
function totalTicks(score) {
	const last = score.bars.at(-1);
	return last ? last.start + last.length : 0;
}
