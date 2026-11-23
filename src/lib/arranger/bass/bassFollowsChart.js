/**
 * After the chart changes, an edited bass line follows it only where it
 * must: a bar whose chords (or length) changed is written fresh from the
 * band's own line; every other bar keeps its notes, hand edits included.
 * Bars are matched in order like a text diff (matchBars.js), so adding or
 * removing a bar anywhere leaves the others' edits where they were.
 */
import { matchBars } from './matchBars.js';
import { chordBySound } from '../chart/chordBySound.js';

/**
 * @typedef {import('../melody/roll/readScore.js').Score} Score
 */

/**
 * @param {string} written the edited bass line
 * @param {Score} old that line, read
 * @param {string} fresh the band's own line for the chart as it is now (bassAbc.js)
 * @param {Score} neu that line, read
 * @returns {string} the written line unchanged when every bar still fits
 */
export function bassFollowingChart(written, old, fresh, neu) {
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
		.map((chord) => `${chord.at - bar.start}:${chordBySound(chord.name)}`)
		.join(' ');
}
