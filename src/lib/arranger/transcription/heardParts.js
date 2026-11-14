/**
 * The parts written in the grid, to hear along with the recording: each
 * lane's notes moved onto the recording's own time (its beats drift, so
 * through the tempo map), notes that start together strummed at the
 * recording's tempo there, and which lanes sound (mute and solo).
 */
import { secondsAt } from './tempoMap.js';
import { strumOffsets } from '../instruments/guitar.js';

/** A stack is strummed across neighbouring strings, the middle ones (0 = low E). */
const MIDDLE_STRING = 2.5;

/**
 * @param {import('../tracks/lanes.js').BandLane[]} lanes
 * @param {import('./beatGrid.js').BeatGrid} grid
 * @param {(laneId: string, pitch: number) => number} soundingPitch MIDI as heard
 * @returns {import('$lib/slowDowner/partNotes.js').PartNote[]}
 */
export function heardNotes(lanes, grid, soundingPitch) {
	return lanes
		.flatMap((lane) => {
			const notes = lane.blocks.filter((block) => typeof block.pitch === 'number');
			return notes.map((block) => ({
				start: secondsAt(grid, block.start) + strumDelay(notes, block, grid),
				end: secondsAt(grid, block.start + block.length),
				hz: frequencyOf(soundingPitch(lane.id, /** @type {number} */ (block.pitch))),
				part: lane.id
			}));
		})
		.toSorted((a, b) => a.start - b.start);
}

/**
 * How long after its stack's first note this one sounds: a downstroke
 * across neighbouring strings, low to high, at the tempo of the
 * recording at that beat.
 * @param {{ start: number, pitch?: number }[]} notes the lane's notes
 * @param {{ start: number, pitch?: number }} note
 * @param {import('./beatGrid.js').BeatGrid} grid
 */
function strumDelay(notes, note, grid) {
	const stack = notes
		.filter((other) => other.start === note.start)
		.map((other) => /** @type {number} */ (other.pitch))
		.toSorted((a, b) => a - b);
	if (stack.length < 2) return 0;
	const lowest = Math.round(MIDDLE_STRING - (stack.length - 1) / 2);
	const strings = stack.map((_, i) => Math.max(0, Math.min(5, lowest + i)));
	const quarter = secondsAt(grid, note.start + 1) - secondsAt(grid, note.start);
	const bpm = quarter > 0 ? 60 / quarter : 120;
	return strumOffsets(strings, bpm)[stack.indexOf(/** @type {number} */ (note.pitch))];
}

/**
 * Which lanes sound: soloing any silences the ones not soloed; otherwise
 * all but the muted ones.
 * @param {{ id: string, mute: boolean, solo: boolean }[]} lanes
 * @returns {Record<string, number>} 1 heard, 0 not
 */
export function laneLevels(lanes) {
	const soloing = lanes.some((lane) => lane.solo);
	return Object.fromEntries(
		lanes.map((lane) => [lane.id, (soloing ? lane.solo : !lane.mute) ? 1 : 0])
	);
}

/** @param {number} midi */
function frequencyOf(midi) {
	return 440 * 2 ** ((midi - 69) / 12);
}
