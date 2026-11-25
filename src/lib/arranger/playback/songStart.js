/**
 * Where the song starts. A pickup is an ordinary bar, as in Logic: the
 * whole bar before bar 1, rests then the pickup's notes, so a song with
 * one starts a bar early. The count-in ends here, and nothing a take caught
 * before it is shown or played. Quarters from bar 1.
 * @param {boolean} hasPickup
 * @param {number} barQuarters bar 1's length
 */
export function songStartOf(hasPickup, barQuarters) {
	return hasPickup ? -barQuarters : 0;
}
