/**
 * A fill dressed as a score so the piano roll can draw it: just its own
 * bars, with the chord it's written for under them.
 */
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';
import { barQuarters } from '../chart/timeline.js';

/** Where the blank fill's chord sits as far as the roll's chord labels care. */
const ONLY_CHORD = { section: 0, measure: 0, chord: 0 };

/**
 * @param {{ name: string, bars: number, meter: import('../chart/timeline.js').Meter }} fill
 * @param {import('../theory/musicInKey.js').Key} key
 * @returns {{ score: import('../melody/roll/readScore.js').Score, end: number, chordsUnder: import('../melody/roll/chordsUnderBars.js').ChordUnder[] }}
 *   end: the last tick of the fill
 */
export function fillScore({ name, bars, meter }, key) {
	const length = barQuarters(meter) * TICKS_PER_QUARTER;
	const end = length * bars;
	return {
		score: {
			bars: Array.from({ length: bars }, (_, bar) => ({
				start: bar * length,
				length,
				meter: { num: meter.beats, den: meter.unit },
				from: null,
				to: null
			})),
			notes: [],
			chords: [],
			unit: TICKS_PER_QUARTER / 2,
			key
		},
		end,
		chordsUnder: [{ at: 0, length: end, name, place: ONLY_CHORD, key: null }]
	};
}
