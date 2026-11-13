/**
 * Generic lanes: parts written by ear for any instrument (the transcription's
 * + Lane). A lane's id starts with LANE_PREFIX, so the piano roll knows it
 * holds its own ABC text, like the bass line does.
 */
export const LANE_PREFIX = 'lane-';

/** @param {string} id */
export function isLaneId(id) {
	return id.startsWith(LANE_PREFIX);
}

/** @param {string} id a lane's id, e.g. 'lane-2' */
export function laneNumber(id) {
	return Number(id.slice(LANE_PREFIX.length));
}
