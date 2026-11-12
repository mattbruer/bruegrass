/**
 * A beat dragged by hand, moved onto the hit it was meant for: the
 * strongest onset near it. With nothing clear near it (a held note, a
 * rest), it stays where it was dropped.
 */
import { frameAt, secondsAt } from './analyseRecording.js';

/** How far either side of the drop to look. */
const REACH_SECONDS = 0.05;
/** An onset weaker than this (in the onsets' own spread) isn't worth snapping to. */
const CLEAR_ONSET = 1.5;

/**
 * @param {number} seconds where the beat was dropped
 * @param {import('./analyseRecording.js').Analysis} analysis
 * @returns {number}
 */
export function snapToHit(seconds, analysis) {
	const { strength } = analysis;
	const from = Math.max(0, frameAt(analysis, seconds - REACH_SECONDS));
	const to = Math.min(strength.length - 1, frameAt(analysis, seconds + REACH_SECONDS));
	let best = -1;
	for (let frame = from; frame <= to; frame++) {
		if (strength[frame] >= CLEAR_ONSET && (best === -1 || strength[frame] > strength[best]))
			best = frame;
	}
	if (best === -1) return seconds;
	return Math.round(secondsAt(analysis, best) * 1000) / 1000;
}
