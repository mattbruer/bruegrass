/**
 * When a bar key's picture moves: marks the key (`data-animate`) and each
 * picture's own CSS says how it moves while marked.
 *
 * - A mouse or pen: while it hovers the key.
 * - A finger (no hover on a phone): once, for a moment, when the key is tapped.
 *
 * Usage, on the element holding the keys: <div use:animateKeys>
 */

/** How long a tap's animation plays (long enough for one pencil loop). */
const TAP_MS = 1600;
const MARK = 'data-animate';

/** @param {HTMLElement} node */
export function animateKeys(node) {
	/** @type {Map<Element, ReturnType<typeof setTimeout>>} */
	const tapTimers = new Map();

	/** @param {Event} event */
	const keyOf = (event) =>
		event.target instanceof Element ? event.target.closest('.bar-tile') : null;

	/** @param {PointerEvent} event */
	function hoverStart(event) {
		const key = keyOf(event);
		if (key && event.pointerType !== 'touch') key.setAttribute(MARK, '');
	}

	/** @param {PointerEvent} event */
	function hoverEnd(event) {
		const key = keyOf(event);
		const stillInside = event.relatedTarget instanceof Node && key?.contains(event.relatedTarget);
		if (key && event.pointerType !== 'touch' && !stillInside && !tapTimers.has(key)) {
			key.removeAttribute(MARK);
		}
	}

	/** @param {PointerEvent} event */
	function tap(event) {
		const key = keyOf(event);
		if (!key || event.pointerType !== 'touch') return;
		clearTimeout(tapTimers.get(key));
		key.setAttribute(MARK, '');
		tapTimers.set(
			key,
			setTimeout(() => {
				key.removeAttribute(MARK);
				tapTimers.delete(key);
			}, TAP_MS)
		);
	}

	node.addEventListener('pointerover', hoverStart);
	node.addEventListener('pointerout', hoverEnd);
	node.addEventListener('pointerdown', tap);

	return {
		destroy() {
			node.removeEventListener('pointerover', hoverStart);
			node.removeEventListener('pointerout', hoverEnd);
			node.removeEventListener('pointerdown', tap);
			for (const timer of tapTimers.values()) clearTimeout(timer);
		}
	};
}
