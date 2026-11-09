/**
 * The melody's ABC read as a score the piano roll can draw and edit: bars
 * as written (repeats not played out, so each bar is one place to edit),
 * notes, and the chord symbols. Times are ticks from the first written bar,
 * a pickup included (ticks.js).
 *
 * Each bar remembers where its notes are in the text, so an edit rewrites
 * only those characters and the rest (header, bar lines, repeats, words,
 * harmony parts) stays as typed. Things a rewrite would drop (ornaments,
 * grace notes, slurs, chords in the melody) make the score read-only.
 */
import { tuneKey } from '../harmony/abcPitch.js';
import { MELODY_CHANNEL, voiceChannels } from '../harmony/partChannels.js';
import { TICKS_PER_QUARTER, ticksOfWhole } from './ticks.js';

/**
 * @typedef {import('./editNotes.js').DrawnNote} DrawnNote
 * @typedef {{ num: number, den: number }} AbcMeter
 * @typedef {{ start: number, length: number, meter: AbcMeter, from: number | null, to: number | null }} ScoreBar
 *   start/length in ticks; from/to: where its notes are in the ABC (null: not written yet)
 * @typedef {{ at: number, name: string }} ScoreChord a chord symbol, at a tick
 * @typedef {{
 *   bars: ScoreBar[], notes: DrawnNote[], chords: ScoreChord[], unit: number,
 *   key: import('../../theory/musicInKey.js').Key
 * }} Score
 *   unit: ticks in the ABC's unit note length (L:); key: the key signature, for spelling
 */

/**
 * @param {string} abc
 * @param {any} tune abcjs's parse of this ABC, as written
 * @param {number} [voice] which voice: 0 the melody, then each harmony part
 * @returns {{ score: Score, problem: string }} problem: why it can't be
 *   edited here ('' when it can)
 */
export function readScore(abc, tune, voice = 0) {
	const problems = new Set();
	if (voiceChannels(tune).slice(1).includes(MELODY_CHANNEL)) problems.add('more than one voice');
	if (unitChanges(abc)) problems.add('a change of note length (L:)');

	const pitches = pitchesByChar(tune, voice);
	/** @type {ScoreBar[]} */
	const bars = [];
	/** @type {DrawnNote[]} */
	const notes = [];
	/** @type {ScoreChord[]} */
	const chords = [];
	let meter = meterOf(tune.getMeterFraction());
	let tick = 0;
	let triplet = 1;
	/** @type {ScoreBar | null} */
	let bar = null;
	let tiedOn = false;

	const endBar = () => {
		if (bar) bars.push(bar);
		bar = null;
	};

	for (const line of tune.lines) {
		for (const element of line.staff?.[voice]?.voices?.[0] ?? []) {
			if (element.el_type === 'bar') endBar();
			else if (element.el_type === 'meter') {
				if (bar) problems.add('a change inside a bar');
				meter = meterOf(element.value?.[0]);
			} else if (element.el_type === 'note') {
				for (const problem of unsupported(element)) problems.add(problem);
				if (element.startTriplet) triplet = element.tripletMultiplier ?? 1;
				const length = ticksOfWhole(element.duration * triplet);
				if (element.endTriplet) triplet = 1;
				if (length === 0) continue;

				bar ??= { start: tick, length: 0, meter, from: element.startChar, to: element.endChar };
				bar.length += length;
				bar.to = element.endChar;

				for (const chord of chordSymbols(element)) chords.push({ at: tick, name: chord });
				if (!element.rest) {
					const midi = pitches.get(element.startChar);
					const previous = notes.at(-1);
					if (midi === undefined && tiedOn && previous) previous.length += length;
					else if (midi !== undefined) notes.push({ midi, start: tick, length });
					tiedOn = Boolean(element.pitches?.[0]?.startTie);
				} else tiedOn = false;
				tick += length;
			}
		}
	}
	endBar();

	for (const each of bars) {
		if (abc.slice(each.from ?? 0, each.to ?? 0).includes('\n'))
			problems.add('a bar split over two lines');
	}

	return {
		score: {
			bars,
			notes,
			chords,
			unit: unitTicks(abc, meter),
			key: tuneKey(tune.getKeySignature())
		},
		problem: problems.size ? problemText([...problems]) : ''
	};
}

/**
 * The pitch abcjs plays for each written note, by where it starts in the
 * text (a tied note sounds once, from its first part).
 * @param {any} tune
 * @param {number} voice
 */
function pitchesByChar(tune, voice) {
	/** @type {Map<number, number>} */
	const pitches = new Map();
	const track = tune.setUpAudio({ chordsOff: true }).tracks[voice];
	for (const item of track ?? []) {
		if (item.cmd === 'note' && !pitches.has(item.startChar))
			pitches.set(item.startChar, item.pitch);
	}
	return pitches;
}

/** @param {any} element a note or rest */
function unsupported(element) {
	const problems = [];
	if (element.decoration?.length) problems.push('ornaments (like ~ or .)');
	if (element.gracenotes?.length) problems.push('grace notes');
	if ((element.pitches?.length ?? 0) > 1) problems.push('chords in the melody');
	if (
		element.pitches?.some((/** @type {any} */ p) => p.startSlur || p.endSlur) ||
		element.startSlur
	)
		problems.push('slurs');
	if (element.startTriplet && Math.abs((element.tripletMultiplier ?? 1) - 2 / 3) > 1e-6)
		problems.push('tuplets other than triplets');
	if (element.rest?.type === 'multimeasure') problems.push('rests of several bars');
	const text = (element.chord ?? []).filter((/** @type {any} */ c) => !isChordSymbol(c));
	if (text.length) problems.push('text above or below the notes');
	return problems;
}

/** @param {any} element */
function chordSymbols(element) {
	return (element.chord ?? []).filter(isChordSymbol).map((/** @type {any} */ c) => c.name);
}

/** @param {{ name: string, position?: string }} chord */
function isChordSymbol(chord) {
	return (!chord.position || chord.position === 'default') && /^[A-G][#b♭♯]?\S*$/.test(chord.name);
}

/** An L: field or inline [L:] after the header. */
function unitChanges(/** @type {string} */ abc) {
	const body = abc.slice(abc.search(/^K:/m) + 1);
	return /^L:|\[L:/m.test(body);
}

/**
 * Ticks in the tune's unit note length: its L:, else ABC's default (1/16
 * for meters under 3/4, 1/8 otherwise).
 * @param {string} abc
 * @param {AbcMeter} meter
 */
function unitTicks(abc, meter) {
	const field = abc.match(/^L:\s*(\d+)\s*\/\s*(\d+)/m);
	const whole = field
		? Number(field[1]) / Number(field[2])
		: meter.num / meter.den < 0.75
			? 1 / 16
			: 1 / 8;
	return Math.round(whole * 4 * TICKS_PER_QUARTER);
}

/** @param {any} value { num, den } as numbers or strings */
function meterOf(value) {
	const num = Number(value?.num);
	const den = Number(value?.den);
	return num && den ? { num, den } : { num: 4, den: 4 };
}

/** @param {string[]} problems */
function problemText(problems) {
	return `This tune has ${problems.join(', ')}, which the note editor can't keep yet. You can still change it in the ABC box.`;
}
