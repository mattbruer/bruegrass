/**
 * A Svelte action: drag to move, pinch (two fingers, or a trackpad) or
 * scroll to zoom. It only reports what the hand did; the caller decides
 * what moves. While `on` is false it does nothing and lets the page scroll.
 */

/** How much one scroll step zooms (a mouse wheel notch is about 100). */
const ZOOM_PER_SCROLL = 0.002;

/**
 * @typedef {{
 *   on: boolean,
 *   onDrag: (dx: number, dy: number) => void,
 *   onZoom: (factor: number) => void
 * }} PanAndZoom
 * @param {HTMLElement} node
 * @param {PanAndZoom} params
 */
export function panAndZoom(node, params) {
	let current = params;
	/** Where each finger (or the mouse) is, by pointer id. */
	const pointers = new Map();

	/** @param {PointerEvent} event */
	function down(event) {
		if (!current.on) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		node.setPointerCapture(event.pointerId);
	}

	/** @param {PointerEvent} event */
	function move(event) {
		const was = pointers.get(event.pointerId);
		if (!current.on || !was) return;
		const before = spread();
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pointers.size === 1) current.onDrag(event.clientX - was.x, event.clientY - was.y);
		else if (before > 0) current.onZoom(spread() / before);
	}

	/** @param {PointerEvent} event */
	function up(event) {
		pointers.delete(event.pointerId);
	}

	/** @param {WheelEvent} event */
	function wheel(event) {
		if (!current.on) return;
		event.preventDefault();
		current.onZoom(Math.exp(-event.deltaY * ZOOM_PER_SCROLL));
	}

	/** The distance between the first two fingers (0: fewer than two). */
	function spread() {
		const [a, b] = [...pointers.values()];
		return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
	}

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', up);
	node.addEventListener('wheel', wheel, { passive: false });
	return {
		/** @param {PanAndZoom} next */
		update: (next) => (current = next),
		destroy() {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
			node.removeEventListener('wheel', wheel);
		}
	};
}
