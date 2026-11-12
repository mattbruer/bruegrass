/**
 * The song's usual time between beats: the gap at which the onset strength
 * most often repeats (autocorrelation), leaning towards a likely tempo,
 * since a song also repeats at twice and half its beat.
 */

const SLOWEST_BPM = 40;
const FASTEST_BPM = 360;
/** The tempo guesses lean towards. */
const LIKELY_BPM = 200;
/** How wide the lean is, in octaves (doublings) either side. */
const LEAN_OCTAVES = 1;

/**
 * @param {Float32Array} strength from analyseRecording
 * @param {number} framesPerSecond
 * @returns {number} frames between beats (not a whole number)
 */
export function estimateBeatFrames(strength, framesPerSecond) {
	const shortest = Math.floor((60 / FASTEST_BPM) * framesPerSecond);
	const longest = Math.ceil((60 / SLOWEST_BPM) * framesPerSecond);
	const likely = (60 / LIKELY_BPM) * framesPerSecond;

	const scores = new Float64Array(longest + 2);
	for (let lag = shortest; lag <= longest + 1; lag++) {
		const lean = Math.exp(-0.5 * (Math.log2(lag / likely) / LEAN_OCTAVES) ** 2);
		scores[lag] = lean * repetition(strength, lag);
	}

	let best = shortest;
	for (let lag = shortest; lag <= longest; lag++) if (scores[lag] > scores[best]) best = lag;
	return best + peakOffset(scores[best - 1], scores[best], scores[best + 1]);
}

/**
 * @param {Float32Array} values
 * @param {number} lag
 */
function repetition(values, lag) {
	let sum = 0;
	for (let i = lag; i < values.length; i++) sum += values[i] * values[i - lag];
	return sum / Math.max(1, values.length - lag);
}

/**
 * Where the true peak sits between three samples (−0.5 to 0.5), from a parabola through them.
 * @param {number} before
 * @param {number} at
 * @param {number} after
 */
function peakOffset(before, at, after) {
	const curve = before - 2 * at + after;
	return curve < 0 ? (0.5 * (before - after)) / curve : 0;
}
