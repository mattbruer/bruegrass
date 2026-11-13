/**
 * The parts written in the grid, to hear along with the recording: each
 * lane's notes moved onto the recording's own time (its beats drift, so
 * through the tempo map), and which lanes sound (mute and solo).
 */
import { secondsAt } from './tempoMap.js';

/**
 * @param {import('../tracks/lanes.js').BandLane[]} lanes
 * @param {import('./beatGrid.js').BeatGrid} grid
 * @param {(laneId: string, pitch: number) => number} soundingPitch MIDI as heard
 * @returns {import('$lib/transcribe/partNotes.js').PartNote[]}
 */
export function heardNotes(lanes, grid, soundingPitch) {
	return lanes
		.flatMap((lane) =>
			lane.blocks
				.filter((block) => typeof block.pitch === 'number')
				.map((block) => ({
					start: secondsAt(grid, block.start),
					end: secondsAt(grid, block.start + block.length),
					hz: frequencyOf(soundingPitch(lane.id, /** @type {number} */ (block.pitch))),
					part: lane.id
				}))
		)
		.toSorted((a, b) => a.start - b.start);
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
