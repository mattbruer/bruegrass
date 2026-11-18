/**
 * How fast a lock-in's phase turns, from the last stretch of its readings:
 * a least-squares line through the phase (unwrapped) against time. Its
 * slope ÷ 2π is how many Hz the partial is off the reference. Fitting a
 * line through many readings is what makes the cents steady.
 */

/** @param {number} seconds how much of the past the line is fitted through */
export function createPhaseSlope(seconds) {
	/** @type {{ time: number, phase: number }[]} */
	let points = [];
	let strengthSum = 0;

	return {
		/** @param {number} time seconds @param {number} phase radians @param {number} strength */
		add(time, phase, strength) {
			const last = points.at(-1);
			const unwrapped = last ? last.phase + wrap(phase - last.phase) : phase;
			points.push({ time, phase: unwrapped });
			strengthSum += strength;
			while (points.length > 2 && time - points[0].time > seconds) points.shift();
		},

		/** Seconds of readings the line goes through. */
		get span() {
			return points.length > 1 ? points.at(-1).time - points[0].time : 0;
		},

		/** The mean strength since the last restart (how loud this partial is). */
		get strength() {
			return points.length ? strengthSum / points.length : 0;
		},

		/** Hz above the reference (negative: below). */
		hzOff() {
			return slope(points) / (2 * Math.PI);
		},

		restart() {
			points = [];
			strengthSum = 0;
		}
	};
}

/** @param {{ time: number, phase: number }[]} points */
function slope(points) {
	const n = points.length;
	if (n < 2) return 0;
	let meanTime = 0;
	let meanPhase = 0;
	for (const p of points) {
		meanTime += p.time / n;
		meanPhase += p.phase / n;
	}
	let across = 0;
	let spread = 0;
	for (const p of points) {
		across += (p.time - meanTime) * (p.phase - meanPhase);
		spread += (p.time - meanTime) ** 2;
	}
	return spread > 0 ? across / spread : 0;
}

/** An angle brought into −π…π. @param {number} angle */
function wrap(angle) {
	return angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
}
