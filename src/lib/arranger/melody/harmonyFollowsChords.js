/**
 * After the chart's chords change, the harmony parts follow them only where
 * they must: a bar whose melody notes now sound over a different chord is
 * written fresh in every part (harmony/writeHarmonies.js); every other bar
 * keeps the part as it is, hand edits included. Comparing the chord under
 * each note, not the chart's bars, means a bar added to the chart before
 * the tune (which moves later notes onto other chords) is followed too.
 */
import { firstSoundings, harmonyPartsIn, withHarmonies } from './harmony/writeHarmonies.js';
import { partBlockText } from './harmony/keepParts.js';
import { withPartBars } from './roll/freshHarmonyBars.js';
import { readScore } from './roll/readScore.js';
import { chordBySound } from '../chart/chordBySound.js';

/**
 * @typedef {import('./harmony/writeHarmonies.js').ChordAt} ChordAt
 */

/**
 * @param {string} abc the tune, its harmony parts written for the old chords
 * @param {(abc: string) => any} parse abcjs parseOnly, first tune
 * @param {ChordAt} chordBefore the band's concert chord at a time, before the edit
 * @param {ChordAt} chordNow the same, now
 * @returns {{ abc: string, parts: string[] }} parts: the ids of the parts that changed
 */
export function harmonyFollowingChords(abc, parse, chordBefore, chordNow) {
	const unchanged = { abc, parts: [] };
	const partIds = harmonyPartsIn(abc);
	if (partIds.length === 0) return unchanged;
	const tune = parse(abc);
	if (!tune) return unchanged;

	const bars = barsOnNewChords(abc, tune, chordBefore, chordNow);
	if (bars.size === 0) return unchanged;
	const fresh = withHarmonies(abc, tune, chordNow, partIds).abc;
	const followed = withPartBars(abc, fresh, parse, partIds, bars);
	const parts = partIds.filter((id) => partBlockText(followed, id) !== partBlockText(abc, id));
	return { abc: followed, parts };
}

/**
 * The melody's bars (as written, readScore's numbering) with a note that
 * first sounds over a different chord than it did.
 * @param {string} abc
 * @param {any} tune
 * @param {ChordAt} chordBefore
 * @param {ChordAt} chordNow
 * @returns {Set<number>}
 */
function barsOnNewChords(abc, tune, chordBefore, chordNow) {
	const sameChord = (/** @type {number} */ time) =>
		soundOf(chordBefore(time)) === soundOf(chordNow(time));
	const notes = [...firstSoundings(tune)];
	const bars = readScore(abc, tune, 0).score.bars;
	const changed = new Set();
	bars.forEach(({ from, to }, index) => {
		if (from === null || to === null) return;
		const inBar = notes.filter(([char]) => char >= from && char < to);
		if (inBar.some(([, { time }]) => !sameChord(time))) changed.add(index);
	});
	return changed;
}

/** @param {string | null} name */
function soundOf(name) {
	return name === null ? '' : chordBySound(name);
}
