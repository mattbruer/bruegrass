/**
 * Tempo automation, like Logic's tempo track: bar 1 starts at the song's
 * tempo, and points on a lane bend it, the tempo moving in a straight
 * line from one to the next and holding after the last. With no points
 * the song keeps its tempo.
 *
 * A point says how fast as a share of the song's tempo (0.7 = 70%), so the
 * Tempo control still speeds the whole song up or down and a ritard keeps
 * its shape. Points sit on the song as played: quarters from bar 1.
 *
 * The clock turns the song's time (quarters) into seconds and back. Each
 * stretch between two points is worked out exactly, as the time it takes
 * to cover those quarters while the tempo ramps (a logarithm), so nothing
 * drifts however long it loops.
 */
import { secondsPerQuarter } from './tempo.js';

/**
 * @typedef {{ at: number, share: number }} TempoPoint
 *   at: quarters from bar 1, as played; share: times the song's tempo
 * @typedef {{
 *   passQuarters: number,
 *   passSeconds: number,
 *   secondsAt: (quarters: number) => number,
 *   quartersAt: (seconds: number) => number
 * }} TempoClock
 *   from the top of a pass, looping every passQuarters (passSeconds);
 *   before it (a pickup), at the pass's opening tempo
 */

/** Where every curve starts: bar 1, at the song's tempo. */
const BAR_ONE = { at: 0, share: 1 };

/**
 * How fast the song goes here, as a share of its tempo.
 * @param {TempoPoint[]} points sorted by `at`
 * @param {number} quarters
 */
export function shareAt(points, quarters) {
	const line = [BAR_ONE, ...points];
	const after = line.findIndex((point) => point.at > quarters);
	if (after === 0) return BAR_ONE.share;
	if (after === -1) return line[line.length - 1].share;
	const from = line[after - 1];
	const to = line[after];
	return from.share + ((to.share - from.share) * (quarters - from.at)) / (to.at - from.at);
}

/**
 * The clock for playing `passQuarters` of the song from `from` (a loop
 * region starts part way in), at `bpm` bent by the points.
 * @param {TempoPoint[]} points
 * @param {number} bpm
 * @param {number} passQuarters
 * @param {number} [from] where the pass starts in the song, in quarters
 * @returns {TempoClock}
 */
export function tempoClock(points, bpm, passQuarters, from = 0) {
	const quarter = secondsPerQuarter(bpm);
	const stretches = stretchesOf(points, passQuarters, from).map(
		({ start, end, opening, closing }) => ({
			start,
			end,
			opening,
			slope: (closing - opening) / (end - start)
		})
	);
	let seconds = 0;
	const timed = stretches.map((stretch) => {
		const startSeconds = seconds;
		seconds += secondsInto(stretch, stretch.end, quarter);
		return { ...stretch, startSeconds };
	});
	const passSeconds = seconds;
	const opening = timed[0]?.opening ?? 1;

	/** @param {number} inPass quarters, 0 to passQuarters */
	function secondsInPass(inPass) {
		const stretch = timed.findLast((each) => each.start <= inPass) ?? timed[0];
		return stretch.startSeconds + secondsInto(stretch, inPass, quarter);
	}

	/** @param {number} inPass seconds, 0 to passSeconds */
	function quartersInPass(inPass) {
		const stretch = timed.findLast((each) => each.startSeconds <= inPass) ?? timed[0];
		return quartersInto(stretch, inPass - stretch.startSeconds, quarter);
	}

	return {
		passQuarters,
		passSeconds,
		secondsAt(quarters) {
			if (quarters < 0 || passQuarters <= 0) return (quarters * quarter) / opening;
			const pass = Math.floor(quarters / passQuarters);
			return pass * passSeconds + secondsInPass(quarters - pass * passQuarters);
		},
		quartersAt(seconds) {
			if (seconds < 0 || passSeconds <= 0) return (seconds * opening) / quarter;
			const pass = Math.floor(seconds / passSeconds);
			return pass * passQuarters + quartersInPass(seconds - pass * passSeconds);
		}
	};
}

/**
 * The pass cut into straight stretches of tempo, with no points one stretch
 * at the song's own tempo.
 * @param {TempoPoint[]} points
 * @param {number} passQuarters
 * @param {number} from
 */
function stretchesOf(points, passQuarters, from) {
	const inside = points.map((point) => point.at - from).filter((at) => at > 0 && at < passQuarters);
	const edges = [0, ...inside, passQuarters];
	return edges.slice(1).map((end, i) => ({
		start: edges[i],
		end,
		opening: shareAt(points, edges[i] + from),
		closing: shareAt(points, end + from)
	}));
}

/**
 * Seconds from a stretch's start to `quarters` in it, the tempo ramping
 * from `opening` by `slope` per quarter.
 * @param {{ start: number, opening: number, slope: number }} stretch
 * @param {number} quarters
 * @param {number} quarter seconds per quarter at the song's tempo
 */
function secondsInto({ start, opening, slope }, quarters, quarter) {
	const covered = quarters - start;
	if (Math.abs(slope) < 1e-12) return (covered * quarter) / opening;
	return (quarter / slope) * Math.log((opening + slope * covered) / opening);
}

/**
 * The other way: quarters into a stretch after `seconds`.
 * @param {{ start: number, opening: number, slope: number }} stretch
 * @param {number} seconds
 * @param {number} quarter
 */
function quartersInto({ start, opening, slope }, seconds, quarter) {
	if (Math.abs(slope) < 1e-12) return start + (seconds * opening) / quarter;
	return start + (opening * (Math.exp((seconds * slope) / quarter) - 1)) / slope;
}

/**
 * Whatever was saved, as usable points: moving forward, in order, one per place.
 * @param {unknown} saved
 * @returns {TempoPoint[]}
 */
export function validTempoCurve(saved) {
	if (!Array.isArray(saved)) return [];
	const points = saved
		.filter(
			(point) =>
				Number.isFinite(point?.at) &&
				Number.isFinite(point?.share) &&
				point.at >= 0 &&
				point.share > 0
		)
		.map(({ at, share }) => ({ at, share }))
		.sort((a, b) => a.at - b.at);
	return points.filter((point, i) => i === 0 || point.at !== points[i - 1].at);
}
