/**
 * Ask before leaving the arranger with unsaved changes: going to another
 * page in the app, reloading, or closing the tab.
 */
import { beforeNavigate } from '$app/navigation';

/**
 * Call once while the arranger page is being set up.
 * @param {import('./SongState.svelte.js').SongState} song
 */
export function guardUnsavedChanges(song) {
	beforeNavigate((navigation) => {
		if (!song.hasUnsavedChanges) return;

		// Reloading or closing the tab: cancelling makes the browser show its own "Leave site?" prompt
		if (navigation.willUnload) {
			navigation.cancel();
			return;
		}

		if (!confirm(discardQuestion(song))) navigation.cancel();
	});
}

/**
 * The question to ask before unsaved changes are lost (for leaving, New
 * and Open alike).
 * @param {import('./SongState.svelte.js').SongState} song
 */
export function discardQuestion(song) {
	const what = song.isNew ? 'This song hasn’t been saved' : `“${song.name}” has unsaved changes`;
	return `${what}. Discard the changes?`;
}

/**
 * True if it's fine to replace what's on the page: nothing unsaved, or
 * you said to discard it.
 * @param {import('./SongState.svelte.js').SongState} song
 */
export function okToDiscardChanges(song) {
	return !song.hasUnsavedChanges || confirm(discardQuestion(song));
}
