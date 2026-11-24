/**
 * The number a bar is shown with. With a pickup bar, bar 1 (the pickup)
 * is shown as 0 and the song's first ONE as bar 1, the way Logic counts
 * a song that starts before bar 1. Only what's shown changes: bars, markers
 * and the chart keep their own numbers.
 */

/**
 * @param {number} number the bar's own number (1 for the first bar)
 * @param {boolean} pickupBar the first bar is a pickup
 */
export function shownBarNumber(number, pickupBar) {
	return pickupBar ? number - 1 : number;
}

/**
 * A bar's label on the ruler: "Pickup" for the pickup bar, else its shown number.
 * @param {number} number
 * @param {boolean} pickupBar
 */
export function barLabel(number, pickupBar) {
	return pickupBar && number === 1 ? 'Pickup' : String(shownBarNumber(number, pickupBar));
}

/**
 * A bar's name in menus and buttons: "Pickup" or "Bar 12".
 * @param {number} number
 * @param {boolean} pickupBar
 */
export function barName(number, pickupBar) {
	return pickupBar && number === 1 ? 'Pickup' : `Bar ${shownBarNumber(number, pickupBar)}`;
}
