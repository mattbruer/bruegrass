import { chordShape, withoutVariant } from './chordBook.js';
import { chordTypeOf, toneSemitones } from '../theory/chordTypes.js';
import { placesInSlots, rhythm } from '../chart/timeline.js';
import { pickPattern, patternStrokes } from './strumPatterns.js';
import { hitAt, hitSpans } from '../chart/hits.js';
import { createRng } from './seededRandom.js';
import { secondsPerQuarter } from '../chart/tempo.js';
import { ARTICULATIONS } from './articulation.js';
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';

/** @typedef {import('../chart/timeline.js').SlotPosition} SlotPosition */

/** String sample prefixes, low E to high e. */
export const STRINGS = ['E', 'A', 'D', 'G', 'B', 'ee'];

/** MIDI note of each open string, low E to high e. */
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

/** Highest fret with a sample. */
export const MAX_FRET = 12;

/** Strings a chuck strums unless you say otherwise, low first (an upstroke plays them high to low). */
export const STRUM_STRINGS = [3, 4, 5];
/** Strings a full strum (a hit) plays: all six. */
const FULL_STRINGS = [0, 1, 2, 3, 4, 5];
/*
 * How a note ends. A string can only sound one note: striking it again
 * damps the old note as the new one starts, so the old one fades very
 * quickly from that moment (a hard cut sounds abrupt). At a chord change
 * the fretting hand lifts off, a little gentler.
 */
const RESTRIKE_FADE = 0.015; // seconds
const CHORD_CHANGE_FADE = 0.05; // seconds
const MUTE_FADE = 0.04; // seconds: the hand comes down on the strings (a choked hit)

/** An upstroke is a little lighter than a downstroke. */
const STROKE_DB = { down: 0, up: -3 };

/** How much louder an accented beat is (yours: guitarPlan.js), until samples at more velocities arrive. */
const ACCENT_DB = 8;

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
const TOUCH_STRUM_RATIO = 0.5; // a graze is already light, so it follows the tempo only half as much
/* Booms are plucked, strums graze (articulation.js); a lighter touch darkens either, 10x per -12 dB */
const PART_ARTICULATION = { bass: ARTICULATIONS.pluck, strum: ARTICULATIONS.graze };
/** The rhythm guitar's strums sit well under its booms: this much below a graze (the user's ear). */
const STRUM_DB = -6;
const TOUCH_FADE_IN_PER_DB = 0.0005; // s of fade-in per dB lighter (3 ms at -6 dB)

/* A slash chord's bass is found on these strings, low E first, up to this fret */
const SLASH_BASS_STRINGS = [0, 1, 2];
const SLASH_BASS_MAX_FRET = 4;

const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Pitch class (0–11) of the chord's root, from its name (or of a note name like "Bb").
 * @param {string} name
 */
export function rootPitchClass(name) {
	const match = name.match(/^([A-G])([#b]?)/);
	if (!match) throw new Error(`Can't read root of chord: ${name}`);
	const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
	return (PITCH_CLASS[match[1]] + accidental + 12) % 12;
}

/**
 * Pitch class of a slash chord's bass ("G/B" → B), or null without one.
 * @param {string} name
 */
export function slashBassPitchClass(name) {
	const bass = name.split('/')[1];
	return bass ? rootPitchClass(bass) : null;
}

/**
 * Semitones from root to fifth: diminished and half-diminished chords
 * have a flat fifth, augmented a sharp one.
 * @param {string} name
 */
export function fifthInterval(name) {
	const suffix = withoutVariant(name)
		.split('/')[0]
		.replace(/^[A-G][#b]?/, '');
	const type = chordTypeOf(suffix);
	const tones = type ? toneSemitones(type) : [];
	return [7, 6, 8].find((fifth) => tones.includes(fifth)) ?? 7;
}

/**
 * The bass note that alternates with the root: the fifth, or the root when
 * a slash chord already has its fifth in the bass (C/G alternates G and C).
 * @param {string} name
 */
export function alternatingPitchClass(name) {
	const root = rootPitchClass(name);
	const fifth = (root + fifthInterval(name)) % 12;
	return slashBassPitchClass(name) === fifth ? root : fifth;
}

/**
 * A slash chord's bass: the lowest note with this pitch class on the bottom
 * strings in open position, the way a guitarist walks G, G/F#, Em.
 * @param {number} pc
 * @returns {{ string: number, fret: number }}
 */
function lowestOpenNote(pc) {
	for (const string of SLASH_BASS_STRINGS) {
		for (let fret = 0; fret <= SLASH_BASS_MAX_FRET; fret++) {
			if ((OPEN_MIDI[string] + fret) % 12 === pc) return { string, fret };
		}
	}
	throw new Error(`No open-position bass note for pitch class ${pc}`);
}

/**
 * Where the bass note lives in the chord's shape: the lowest-sounding
 * played string whose note is the root (or fifth). Frets are without capo.
 * @param {string} name
 * @param {'root' | 'fifth'} which
 * @returns {{ string: number, fret: number }}
 */
export function bassNote(name, which) {
	return bassNoteIn(chordShape(name), name, which);
}

/**
 * The same, in a given shape (so a new shape can be checked before it's saved).
 * @param {(number | null)[]} shape
 * @param {string} name
 * @param {'root' | 'fifth'} which
 * @returns {{ string: number, fret: number }}
 */
export function bassNoteIn(shape, name, which) {
	const slashBass = slashBassPitchClass(name);
	if (which === 'root' && slashBass !== null) return lowestOpenNote(slashBass);

	const pc = which === 'root' ? rootPitchClass(name) : alternatingPitchClass(name);
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
 * How each part is picked at this tempo: booms plucked, strums grazed
 * (articulation.js), both lighter as the tempo rises.
 * @param {number} bpm
 */
export function touch(bpm) {
	const strumDb =
		bpm > TOUCH_BASE_BPM
			? Math.max(TOUCH_MIN_DB, TOUCH_DB_PER_DOUBLING * Math.log2(bpm / TOUCH_BASE_BPM))
			: 0;
	const strum = picked(PART_ARTICULATION.strum, strumDb * TOUCH_STRUM_RATIO);
	const bass = picked(PART_ARTICULATION.bass, strumDb * TOUCH_BASS_RATIO);
	return {
		levelDb: { strum: strum.levelDb + STRUM_DB, bass: bass.levelDb },
		cutoff: { strum: strum.cutoff, bass: bass.cutoff },
		fadeIn: { strum: strum.fadeIn, bass: bass.fadeIn },
		skip: { strum: strum.skip, bass: bass.skip }
	};
}

/**
 * An articulation played this much lighter.
 * @param {import('./articulation.js').Articulation} articulation
 * @param {number} lighterDb 0 or less
 */
function picked(articulation, lighterDb) {
	return {
		levelDb: articulation.levelDb + lighterDb,
		cutoff: articulation.brightness * 10 ** (lighterDb / 12),
		fadeIn: articulation.attack - lighterDb * TOUCH_FADE_IN_PER_DB,
		skip: articulation.skip
	};
}

/**
 * How the guitar sounds a pitch shift (capo + transposition) with its
 * shapes: as much as possible with a capo, and anything the capo can't
 * reach (below the open shapes, or past the highest sample) by resampling.
 * @param {import('./guitarPlan.js').GuitarChord[]} chords what it plays (guitarPlan.js)
 * @param {number} shift semitones
 * @returns {{ capo: number, detune: number }} detune in semitones
 */
export function guitarTuning(chords, shift) {
	const highest = Math.max(
		0,
		...chords.flatMap((chord) => chord.shape.filter((fret) => fret !== null))
	);
	const capo = Math.min(Math.max(shift, 0), MAX_FRET - highest);
	return { capo, detune: shift - capo };
}

/**
 * @typedef {{
 *   time: number, stop: number, string: number, fret: number, chord: string,
 *   part: 'bass' | 'strum', levelDb: number, fadeOut: number, accent: boolean
 * }} NoteEvent
 *   fadeOut: seconds, from `stop`; accent: on a beat you accented (levelDb has it already;
 *   a harder-played sample would be picked by it)
 */

/**
 * Turn parsed sections into scheduled notes (seconds from 0).
 *
 * Each beat group of the rhythm grid from timeline.js (boom-chuck, or
 * boom-chuck-chuck in 3/4) gets a strum pattern (strumPatterns.js),
 * boom-chuck or bum-titty, chosen at random; a hit (chart/hits.js) plays
 * its own pattern once and the strumming stops until the next chord. What
 * each boom and chuck plays on a chord is decided in guitarPlan.js (the
 * shape, root/5th booms, your changes). A note rings until its string is played again or the chord
 * changes. When looping, the notes span LOOP_PASSES passes and that rule
 * wraps into the next; otherwise it's one pass and the last chord rings one
 * extra half note.
 *
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{ chords: import('./guitarPlan.js').GuitarChord[], capo?: number, bpm?: number, loop?: boolean }} options
 *   chords: what it plays on each chord (guitarChords in guitarPlan.js)
 * @returns {{ events: NoteEvent[], duration: number }} duration: how long until the notes repeat (or end)
 */
export function buildEvents(sections, { chords, capo = 0, bpm = 120, loop = false }) {
	const { beats, quarters, slots } = rhythm(sections);
	const places = placesInSlots(beats);
	if (beats.length === 0) throw new Error('Nothing to play');
	// What you've said about each beat: one picked note of yours (a run) instead of the band's stroke, an accent
	const planned = beats.map((beat) => {
		const slot = slots[beat.slot];
		return chords[beat.slot].beats.find(
			(each) => Math.abs(slot.start + each.at - beat.time) < 1e-6
		);
	});
	const notes = planned.map((own) => own?.note ?? null);
	const accent = (/** @type {number} */ b) => planned[b]?.accent ?? false;
	const accentDb = (/** @type {number} */ b) => (accent(b) ? ACCENT_DB : 0);

	const quarter = secondsPerQuarter(bpm);
	const passLength = quarters * quarter;
	const kept = loop ? LOOP_PASSES : 1;

	// One extra pass when looping so stop times can see into the next one
	const passes = loop ? kept + 1 : 1;
	const end = loop ? passes * passLength : passLength + 2 * quarter;
	const sequence = Array.from({ length: passes }, (_, p) =>
		slots.map((slot) => ({
			name: slot.name,
			start: (slot.start + p * quarters) * quarter
		}))
	).flat();

	// When each slot's chord stops (next different chord, or the end)
	const chordEnds = new Array(sequence.length);
	let chordEnd = end;
	for (let k = sequence.length - 1; k >= 0; k--) {
		chordEnds[k] = chordEnd;
		const before = sequence[k - 1];
		const changes = before && before.name !== sequence[k].name;
		if (changes) chordEnd = sequence[k].start;
	}

	const { levelDb } = touch(bpm);
	const random = createRng(STRUM_SEED);
	const hits = hitSpans(sections);

	/** @type {NoteEvent[]} */
	let events = [];
	/** @type {number[]} seconds: where the hand mutes every ringing string */
	const mutes = [];

	const fills = chords.flatMap((chord) => (chord.fill ? [chord.fill] : []));
	/** Is the band's strum replaced by a fill at this time (quarters from bar 1)? */
	const inFill = (/** @type {number} */ time) =>
		fills.some((fill) => time >= fill.start - 1e-6 && time < fill.start + fill.length - 1e-6);
	/** A strum is let go as the next fill starts (seconds; `p` is the pass). */
	const stopBeforeFill = (
		/** @type {number} */ time,
		/** @type {number} */ p,
		/** @type {number} */ stop
	) => {
		const starts = fills
			.map((fill) => (fill.start + p * quarters) * quarter)
			.filter((start) => start > time + 1e-6);
		return Math.min(stop, ...starts);
	};

	for (let p = 0; p < passes; p++) {
		chords.forEach((chord) => {
			chord.fill?.played.forEach((note) => {
				const at = chord.fill.start + note.start / TICKS_PER_QUARTER + p * quarters;
				events.push({
					time: at * quarter,
					stop: (at + note.length / TICKS_PER_QUARTER) * quarter,
					string: note.string,
					fret: note.fret + capo,
					chord: chord.name,
					part: 'bass',
					levelDb: levelDb.bass,
					fadeOut: CHORD_CHANGE_FADE,
					accent: false
				});
			});
		});
		beats.forEach((beat, b) => {
			const note = notes[b];
			if (!note || inFill(beat.time)) return;
			const k = p * slots.length + beat.slot;
			events.push({
				time: (beat.time + p * quarters) * quarter,
				stop: stopBeforeFill((beat.time + p * quarters) * quarter, p, chordEnds[k]),
				string: note.string,
				fret: note.fret + capo,
				chord: sequence[k].name,
				part: 'bass',
				levelDb: levelDb.bass + accentDb(b),
				fadeOut: CHORD_CHANGE_FADE,
				accent: accent(b)
			});
		});
		beats.forEach((boom, b) => {
			if (boom.role !== 'boom') return;
			const pattern = pickPattern(random);
			const hit = hitAt(boom.time, hits);
			if (hit && hit.start < boom.time - 1e-6) return; // a hit rings here
			for (const stroke of patternStrokes(hit?.hit ?? pattern, boom.length)) {
				const beat = b + Math.floor(stroke.at);
				if (notes[beat] || inFill(beats[beat].time)) continue; // yours, or a fill: the guitar rests
				const played = chords[beats[beat].slot];
				const k = p * slots.length + beats[beat].slot;
				const chord = sequence[k].name;
				const time = (boom.time + stroke.at + p * quarters) * quarter;
				const stop = stopBeforeFill(time, p, chordEnds[k]);

				if (stroke.hit === 'mute') {
					mutes.push(time);
					continue;
				}
				if (stroke.hit === 'bass') {
					const bass = played.booms[places[beat]];
					events.push({
						time,
						stop,
						string: bass.string,
						fret: bass.fret + capo,
						chord,
						part: 'bass',
						levelDb: levelDb.bass + accentDb(beat),
						fadeOut: CHORD_CHANGE_FADE,
						accent: accent(beat)
					});
					continue;
				}

				const { shape } = played;
				const strings = (
					stroke.hit === 'full'
						? FULL_STRINGS
						: beats[beat].role === 'chuck'
							? played.chucks[places[beat]]
							: STRUM_STRINGS
				).filter((string) => shape[string] !== null);
				const offsets = strumOffsets(strings, bpm, stroke);
				strings.forEach((string, i) => {
					events.push({
						time: time + offsets[i],
						stop,
						string,
						fret: /** @type {number} */ (shape[string]) + capo,
						chord,
						part: 'strum',
						levelDb: levelDb.strum + STROKE_DB[stroke.direction] + accentDb(beat),
						fadeOut: CHORD_CHANGE_FADE,
						accent: accent(beat)
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
		const mute = mutes.find((at) => at > event.time && at < event.stop);
		if (mute !== undefined) {
			event.stop = mute;
			event.fadeOut = MUTE_FADE;
		}
	});

	if (loop) events = events.filter((event) => event.time < kept * passLength);

	return { events, duration: loop ? kept * passLength : end };
}
