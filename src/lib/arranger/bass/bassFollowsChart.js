/**
 * After the chart changes, an edited bass line follows it only where it
 * must: a bar whose chords (or length) changed is written fresh from the
 * band's own line; every other bar keeps its notes, hand edits included.
 * Bars are matched in order like a text diff (matchBars.js), so adding or
 * removing a bar anywhere leaves the others' edits where they were.
 */
import { readScore } from '../melody/roll/readScore.js';
import { matchBars } from './matchBars.js';

/**
 * @typedef {import('../melody/roll/readScore.js').Score} Score
 */

/**
 * @param {string} written the edited bass line
 * @param {string} fresh the band's own line for the chart as it is now (bassAbc.js)
 * @param {(abc: string) => any} parse abcjs parseOnly, first tune
 * @returns {string} the written line unchanged when every bar still fits
 */
export function bassFollowingChart(written, fresh, parse) {
	const writtenTune = parse(written);
	const freshTune = parse(fresh);
	if (!writtenTune || !freshTune) return written;
	const old = readScore(written, writtenTune, 0).score;
	const neu = readScore(fresh, freshTune, 0).score;

	const matched = matchBars(barKeys(old), barKeys(neu));
	const unchanged =
		old.bars.length === neu.bars.length &&
		neu.bars.every((_, index) => matched.get(index) === index);
	if (unchanged) return written;

	// Start from the fresh line (the chart's shape now) and put the matched bars back
	let text = fresh;
	for (let index = neu.bars.length - 1; index >= 0; index--) {
		const bar = neu.bars[index];
		const before = old.bars[matched.get(index) ?? -1];
		if (!before || bar.from === null || bar.to === null) continue;
		if (before.from === null || before.to === null) continue;
		text = text.slice(0, bar.from) + written.slice(before.from, before.to) + text.slice(bar.to);
	}
	return text;
}

/**
 * What each bar is, to match bars across a change: its length, meter, and
 * chords at their places in it.
 * @param {Score} score
 */
function barKeys(score) {
	return score.bars.map(
		(bar) => `${bar.length} ${bar.meter.num}/${bar.meter.den} ${chordsIn(score, bar)}`
	);
}

/**
 * @param {Score} score
 * @param {import('../melody/roll/readScore.js').ScoreBar} bar
 */
function chordsIn(score, bar) {
	return score.chords
		.filter((chord) => chord.at >= bar.start && chord.at < bar.start + bar.length)
		.map((chord) => `${chord.at - bar.start}:${bySound(chord.name)}`)
		.join(' ');
}

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SIGNS = { '#': 1, '♯': 1, b: -1, '♭': -1 };

/**
 * A chord name with its notes as pitch classes, so F# and Gb (as a capo
 * move may spell them) count as the same chord.
 * @param {string} name e.g. "F#m7/C#"
 */
function bySound(name) {
	return name.replace(/(^|\/)([A-G])([#♯b♭]?)/g, (_, slash, letter, sign) => {
		const pc = (LETTERS[/** @type {keyof LETTERS} */ (letter)] + (SIGNS[sign] ?? 0) + 12) % 12;
		return `${slash}${pc}`;
	});
}
