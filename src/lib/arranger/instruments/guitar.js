import chords from './guitar-chords.json';
import { rhythm, slotPositions } from '../chart/timeline.js';
import { pickPattern, patternStrokes } from './strumPatterns.js';
import { createRng } from './seededRandom.js';

/** @typedef {import('../chart/timeline.js').SlotPosition} SlotPosition */

/** String sample prefixes, low E to high e. */
export const STRINGS = ['E', 'A', 'D', 'G', 'B', 'ee'];

/** MIDI note of each open string, low E to high e. */
const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

/** Highest fret with a sample. */
export const MAX_FRET = 12;

/** Strings a strum plays, low first (an upstroke plays them high to low). */
const STRUM_STRINGS = [3, 4, 5];
/*
 * How a note ends. A string can only sound one note: striking it again
 * damps the old note as the new one starts, so the old one fades very
 * quickly from that moment (a hard cut sounds abrupt). At a chord change
 * the fretting hand lifts off, a little gentler.
 */
const RESTRIKE_FADE = 0.015; // seconds
const CHORD_CHANGE_FADE = 0.05; // seconds

/** An upstroke is a little lighter than a downstroke. */
const STROKE_DB = { down: 0, up: -3 };

/** Seed for the strum pattern choices, so a song always plays (and exports) the same. */
const STRUM_SEED = 11;

/** When looping, the guitar's notes span this many passes, so the sprinkled patterns vary. */
const LOOP_PASSES = 4;

/*
 * Right-hand pendulum. The strumming hand swings down and up once per two
 * strokes of the pattern (once per quarter note for boom-chuck). The pick's position across the
 * strings is x(t) = center + A·sin(2πt / quarter), so it moves fastest
 * mid-guitar and slows toward the ends of the swing. Each string sounds when
 * the pick reaches it.
 */
const STRING_SPACING_MM = 10; // ~54 mm E–E at the saddle, ~36 mm at the nut
const SWING_CENTER = 2.5; // in string gaps from low E: between the D and G strings
const SWING_MM_AT_120 = 55; // swing amplitude at 120 BPM
const SWING_TEMPO_EXPONENT = 0.3; // faster tempo → smaller (but faster) swing
const SWING_MIN_MM = 30; // must clear the outermost string (25 mm from center)

/*
 * Touch. Faster tempos are played lighter: quieter, duller, softer attack.
 * With one sample set this is faked with gain, a low-pass filter and a short
 * fade-in on each note.
 */
const TOUCH_DB_PER_DOUBLING = -6; // above TOUCH_BASE_BPM
const TOUCH_BASE_BPM = 120;
const TOUCH_MIN_DB = -9;
const TOUCH_BASS_RATIO = 0.5; // bass notes are still picked deliberately
const TOUCH_FULL_CUTOFF = 16000; // Hz at full touch; falls 10x per -12 dB
const TOUCH_FADE_IN_PER_DB = 0.0005; // s of fade-in per dB lighter (3 ms at -6 dB)

const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Chord shape as written (no capo), low E to high e.
 * @param {string} name
 * @returns {(number | null)[]}
 */
export function chordShape(name) {
	const shape = chords[name];
	if (!shape) throw new Error(`Unknown chord: ${name}`);
	return shape;
}

/**
 * Pitch class (0–11) of the chord's root, from its name.
 * @param {string} name
 */
export function rootPitchClass(name) {
	const match = name.match(/^([A-G])([#b]?)/);
	if (!match) throw new Error(`Can't read root of chord: ${name}`);
	const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
	return (PITCH_CLASS[match[1]] + accidental + 12) % 12;
}

/**
 * Where the bass note lives in the chord shape: the lowest-sounding played
 * string whose note is the root (or fifth). Frets are without capo.
 * @param {string} name
 * @param {'root' | 'fifth'} which
 * @returns {{ string: number, fret: number }}
 */
export function bassNote(name, which) {
	const shape = chordShape(name);
	const pc = (rootPitchClass(name) + (which === 'fifth' ? 7 : 0)) % 12;
	let best = null;

	shape.forEach((fret, string) => {
		if (fret === null) return;
		const midi = OPEN_MIDI[string] + fret;
		if (midi % 12 === pc && (!best || midi < best.midi)) {
			best = { string, fret, midi };
		}
	});

	if (!best) throw new Error(`The ${name} shape has no ${which} to play in the bass`);
	return { string: best.string, fret: best.fret };
}

/**
 * True MIDI pitch of a fretted note (low E open = 40, E2).
 * @param {number} string index into STRINGS
 * @param {number} fret
 */
export function midiNote(string, fret) {
	return OPEN_MIDI[string] + fret;
}

/**
 * @param {number} string index into STRINGS
 * @param {number} fret
 */
export function sampleUrl(string, fret) {
	if (fret > MAX_FRET) {
		throw new Error(`Fret ${fret} on the ${STRINGS[string]} string is above fret ${MAX_FRET}`);
	}
	return `/samples/guitar/${STRINGS[string]}${fret}.mp3`;
}

/**
 * When each string of a stroke sounds, in seconds after the first one,
 * following the right hand's pendulum swing. An upstroke reaches the high
 * strings first.
 * @param {number[]} strings string indices, low to high
 * @param {number} bpm
 * @param {{ direction?: 'down' | 'up', steps?: number }} [stroke]
 *   steps: the hand's strokes per quarter note (more = a faster, smaller swing)
 */
export function strumOffsets(strings, bpm, { direction = 'down', steps = 2 } = {}) {
	const handBpm = (bpm * steps) / 2;
	const omega = (2 * Math.PI * handBpm) / 60;
	const amplitude = Math.max(
		SWING_MIN_MM,
		SWING_MM_AT_120 * (120 / handBpm) ** SWING_TEMPO_EXPONENT
	);
	const sign = direction === 'up' ? -1 : 1;
	const crossing = strings.map(
		(string) =>
			(sign * Math.asin(((string - SWING_CENTER) * STRING_SPACING_MM) / amplitude)) / omega
	);
	const first = Math.min(...crossing);
	return crossing.map((t) => t - first);
}

/**
 * How lightly the player is picking at this tempo.
 * @param {number} bpm
 */
export function touch(bpm) {
	const strumDb =
		bpm > TOUCH_BASE_BPM
			? Math.max(TOUCH_MIN_DB, TOUCH_DB_PER_DOUBLING * Math.log2(bpm / TOUCH_BASE_BPM))
			: 0;
	const bassDb = strumDb * TOUCH_BASS_RATIO;
	/** @param {number} db */
	const cutoff = (db) => TOUCH_FULL_CUTOFF * 10 ** (db / 12);
	/** @param {number} db */
	const fadeIn = (db) => -db * TOUCH_FADE_IN_PER_DB;
	return {
		levelDb: { strum: strumDb, bass: bassDb },
		cutoff: { strum: cutoff(strumDb), bass: cutoff(bassDb) },
		fadeIn: { strum: fadeIn(strumDb), bass: fadeIn(bassDb) }
	};
}

/**
 * How the guitar sounds a pitch shift (capo + transposition) with its
 * shapes: as much as possible with a capo, and anything the capo can't
 * reach (below the open shapes, or past the highest sample) by resampling.
 * @param {{ measures: string[][] }[]} sections
 * @param {number} shift semitones
 * @returns {{ capo: number, detune: number }} detune in semitones
 */
export function guitarTuning(sections, shift) {
	const names = slotPositions(sections).map((slot) => slot.name);
	const highest = Math.max(
		0,
		...names.flatMap((name) => chordShape(name).filter((fret) => fret !== null))
	);
	const capo = Math.min(Math.max(shift, 0), MAX_FRET - highest);
	return { capo, detune: shift - capo };
}

/**
 * @typedef {{
 *   time: number, stop: number, string: number, fret: number, chord: string,
 *   part: 'bass' | 'strum', levelDb: number, fadeOut: number
 * }} NoteEvent
 *   fadeOut: seconds, from `stop`
 */

/**
 * Turn parsed sections into scheduled notes (seconds from 0).
 *
 * Each beat group of the rhythm grid from timeline.js (boom-chuck, or
 * boom-chuck-chuck in 3/4) gets a strum pattern (strumPatterns.js),
 * boom-chuck or bum-titty, chosen at random. Bass notes on the same chord
 * alternate root/fifth; a new chord (or a new pass) starts on
 * its root. A note rings until its string is played again or the chord
 * changes. When looping, the notes span LOOP_PASSES passes and that rule
 * wraps into the next; otherwise it's one pass and the last chord rings one
 * extra half note.
 *
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{ capo?: number, bpm?: number, loop?: boolean }} options
 * @returns {{ events: NoteEvent[], duration: number }} duration: how long until the notes repeat (or end)
 */
export function buildEvents(sections, { capo = 0, bpm = 120, loop = false } = {}) {
	const { beats, quarters, slots } = rhythm(sections);
	if (beats.length === 0) throw new Error('Nothing to play');

	const quarter = 60 / bpm;
	const passLength = quarters * quarter;
	const kept = loop ? LOOP_PASSES : 1;

	// One extra pass when looping so stop times can see into the next one
	const passes = loop ? kept + 1 : 1;
	const end = loop ? passes * passLength : passLength + 2 * quarter;
	const sequence = Array.from({ length: passes }, (_, p) =>
		slots.map((slot) => ({ name: slot.name, start: (slot.start + p * quarters) * quarter }))
	).flat();

	// When each slot's chord stops (next different chord, or the end)
	const chordEnds = new Array(sequence.length);
	let chordEnd = end;
	for (let k = sequence.length - 1; k >= 0; k--) {
		chordEnds[k] = chordEnd;
		if (k > 0 && sequence[k - 1].name !== sequence[k].name) chordEnd = sequence[k].start;
	}

	const { levelDb } = touch(bpm);
	const random = createRng(STRUM_SEED);

	/** @type {NoteEvent[]} */
	let events = [];
	let repeat = 0;

	for (let p = 0; p < passes; p++) {
		/** @type {string | null} */
		let lastBoom = null; // each pass starts on the root
		beats.forEach((boom, b) => {
			if (boom.role !== 'boom') return;
			for (const stroke of patternStrokes(pickPattern(random), boom.length)) {
				const k = p * slots.length + beats[b + Math.floor(stroke.at)].slot;
				const chord = sequence[k].name;
				const time = (boom.time + stroke.at + p * quarters) * quarter;
				const stop = chordEnds[k];

				if (stroke.hit === 'bass') {
					repeat = lastBoom === chord ? repeat + 1 : 0;
					lastBoom = chord;
					const bass = bassNote(chord, repeat % 2 === 0 ? 'root' : 'fifth');
					events.push({
						time,
						stop,
						string: bass.string,
						fret: bass.fret + capo,
						chord,
						part: 'bass',
						levelDb: levelDb.bass,
						fadeOut: CHORD_CHANGE_FADE
					});
					continue;
				}

				const shape = chordShape(chord);
				const strings = STRUM_STRINGS.filter((string) => shape[string] !== null);
				const offsets = strumOffsets(strings, bpm, stroke);
				strings.forEach((string, i) => {
					events.push({
						time: time + offsets[i],
						stop,
						string,
						fret: /** @type {number} */ (shape[string]) + capo,
						chord,
						part: 'strum',
						levelDb: levelDb.strum + STROKE_DB[stroke.direction],
						fadeOut: CHORD_CHANGE_FADE
					});
				});
			}
		});
	}

	// A string struck again damps its previous note
	events.sort((a, b) => a.time - b.time);
	events.forEach((event, i) => {
		const next = events.slice(i + 1).find((other) => other.string === event.string);
		if (next && next.time <= event.stop) {
			event.stop = next.time;
			event.fadeOut = RESTRIKE_FADE;
		}
	});

	if (loop) events = events.filter((event) => event.time < kept * passLength);

	return { events, duration: loop ? kept * passLength : end };
}
