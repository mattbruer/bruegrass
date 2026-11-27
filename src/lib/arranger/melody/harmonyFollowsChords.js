/**
 * Generated lines following a chord edit: only the bars whose chords
 * changed are written again, in each line's own style; every other bar
 * stays as it is. A bar whose chord was taken away (N.C.) keeps its notes
 * until it gets a chord again (the user's call, 2026-11-27).
 *
 * A generated line's bars line up with its lead's one for one, so a bar is
 * found by the lead's notes in it: when each first plays, and the chord
 * under it then.
 */
import { firstSoundings } from './harmony/writeHarmonies.js';
import { generatedParts, withPartsWritten } from './harmony/generatedParts.js';
import { voiceChannels } from './harmony/partChannels.js';
import { withPartBars } from './roll/freshHarmonyBars.js';
import { readScore } from './roll/readScore.js';

/** @typedef {import('./harmony/writeHarmonies.js').ChordAt} ChordAt */

/**
 * @param {string} abc
 * @param {(abc: string) => any} parse abcjs parseOnly, first tune
 * @param {ChordAt} chordBefore the band's concert chords before the edit
 * @param {ChordAt} chordNow and after it
 * @returns {string}
 */
export function withHarmonyFollowingChords(abc, parse, chordBefore, chordNow) {
	const leads = [...new Set(generatedParts(abc).map((part) => part.lead))];
	return leads.reduce((text, lead) => {
		const tune = parse(text);
		if (!tune) return text;
		const bars = barsWithNewChords(text, tune, lead, chordBefore, chordNow);
		if (bars.size === 0) return text;
		const parts = generatedParts(text).filter((part) => part.lead === lead);
		const fresh = withPartsWritten(text, tune, chordNow, parts);
		const ids = parts.map((part) => part.id);
		return withPartBars(text, fresh, parse, ids, bars);
	}, abc);
}

/**
 * The lead's written bars whose chords changed to other chords (not to N.C.).
 * @param {string} abc
 * @param {any} tune
 * @param {string} lead
 * @param {ChordAt} chordBefore
 * @param {ChordAt} chordNow
 * @returns {Set<number>}
 */
function barsWithNewChords(abc, tune, lead, chordBefore, chordNow) {
	const voice = voiceChannels(tune).indexOf(lead);
	if (voice < 0) return new Set();
	const times = [...firstSoundings(tune)].map(([startChar, { time }]) => ({ startChar, time }));
	const bars = readScore(abc, tune, voice).score.bars.flatMap((bar, index) => {
		const { from, to } = bar;
		if (from == null || to == null) return [];
		const changed = times
			.filter(({ startChar }) => startChar >= from && startChar < to)
			.filter(({ time }) => chordBefore(time) !== chordNow(time));
		const toChords = changed.length > 0 && changed.every(({ time }) => chordNow(time) !== null);
		return toChords ? [index] : [];
	});
	return new Set(bars);
}
