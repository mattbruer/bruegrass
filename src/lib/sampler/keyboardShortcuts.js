/**
 * Keys for the sampling page, so you can record with the guitar in your
 * hands. One place for the key list: the page and its hints read it.
 */

/** Each action's key (`event.key`, lower case) and how it's written on screen. */
export const SHORTCUTS = Object.freeze({
	record: { key: 'r', label: 'R' },
	play: { key: ' ', label: 'Space' }
});

/** @typedef {keyof typeof SHORTCUTS} ShortcutAction */

/**
 * Call `actions[name]` when its key is pressed, unless you're typing or
 * choosing in a field, or holding a modifier (⌘R is still reload).
 * Returns a function that stops listening.
 * @param {Partial<Record<ShortcutAction, () => void>>} actions
 */
export function listenForShortcuts(actions) {
	/** @param {KeyboardEvent} event */
	function onKey(event) {
		if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
		if (isTypingIn(event.target)) return;

		for (const [name, shortcut] of Object.entries(SHORTCUTS)) {
			const action = actions[/** @type {ShortcutAction} */ (name)];
			if (action && event.key.toLowerCase() === shortcut.key) {
				event.preventDefault(); // Space would otherwise scroll, or press the focused button too
				action();
				return;
			}
		}
	}

	window.addEventListener('keydown', onKey);
	return () => window.removeEventListener('keydown', onKey);
}

/** @param {EventTarget | null} target */
function isTypingIn(target) {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
	);
}
