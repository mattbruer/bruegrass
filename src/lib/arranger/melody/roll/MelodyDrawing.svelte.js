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
import { concertChord } from '../../chart/concertChords.js';
import { isNoChord } from '../../chart/noChord.js';
import { MELODY_CHANNEL } from '../harmony/partChannels.js';
import { HARMONY_PARTS } from '../harmony/harmonyParts.js';
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
import { EXTRA_PARTS, isExtraPart } from '../extraParts.js';
import { echoZone, withoutPickupEcho, withPickupEcho } from './pickupEcho.js';
import { isShortBar } from './rollLayout.js';
import { BASS_VOICE, bassVoice, readBassScore } from '../../bass/readBass.js';
import { blankBassAbc, generatedBassAbc } from '../../bass/bassAbc.js';
import { bassSongOf } from '../../bass/bassSong.js';
import { abcjsIfLoaded } from '../../state/abcjsLoaded.svelte.js';

/** Every voice's place in the colour wheel: the melody, then each harmony part. */
const VOICE_ORDER = [MELODY_CHANNEL, ...HARMONY_PARTS.map((part) => part.id)];
/** The bass sits opposite the melody on the wheel (each step turns 75°, theme/ui.css). */
const BASS_COLOUR = 2.4;
/** Extra parts (+ Lane) start past the harmony parts on the wheel, a step each. */
const LANE_COLOUR = 3.6;
const LANE_COLOUR_STEP = 0.8;

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
	/** An extra part (+ Lane): a line of the tune written by ear, for any instrument. */
	isExtra = $derived(isExtraPart(this.current?.id ?? ''));
	/** The bass is written as played, bar for bar with the chart: its own bars. */
	ownBars = $derived(this.isBass);
	/** A harmony part: one of the tune's voices written from the melody. */
	isHarmonyPart = $derived(
		Boolean(this.current) && !this.ownBars && !this.isExtra && this.current?.id !== MELODY_CHANNEL
	);
	/** Where this part usually plays (the rows are always the piano's). */
	usualRange = $derived(this.isBass ? BASS_ROWS : this.isExtra ? LANE_ROWS : MELODY_ROWS);
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
	 * given melody (the lines are worked out from it) less faintly, outlined.
	 * Not behind the bass: it's written as played, the tune as written.
	 */
	others = $derived(
		this.ownBars
			? []
			: this.voices
					.filter((each) => each !== this.current && each.id !== BASS_VOICE)
					.map((each) => ({
						colour: voiceColour(each.id),
						notes: each.score.notes,
						given: each.id === MELODY_CHANNEL
					}))
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

	/** Where the picked harmony or bass note could go instead: the chord's other notes nearby. */
	options = $derived.by(() => {
		const note = this.notes[this.selected];
		if (!note || this.voice === MELODY_CHANNEL || this.problem) return [];
		const { arrangement, melodyKey } = this.arranger;
		const under = this.chordsUnder.find(
			(chord) => chord.at <= note.start && note.start < chord.at + chord.length
		);
		const chord =
			under && !isNoChord(under.name)
				? concertChord(under.name, under.key ?? arrangement.key, arrangement.capoFret)
				: null;
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
		const own = withoutPickupEcho(notes, this.current?.score.notes ?? [], this.echo);
		this.notes = withPickupEcho(own, this.echo);
		this.#write(this.current?.id ?? MELODY_CHANNEL, own);
	}

	/**
	 * The voices an octave move takes: the melody brings its harmony parts
	 * along (they're written from it); any other part moves alone.
	 */
	#octaveVoices = $derived.by(() => {
		const current = this.current;
		if (!current || this.read?.lineStarts) return [];
		if (current.id !== MELODY_CHANNEL) return [current];
		return this.voices.filter(
			(each) => each.id === MELODY_CHANNEL || VOICE_ORDER.includes(each.id)
		);
	});

	/** @param {1 | -1} direction up or down */
	canMoveOctave(direction) {
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
		if (this.voice !== MELODY_CHANNEL) return this.commit(transposed(this.notes, semitones));
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
		const written = this.arranger.bass.notation;
		if (written.trim()) return written;
		const song = bassSongOf(this.arranger);
		return this.bassStartsEmpty ? blankBassAbc(song) : generatedBassAbc(song);
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

/**
 * A voice's colour, as a step round the colour wheel from the accent
 * (the same for a voice whichever others the tune has).
 * @param {string} id
 */
export function voiceColour(id) {
	if (id === BASS_VOICE) return BASS_COLOUR;
	if (isExtraPart(id))
		return LANE_COLOUR + LANE_COLOUR_STEP * EXTRA_PARTS.findIndex((part) => part.id === id);
	return Math.max(0, VOICE_ORDER.indexOf(id));
}

/** @param {Score} score */
function totalTicks(score) {
	const last = score.bars.at(-1);
	return last ? last.start + last.length : 0;
}
