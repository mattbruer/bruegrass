/**
 * Turning pages without swiping, for reading a chart on a stand: the arrow
 * keys, Page Up/Down and the space bar (what Bluetooth page-turner pedals
 * send), and a tap on the left or right third of the pages.
 */

/** Keys that turn forward and back. */
const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ']);
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);
const EDGE_SHARE = 1 / 3;

/**
 * A Svelte action on the element holding the pages.
 * @param {HTMLElement} node
 * @param {{ next: () => void, previous: () => void, on: boolean }} turn on: false to pause it
 */
export function turnPages(node, turn) {
	let current = turn;

	/** @param {KeyboardEvent} event */
	const key = (event) => {
		if (!current.on) return;
		if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select'))
			return;
		if (NEXT_KEYS.has(event.key)) current.next();
		else if (PREVIOUS_KEYS.has(event.key)) current.previous();
		else return;
		event.preventDefault();
	};

	/** @param {MouseEvent} event */
	const tap = (event) => {
		if (!current.on) return;
		const box = node.getBoundingClientRect();
		const x = (event.clientX - box.left) / box.width;
		if (x < EDGE_SHARE) current.previous();
		else if (x > 1 - EDGE_SHARE) current.next();
	};

	window.addEventListener('keydown', key);
	node.addEventListener('click', tap);
	return {
		/** @param {{ next: () => void, previous: () => void, on: boolean }} next */
		update(next) {
			current = next;
		},
		destroy() {
			window.removeEventListener('keydown', key);
			node.removeEventListener('click', tap);
		}
	};
}
