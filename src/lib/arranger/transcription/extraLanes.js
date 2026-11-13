/**
 * Generic lanes: an empty part to write by ear, for any instrument. Each is
 * its own ABC text, read and written like the bass line (melody/roll/extraLane.js).
 *
 * @typedef {{ id: string, name: string, abc: string }} ExtraLane
 *   abc: '' until notes are written; then the lane's own ABC
 * @typedef {{
 *   extraLanes: ExtraLane[],
 *   laneAbc: (lane: ExtraLane) => string,
 *   setLaneAbc: (id: string, abc: string) => void
 * }} LaneStore what the piano roll reads and writes for the generic lanes
 */
import { LANE_PREFIX, laneNumber } from '../melody/roll/extraLane.js';

/**
 * A new, empty lane after the existing ones: "Lane 1", "Lane 2"…
 * @param {ExtraLane[]} lanes
 * @returns {ExtraLane}
 */
export function newExtraLane(lanes) {
	const number = lanes.reduce((most, lane) => Math.max(most, laneNumber(lane.id)), 0) + 1;
	return { id: `${LANE_PREFIX}${number}`, name: `Lane ${number}`, abc: '' };
}
