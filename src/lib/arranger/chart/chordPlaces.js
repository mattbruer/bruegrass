import { beatGroups } from './timeline.js';

/**
 * The beats a chord may change on: where the band's boom falls (beats 1
 * and 3 in 4/4, so at most two chords a bar; bluegrass doesn't change
 * chords faster), except in 3/4, where any beat can.
 * @param {number} beats the bar's length in quarters
 * @returns {number[]}
 */
export function chordPlaces(beats) {
	if (beats === 3) return [0, 1, 2];
	let at = 0;
	return beatGroups(beats).map((group) => {
		const place = at;
		at += group;
		return place;
	});
}
