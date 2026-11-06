/**
 * Which strip's EQ is open. One EQ window at a time: opening another strip's
 * EQ switches the window to it, so a small screen never fills with windows.
 */

export const eqWindow = $state({
	/** The strip whose EQ is showing: a channel id, 'reverb' or 'master'; null when closed. */
	stripId: /** @type {string | null} */ (null)
});

/** @param {string} stripId */
export function openEq(stripId) {
	eqWindow.stripId = stripId;
}

export function closeEq() {
	eqWindow.stripId = null;
}

/** The strip's name and EQ (a channel id, 'reverb' or 'master'): see stripWithEq in mixer.svelte.js. */
export { stripWithEq as eqStrip } from '../../../playback/mixer.svelte.js';
