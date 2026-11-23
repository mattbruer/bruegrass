/**
 * Whether a key press is someone typing in a text box, so a page's own keys
 * (Space to play, S to split, ⌘Z to undo) leave it alone.
 */
const TEXT_BOXES =
	'textarea, input:not([type="range"]):not([type="checkbox"]):not([type="button"]), [contenteditable="true"]';

/** @param {Event} event */
export function isTyping(event) {
	return event.target instanceof Element && event.target.closest(TEXT_BOXES) !== null;
}
