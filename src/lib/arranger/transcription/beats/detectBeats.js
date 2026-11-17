/**
 * Find a recording's beats, counted the way the arranger's chart counts
 * bluegrass: every strum is a beat (boom on one, chuck on the next), so a
 * 4/4 bar is boom-chuck-boom-chuck.
 *
 * ONE is placed by hand first: the beats are tracked through it, forward
 * and back, so it is a beat exactly. The beats before it are the lead-in
 * (a pickup, or an intro): up to a bar of them are kept.
 *
 * The usual gap comes from how the hits repeat (estimateTempo.js), then the
 * beats are tracked (trackBeats.js). Then tracked again, held to the tempo
 * of the bars around each moment (localTempo.js): a band drifts slowly but
 * doesn't jump, so a beat finder that loses its place in a busy passage is
 * carried through it by the steady beat either side. A song repeats at twice and half its
 * beat too, and fast bluegrass is easily counted on every other strum; so
 * when there's still a strong hit halfway between most of the beats found,
 * they're tracked again at half the gap.
 */
import { estimateBeatFrames } from './estimateTempo.js';
import { evenGaps, trackBeatsThrough } from './trackBeats.js';
import { localGaps } from './localTempo.js';
import { frameAt, secondsAt } from './analyseRecording.js';

/** Hits halfway between beats this strong (against the hits on them) mean a beat was missed in between. */
const HALFWAY_HITS_MEAN_DOUBLE = 0.4;
/** Never count faster than this. */
const FASTEST_BPM = 360;
/** How strictly the second run keeps to the local tempo (the first run's is trackBeats.js LOOSE). */
const STEADY = 400;

/**
 * @param {import('./analyseRecording.js').Analysis} analysis
 * @param {number} downbeat seconds into the recording: beat 1 of bar 1
 * @param {number} leadInBeats how many beats before it to keep
 * @returns {{ beats: number[], firstBeat: number }} beats in seconds, and the index of the downbeat
 */
export function detectBeats(analysis, downbeat, leadInBeats) {
	const { strength, framesPerSecond } = analysis;
	const anchor = Math.max(0, Math.min(strength.length - 1, frameAt(analysis, downbeat)));
	if (strength.length === 0) return { beats: [downbeat], firstBeat: 0 };
	const beatFrames = estimateBeatFrames(strength, framesPerSecond);
	const length = strength.length;
	let found = trackBeatsThrough(strength, evenGaps(length, beatFrames), anchor);

	const shortest = (60 / FASTEST_BPM) * framesPerSecond;
	if (halfwayHits(strength, found.frames) > HALFWAY_HITS_MEAN_DOUBLE && beatFrames / 2 >= shortest)
		found = trackBeatsThrough(strength, evenGaps(length, beatFrames / 2), anchor);

	found = trackBeatsThrough(strength, localGaps(found.frames, length), anchor, STEADY);

	const dropped = Math.max(0, found.anchorIndex - leadInBeats);
	const beats = found.frames
		.slice(dropped)
		.map((frame) => Math.round(secondsAt(analysis, frame) * 1000) / 1000);
	return { beats, firstBeat: found.anchorIndex - dropped };
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
