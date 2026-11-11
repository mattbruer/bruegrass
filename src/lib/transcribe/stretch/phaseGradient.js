/**
 * Phase gradient heap integration (Průša & Holighaus, "Phase vocoder done
 * right", 2017): picks each output frame's phases so that every bin turns at
 * its measured frequency from one frame to the next (along time), and stays
 * in step with its neighbours where a note starts (along frequency). The
 * loudest bins are settled first and pass their phase on to quieter ones,
 * which keeps sustained notes clean and attacks sharp.
 *
 * Per frame, for bins 0..bins-1:
 * - magnitude
 * - frequency: how fast the bin's phase turns, in radians per sample
 * - phaseSlope: how its phase changes from one bin to the next (radians per
 *   bin), which says where in the frame its energy sits
 */
import { createMaxHeap } from './maxHeap.js';

/** @param {number} bins */
export function createPhaseGradient(bins) {
	const phase = new Float64Array(bins);
	const previousPhase = new Float64Array(bins);
	const previousFrequency = new Float64Array(bins);
	const previousMagnitude = new Float64Array(bins);
	const settled = new Uint8Array(bins);
	// ids 0..bins-1 are this frame's bins, bins..2*bins-1 last frame's
	const heap = createMaxHeap(bins * 2);

	/**
	 * Phases for the next output frame, `hop` output samples after the last.
	 * Bins quieter than `tolerance` × the loudest just follow their frequency.
	 * @param {{ magnitude: Float64Array, frequency: Float64Array, phaseSlope: Float64Array, hop: number, tolerance: number }} frame
	 * @returns {Float64Array} owned by the integrator; valid until the next call
	 */
	function next({ magnitude, frequency, phaseSlope, hop, tolerance }) {
		/** @param {number} m */
		const alongTime = (m) => previousPhase[m] + (hop * (previousFrequency[m] + frequency[m])) / 2;

		let loudest = 0;
		for (let m = 0; m < bins; m++) {
			loudest = Math.max(loudest, magnitude[m], previousMagnitude[m]);
		}
		const floor = loudest * tolerance;

		let unsettled = 0;
		for (let m = 0; m < bins; m++) {
			if (magnitude[m] > floor) {
				settled[m] = 0;
				unsettled++;
			} else {
				settled[m] = 1;
				phase[m] = alongTime(m);
			}
		}

		/** @param {number} m @param {number} value */
		function settle(m, value) {
			phase[m] = value;
			settled[m] = 1;
			unsettled--;
			heap.push(m, magnitude[m]);
		}

		heap.clear();
		for (let m = 0; m < bins; m++) {
			if (previousMagnitude[m] > floor) heap.push(m + bins, previousMagnitude[m]);
		}

		while (unsettled > 0) {
			if (heap.size === 0) {
				// A loud bin nothing reached (a note out of silence): start it along time
				const m = loudestUnsettled(magnitude);
				settle(m, alongTime(m));
				continue;
			}
			const id = heap.pop();
			if (id >= bins) {
				const m = id - bins;
				if (!settled[m]) settle(m, alongTime(m));
				continue;
			}
			if (id > 0 && !settled[id - 1]) {
				settle(id - 1, phase[id] - (phaseSlope[id] + phaseSlope[id - 1]) / 2);
			}
			if (id < bins - 1 && !settled[id + 1]) {
				settle(id + 1, phase[id] + (phaseSlope[id] + phaseSlope[id + 1]) / 2);
			}
		}

		return remember(magnitude, frequency);
	}

	/** @param {Float64Array} magnitude */
	function loudestUnsettled(magnitude) {
		let best = -1;
		for (let m = 0; m < bins; m++) {
			if (!settled[m] && (best < 0 || magnitude[m] > magnitude[best])) best = m;
		}
		return best;
	}

	/**
	 * @param {Float64Array} magnitude
	 * @param {Float64Array} frequency
	 */
	function remember(magnitude, frequency) {
		for (let m = 0; m < bins; m++) {
			phase[m] = wrap(phase[m]);
			previousPhase[m] = phase[m];
			previousFrequency[m] = frequency[m];
			previousMagnitude[m] = magnitude[m];
		}
		return phase;
	}

	/**
	 * Take this frame's phases as they are in the source: the first frame
	 * after a jump, or playing at the original speed, where nothing needs to
	 * change. The next frame carries on from them.
	 * @param {Float64Array} sourcePhase
	 * @param {Float64Array} magnitude
	 * @param {Float64Array} frequency
	 */
	function useSourcePhase(sourcePhase, magnitude, frequency) {
		phase.set(sourcePhase);
		return remember(magnitude, frequency);
	}

	return { next, useSourcePhase };
}

/** @param {number} angle */
function wrap(angle) {
	return angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
}
