/**
 * Melody: a tune written in ABC notation (parsed by abcjs), played on the
 * guitar samples alongside the arrangement.
 *
 * The two are written separately and only meet in time: both count quarter
 * notes from the first downbeat. The melody's bar 1 starts with the
 * arrangement's bar 1, at the arranger's tempo (the ABC's Q: is ignored),
 * and it loops with the arrangement. A pickup (anacrusis) plays before the
 * band comes in, and again at the end of each pass, leading back to the top.
 * If the two don't add up to the same length they still start together; the
 * melody is cut at the end of each pass, or leaves a gap.
 */
import { MAX_FRET, midiNote } from '../instruments/guitar.js';
import { rhythm } from '../chart/timeline.js';

/*
 * Register. Guitar music is written an octave above where it sounds, so a
 * fiddle tune's G (G4 in ABC) is played on the open G string (G3).
 */
const MELODY_OCTAVE = -12;
const LOWEST = midiNote(0, 0); // open low E
const HIGHEST_SAMPLE = midiNote(5, MAX_FRET); // high e, 12th fret
/** Above the highest sample, notes are resampled up from it (at most this far, then an octave down). */
const MAX_RESAMPLE = 7;

/*
 * Left hand. The hand sits in a position covering HAND_SPAN frets (index
 * finger on `hand`) and plays each note on whichever string needs the least
 * shifting, staying low on the neck when it can. Open strings are always
 * in reach, as in bluegrass melody playing.
 */
const HOME_FRET = 1; // first position
const HAND_SPAN = 4; // frets under the fingers without shifting
const SHIFT_COST = 1; // per fret the hand moves
const HEIGHT_COST = 0.1; // per fret up the neck, so low positions win ties
const OPEN_STRING_COST = 0.3;

/* Touch */
const MELODY_LEVEL_DB = -2;
const ACCENT_VELOCITY = 105; // abcjs's downbeat velocity: plays at MELODY_LEVEL_DB
const VELOCITY_DEPTH = 1; // 1 = follow abcjs's accents as written, 0 = all even
const GATE = 0.95; // fraction of its written length a note rings (unless its string is needed)

/**
 * @typedef {{ time: number, length: number, pitch: number, volume: number }} MelodyNote
 *   time/length in quarter notes from bar 1's downbeat (pickup notes are
 *   negative); pitch is MIDI as written (60 = middle C); volume 0–127
 * @typedef {{ notes: MelodyNote[], pickup: number, length: number }} Melody
 *   pickup: quarters before bar 1; length: quarters from bar 1 to the last note's end
 * @typedef {{ time: number, stop: number, string: number, fret: number, rate: number, levelDb: number }} MelodyEvent
 *   seconds; rate: playback rate for notes above the highest sample
 * @typedef {{ events: MelodyEvent[], intro: MelodyEvent[], leadIn: number, period: number }} MelodyPart
 *   events: one pass, 0 ≤ time < period, sorted; intro: the pickup before
 *   the first pass (negative times); leadIn: seconds the band waits for it
 */

/**
 * The melody of a tune parsed by abcjs (renderAbc or parseOnly), with
 * repeats and endings played out. Every voice is included, so harmony
 * lines play too; chord symbols are left to the arrangement.
 * @param {import('abcjs').TuneObject} tune
 * @returns {Melody}
 */
export function melodyFromTune(tune) {
	const audio = tune.setUpAudio({ chordsOff: true });
	/** @type {(MelodyNote & { startChar: number })[]} */
	const raw = audio.tracks.flatMap((track) =>
		track.flatMap((item) =>
			item.cmd === 'note'
				? [
						{
							time: item.start * 4,
							length: item.duration * 4,
							pitch: item.pitch,
							volume: item.volume,
							startChar: item.startChar
						}
					]
				: []
		)
	);
	const pickup = pickupLength(tune, raw);
	const notes = raw
		.map(({ time, length, pitch, volume }) => ({ time: time - pickup, length, pitch, volume }))
		.sort((a, b) => a.time - b.time || a.pitch - b.pitch);
	const length = Math.max(0, ...notes.map((note) => note.time + note.length));
	return { notes, pickup, length };
}

/**
 * Quarters of music before the first bar line, when that's less than a full
 * bar. (abcjs's own getPickupLength misses a pickup written after a `|:`.)
 * @param {import('abcjs').TuneObject} tune
 * @param {{ time: number, startChar: number }[]} notes
 */
function pickupLength(tune, notes) {
	const firstBar = firstBarLine(tune);
	if (firstBar === null) return 0;
	const after = notes.filter((note) => note.startChar >= firstBar).map((note) => note.time);
	if (after.length === 0) return 0;
	const pickup = Math.min(...after);
	const meter = tune.getMeterFraction();
	const bar = meter.den ? (meter.num * 4) / meter.den : 4;
	return pickup > 0 && pickup < bar - 1e-9 ? pickup : 0;
}

/**
 * Where (as a character in the ABC) the first bar line after some music is.
 * @param {import('abcjs').TuneObject} tune
 * @returns {number | null}
 */
function firstBarLine(tune) {
	let music = false;
	for (const line of tune.lines) {
		for (const item of line.staff?.[0]?.voices?.[0] ?? []) {
			if (item.el_type === 'note') music = true;
			else if (item.el_type === 'bar' && music) return item.startChar;
		}
	}
	return null;
}

/**
 * Turn the melody into guitar notes for one pass of the arrangement (or of
 * a loop region within it).
 * @param {Melody} melody
 * @param {{
 *   sections: import('../chart/timeline.js').Section[], offset?: number, bpm?: number, shift?: number,
 *   loop?: boolean
 * }} options sections: what's playing; offset: quarters of the full
 *   arrangement before it (for a loop region); shift: semitones to move
 *   the melody. ABC is written at concert pitch, so this is the Key
 *   setting's transposition only: the capo just lets the guitar's shapes
 *   reach the concert key the tune is already in; loop: repeat the pickup
 *   at the end of the pass, leading back to the top (off for a single pass
 *   that just ends, like the MIDI export)
 * @returns {MelodyPart}
 */
export function melodyEvents(melody, { sections, offset = 0, bpm = 120, shift = 0, loop = true }) {
	const { quarters } = rhythm(sections);
	const quarter = 60 / bpm;
	const period = quarters * quarter;
	// The pickup leads into bar 1, so it belongs only to a pass that starts there
	const from = offset === 0 ? -melody.pickup : 0;

	const notes = melody.notes
		.map((note) => ({ ...note, time: note.time - offset }))
		.filter((note) => note.time >= from - 1e-9 && note.time < quarters - 1e-9)
		.map((note) => ({ ...note, length: Math.min(note.length, quarters - note.time) }));

	const fingered = finger(notes, shift);
	/** @type {MelodyEvent[]} */
	const all = notes.map((note, i) => ({
		time: note.time * quarter,
		stop: (note.time + note.length * GATE) * quarter,
		...fingered[i],
		levelDb:
			MELODY_LEVEL_DB + VELOCITY_DEPTH * 20 * Math.log10(Math.max(1, note.volume) / ACCENT_VELOCITY)
	}));
	cutOnStringReuse(all);

	const intro = all.filter((event) => event.time < 0);
	const wrapped = (loop ? intro : []).map((event) => ({
		...event,
		time: event.time + period,
		stop: event.stop + period
	}));
	const events = [...all.filter((event) => event.time >= 0), ...wrapped].sort(
		(a, b) => a.time - b.time
	);
	cutOnStringReuse(events);

	return { events, intro, leadIn: intro.length > 0 ? -intro[0].time : 0, period };
}

/**
 * The true pitch (MIDI, 60 = middle C) a melody note sounds at.
 * @param {MelodyEvent} event
 */
export function melodyPitch(event) {
	return midiNote(event.string, event.fret) + Math.round(12 * Math.log2(event.rate));
}

/**
 * Pick a string and fret for each note (sorted by time), keeping the hand
 * near where it is and giving notes that sound together different strings.
 * @param {MelodyNote[]} notes
 * @param {number} shift semitones
 * @returns {{ string: number, fret: number, rate: number }[]}
 */
export function finger(notes, shift) {
	let hand = HOME_FRET;
	/** @type {{ time: number, strings: Set<number> }} */
	let chord = { time: NaN, strings: new Set() };

	return notes.map((note) => {
		if (note.time !== chord.time) chord = { time: note.time, strings: new Set() };
		let pitch = note.pitch + MELODY_OCTAVE + shift;
		while (pitch < LOWEST) pitch += 12;
		while (pitch > HIGHEST_SAMPLE + MAX_RESAMPLE) pitch -= 12;

		if (pitch > HIGHEST_SAMPLE) {
			chord.strings.add(5);
			return { string: 5, fret: MAX_FRET, rate: 2 ** ((pitch - HIGHEST_SAMPLE) / 12) };
		}

		let best = null;
		for (let string = 0; string < 6; string++) {
			const fret = pitch - midiNote(string, 0);
			if (fret < 0 || fret > MAX_FRET || chord.strings.has(string)) continue;
			const cost =
				fret === 0 ? OPEN_STRING_COST : SHIFT_COST * reach(hand, fret) + HEIGHT_COST * fret;
			if (!best || cost < best.cost) best = { string, fret, cost };
		}
		// Every string is taken by the chord: double up on the nearest one
		if (!best) {
			const string = [5, 4, 3, 2, 1, 0].find((s) => pitch - midiNote(s, 0) >= 0) ?? 0;
			best = { string, fret: Math.min(MAX_FRET, pitch - midiNote(string, 0)), cost: 0 };
		}
		// Shift only as far as needed to bring the fret under a finger
		if (best.fret > 0 && best.fret < hand) hand = best.fret;
		if (best.fret >= hand + HAND_SPAN) hand = best.fret - HAND_SPAN + 1;
		chord.strings.add(best.string);
		return { string: best.string, fret: best.fret, rate: 1 };
	});
}

/**
 * How many frets the hand must move for a finger to reach `fret`.
 * @param {number} hand index finger's fret
 * @param {number} fret
 */
function reach(hand, fret) {
	if (fret < hand) return hand - fret;
	if (fret >= hand + HAND_SPAN) return fret - (hand + HAND_SPAN - 1);
	return 0;
}

/**
 * A string playing again cuts off its previous note.
 * @param {MelodyEvent[]} events sorted by time
 */
function cutOnStringReuse(events) {
	events.forEach((event, i) => {
		const next = events
			.slice(i + 1)
			.find((other) => other.string === event.string && other.time > event.time);
		if (next) event.stop = Math.min(event.stop, next.time);
	});
}

/**
 * How the melody lines up with what the arrangement plays, in quarter
 * notes, for a gentle warning when they don't match.
 * @param {Melody} melody
 * @param {number} quarters length of one pass of the full arrangement
 * @returns {{ extra: number, missing: number }} extra: melody past the end
 *   (cut off); missing: arrangement left without melody at the end
 */
export function melodyFit(melody, quarters) {
	const over = melody.length - quarters;
	return { extra: over > 1e-9 ? over : 0, missing: over < -1e-9 ? -over : 0 };
}
