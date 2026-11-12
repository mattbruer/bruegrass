/**
 * Find a recording's beats, counted the way the arranger's chart counts
 * bluegrass: every strum is a beat (boom on one, chuck on the next), so a
 * 4/4 bar is boom-chuck-boom-chuck.
 *
 * The usual gap comes from how the hits repeat (estimateTempo.js), then the
 * beats are tracked (trackBeats.js). A song repeats at twice and half its
 * beat too, and fast bluegrass is easily counted on every other strum; so
 * when there's still a strong hit halfway between most of the beats found,
 * they're tracked again at half the gap.
 */
import { estimateBeatFrames } from './estimateTempo.js';
import { trackBeats } from './trackBeats.js';
import { secondsAt } from './analyseRecording.js';

/** Hits halfway between beats this strong (against the hits on them) mean a beat was missed in between. */
const HALFWAY_HITS_MEAN_DOUBLE = 0.4;
/** Never count faster than this. */
const FASTEST_BPM = 360;

/**
 * @param {import('./analyseRecording.js').Analysis} analysis
 * @returns {number[]} seconds into the recording, in order
 */
export function detectBeats(analysis) {
	const { strength, framesPerSecond } = analysis;
	if (strength.length === 0) return [];
	const beatFrames = estimateBeatFrames(strength, framesPerSecond);
	let frames = trackBeats(strength, beatFrames);

	const shortest = (60 / FASTEST_BPM) * framesPerSecond;
	if (halfwayHits(strength, frames) > HALFWAY_HITS_MEAN_DOUBLE && beatFrames / 2 >= shortest)
		frames = trackBeats(strength, beatFrames / 2);

	return frames.map((frame) => Math.round(secondsAt(analysis, frame) * 1000) / 1000);
}

/**
 * How strong the hits halfway between beats are, against the hits on them.
 * @param {Float32Array} strength
 * @param {number[]} frames beats
 */
export function halfwayHits(strength, frames) {
	let on = 0;
	let halfway = 0;
	for (let i = 1; i < frames.length; i++) {
		on += peakNear(strength, frames[i]);
		halfway += peakNear(strength, Math.round((frames[i] + frames[i - 1]) / 2));
	}
	return on > 0 ? halfway / on : 0;
}

/**
 * @param {Float32Array} values
 * @param {number} frame
 */
function peakNear(values, frame) {
	let peak = 0;
	for (let i = Math.max(0, frame - 2); i <= Math.min(values.length - 1, frame + 2); i++) {
		peak = Math.max(peak, values[i]);
	}
	return peak;
}
