/**
 * A Svelte action: drag an element sideways with a mouse or a finger, or
 * tap it. Up and down are left to the page (`touch-action: pan-y`), so a
 * phone still scrolls the page over it.
 */

/** Further than this (px) and it's a drag, not a tap. */
const DRAG_THRESHOLD = 5;

/**
 * @typedef {{ onMove: (dx: number) => void, onEnd: (dx: number) => void, onTap: () => void }} DragHandlers
 *   dx: pixels from where the drag started
 * @param {HTMLElement} node
 * @param {DragHandlers} handlers
 */
export function dragSideways(node, handlers) {
	let current = handlers;
	let startX = 0;
	let dragging = false;
	let pointerId = -1;

	/** @param {PointerEvent} event */
	function down(event) {
		if (event.button !== 0 || pointerId !== -1) return;
		pointerId = event.pointerId;
		startX = event.clientX;
		dragging = false;
		node.setPointerCapture(pointerId);
	}

	/** @param {PointerEvent} event */
	function move(event) {
		if (event.pointerId !== pointerId) return;
		const dx = event.clientX - startX;
		if (!dragging && Math.abs(dx) < DRAG_THRESHOLD) return;
		dragging = true;
		current.onMove(dx);
	}

	/** @param {PointerEvent} event */
	function up(event) {
		if (event.pointerId !== pointerId) return;
		pointerId = -1;
		if (dragging) current.onEnd(event.clientX - startX);
		else current.onTap();
	}

	/** @param {PointerEvent} event */
	function cancel(event) {
		if (event.pointerId !== pointerId) return;
		pointerId = -1;
		if (dragging) current.onEnd(0);
	}

	node.style.touchAction = 'pan-y';
	node.addEventListener('pointerdown', down);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', cancel);

	return {
		/** @param {DragHandlers} next */
		update(next) {
			current = next;
		},
		destroy() {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', cancel);
		}
	};
}
