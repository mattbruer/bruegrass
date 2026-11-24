/**
 * Whether a click on a lane's header should pick the lane: on its name, or
 * on the header itself, but not on one of its controls (mute, a menu…).
 * @param {MouseEvent} event
 */
export function picksTheLane(event) {
	const target = /** @type {HTMLElement} */ (event.target);
	return (
		Boolean(target.closest('.pick')) ||
		!target.closest('button, summary, input, select, label, [role="slider"]')
	);
}
