/**
 * A fill dressed as a score so the piano roll can draw it: just its own
 * bars, with the chords those bars hold under them.
 */
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';
import { barQuarters } from '../chart/timeline.js';

/** Where a chord sits as far as the roll's chord labels care. */
const NO_PLACE = { section: 0, measure: 0, chord: 0 };

/**
 * @param {{ start: number, bars: number, meter: import('../chart/timeline.js').Meter }} fill start in quarters
 * @param {{ start: number, length: number, name: string }[]} chords the song's chords, in quarters
 * @param {import('../theory/musicInKey.js').Key} key
 * @returns {{ score: import('../melody/roll/readScore.js').Score, end: number, chordsUnder: import('../melody/roll/chordsUnderBars.js').ChordUnder[] }}
 *   end: the last tick of the fill
 */
export function fillScore({ start, bars, meter }, chords, key) {
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
		chordsUnder: chords
			.filter(
				(chord) =>
					chord.start + chord.length > start && chord.start < start + end / TICKS_PER_QUARTER
			)
			.map((chord) => {
				const from = Math.max(chord.start, start);
				const to = Math.min(chord.start + chord.length, start + end / TICKS_PER_QUARTER);
				return {
					at: Math.round((from - start) * TICKS_PER_QUARTER),
					length: Math.round((to - from) * TICKS_PER_QUARTER),
					name: chord.name,
					place: NO_PLACE,
					key: null
				};
			})
	};
}
