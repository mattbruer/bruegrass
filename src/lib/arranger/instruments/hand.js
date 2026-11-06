/*
 * The strumming hand's feel. A player never hits two strokes exactly alike:
 * how hard they hit wanders slowly (a drift over a few strokes) with a
 * little scatter on top. One hidden force per stroke then sets everything
 * the stroke does: every string in it louder or softer together, brighter
 * when harder, a faster sweep across the strings when harder, and the
 * stroke a few milliseconds early or late.
 */
const DRIFT_STEP_DB = 0.5; // how far the force wanders from one stroke to the next
const DRIFT_PULL = 0.9; // how strongly it's pulled back to normal (1 = never)
const SCATTER_DB = 0.8; // stroke-to-stroke scatter on top of the drift
const TIMING_MS = 4; // typical early/late, in milliseconds
const SPREAD_HALVING_DB = 12; // this much harder sweeps the strings twice as fast
const DB_PER_OCTAVE_BRIGHTER = 6; // this much harder opens the tone an octave
const MOST_SPREADS = 2.5; // nothing strays further than this many typical amounts

/**
 * @typedef {{ forceDb: number, delay: number, spread: number }} StrokeFeel
 *   forceDb: louder (+) or softer (−) than written; delay: seconds late (+)
 *   or early (−); spread: how long the sweep takes, × the normal time
 */

/**
 * A hand whose feel carries from stroke to stroke.
 * @param {() => number} random floats in [0, 1)
 * @returns {() => StrokeFeel} the next stroke's feel
 */
export function createHand(random) {
	const bell = () => normal(random);
	let drift = 0;
	return () => {
		drift = drift * DRIFT_PULL + bell() * DRIFT_STEP_DB;
		const forceDb = drift + bell() * SCATTER_DB;
		return {
			forceDb,
			delay: (bell() * TIMING_MS) / 1000,
			spread: 2 ** (-forceDb / SPREAD_HALVING_DB)
		};
	};
}

/**
 * How much brighter a stroke of this force sounds, as a multiple of the
 * filter's usual cutoff.
 * @param {number} forceDb
 */
export function brightness(forceDb) {
	return 2 ** (forceDb / DB_PER_OCTAVE_BRIGHTER);
}

/**
 * A bell-curve random number (mean 0, typical size 1), with rare extremes cut off.
 * @param {() => number} random
 */
function normal(random) {
	const value = Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
	return Math.max(-MOST_SPREADS, Math.min(MOST_SPREADS, value));
}
