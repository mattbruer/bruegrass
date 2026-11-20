/**
 * A beat dragged by hand (or tapped along), moved onto the hit it was
 * meant for: the strongest onset near it. With nothing clear near it (a held note, a
 * rest), it stays where it was dropped.
 */
import { frameAt, secondsAt } from './analyseReference.js';

/** How far either side of the drop to look. */
const REACH_SECONDS = 0.05;
/** An onset weaker than this (in the onsets' own spread) isn't worth snapping to. */
const CLEAR_ONSET = 1.5;

/** A tap along with the music lands this much after the beat, at most (reaction time). */
const TAP_LATE_SECONDS = 0.35;

/**
 * @param {number} seconds where the beat was dropped
 * @param {import('./analyseReference.js').Analysis} analysis
 * @returns {number}
 */
export function snapToHit(seconds, analysis) {
	return strongestHitBetween(seconds - REACH_SECONDS, seconds + REACH_SECONDS, seconds, analysis);
}

/**
 * A beat tapped while the music plays, moved back onto the hit it was for:
 * a tap comes a little after the beat it means.
 * @param {number} seconds when the tap came
 * @param {import('./analyseReference.js').Analysis} analysis
 * @returns {number}
 */
export function tapToHit(seconds, analysis) {
	return strongestHitBetween(
		seconds - TAP_LATE_SECONDS,
		seconds + REACH_SECONDS,
		seconds,
		analysis
	);
}

/**
 * @param {number} start
 * @param {number} end
 * @param {number} otherwise where it stays with no clear hit between them
 * @param {import('./analyseReference.js').Analysis} analysis
 */
function strongestHitBetween(start, end, otherwise, analysis) {
	const seconds = otherwise;
	const { strength } = analysis;
	const from = Math.max(0, frameAt(analysis, start));
	const to = Math.min(strength.length - 1, frameAt(analysis, end));
	let best = -1;
	for (let frame = from; frame <= to; frame++) {
		if (strength[frame] >= CLEAR_ONSET && (best === -1 || strength[frame] > strength[best]))
			best = frame;
	}
	if (best === -1) return seconds;
	return Math.round(secondsAt(analysis, best) * 1000) / 1000;
}
