/**
 * A button that steps once when pressed and keeps stepping while held, like
 * the − and + on a clock radio. Keyboard presses step once.
 *
 * Usage: <button use:repeatWhileHeld={() => nudge(1)}>
 */

/** Wait before repeating, then the time between steps (milliseconds). */
const HOLD_DELAY = 400;
const REPEAT_EVERY = 80;

/**
 * @param {HTMLElement} node
 * @param {() => void} step
 */
export function repeatWhileHeld(node, step) {
	let onStep = step;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;

	function stopRepeating() {
		clearTimeout(timer);
		timer = undefined;
	}

	function repeat() {
		onStep();
		timer = setTimeout(repeat, REPEAT_EVERY);
	}

	/** @param {PointerEvent} event */
	function press(event) {
		if (event.button !== 0) return;
		onStep();
		timer = setTimeout(repeat, HOLD_DELAY);
	}

	/** A click with no pointer behind it is the keyboard (Enter or Space). @param {MouseEvent} event */
	function keyboardClick(event) {
		if (event.detail === 0) onStep();
	}

	node.addEventListener('pointerdown', press);
	node.addEventListener('pointerup', stopRepeating);
	node.addEventListener('pointerleave', stopRepeating);
	node.addEventListener('pointercancel', stopRepeating);
	node.addEventListener('click', keyboardClick);

	return {
		/** @param {() => void} next */
		update(next) {
			onStep = next;
		},
		destroy() {
			stopRepeating();
			node.removeEventListener('pointerdown', press);
			node.removeEventListener('pointerup', stopRepeating);
			node.removeEventListener('pointerleave', stopRepeating);
			node.removeEventListener('pointercancel', stopRepeating);
			node.removeEventListener('click', keyboardClick);
		}
	};
}
