/**
 * Ask before leaving the arranger with unsaved changes: going to another
 * page in the app (not the chart, which shares the song), reloading, or closing the tab.
 */
import { beforeNavigate } from '$app/navigation';
import {
	setupDiscardQuestion,
	setupHasUnsavedChanges
} from '../playback/eq/listeningSetup.svelte.js';
import { forgetDraftsOnLeaving } from './drafts.svelte.js';
import { forgetSongMix } from './songMixMemory.svelte.js';

/** The pages that share the open song (their layout keeps it), so moving between them loses nothing. */
const SAME_SONG_ROUTES = '/arranger/(band)';

/**
 * Call once while the arranger page is being set up.
 * @param {import('./SongState.svelte.js').SongState} song
 */
export function guardUnsavedChanges(song) {
	beforeNavigate((navigation) => {
		if (navigation.to?.route.id?.startsWith(SAME_SONG_ROUTES)) return;
		const songChanged = song.hasUnsavedChanges;
		// A listening setup isn't part of the song (New and Open keep it), but leaving loses its changes
		const setupChanged = setupHasUnsavedChanges();
		if (!songChanged && !setupChanged) return;

		// Reloading or closing the tab: cancelling makes the browser show its own "Leave site?" prompt
		if (navigation.willUnload) {
			navigation.cancel();
			return;
		}

		const question = songChanged ? discardQuestion(song) : setupDiscardQuestion();
		if (!confirm(question)) navigation.cancel();
		else {
			forgetDraftsOnLeaving(); // you chose to discard: don't offer it back next time
			forgetSongMix(song.savedId);
		}
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
	if (!song.hasUnsavedChanges) return true;
	if (!confirm(discardQuestion(song))) return false;
	forgetSongMix(song.savedId);
	return true;
}
