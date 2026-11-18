/**
 * Tilt and sheen: tells the button or card under the mouse where the mouse is
 * on it (--pointer-x and --pointer-y, 0 to 1, and --hovering), so the CSS in
 * ui.css can tip it and light it there. Mouse only: a finger has no hover.
 */

const FOLLOWS = '.ui-button, .ui-card';

/** @returns {() => void} stops following */
export function followPointer() {
	/** @type {HTMLElement | null} */
	let current = null;

	function letGo() {
		if (!current) return;
		for (const name of ['--pointer-x', '--pointer-y', '--hovering']) {
			current.style.removeProperty(name);
		}
		current = null;
	}

	/** @param {PointerEvent} event */
	function onMove(event) {
		if (event.pointerType !== 'mouse') return;
		const target = /** @type {Element} */ (event.target);
		const element = /** @type {HTMLElement | null} */ (target.closest?.(FOLLOWS) ?? null);
		if (element !== current) letGo();
		if (!element) return;
		current = element;
		const box = element.getBoundingClientRect();
		element.style.setProperty('--pointer-x', String((event.clientX - box.left) / box.width));
		element.style.setProperty('--pointer-y', String((event.clientY - box.top) / box.height));
		element.style.setProperty('--hovering', '1');
	}

	document.addEventListener('pointermove', onMove, { passive: true });
	document.documentElement.addEventListener('pointerleave', letGo);
	return () => {
		letGo();
		document.removeEventListener('pointermove', onMove);
		document.documentElement.removeEventListener('pointerleave', letGo);
	};
}
