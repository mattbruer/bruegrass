/**
 * Your work saves itself: the open song (SongState.saveNow) and the EQs of
 * the listening setup in use (saveSetupChanges).
 *
 *   - A moment after each change (not on every slider tick).
 *   - At once when the page is hidden or goes away: an iPhone may unload a
 *     page in the background without a word, so that's the last chance.
 */
import {
	listening,
	saveSetupChanges,
	setupHasUnsavedChanges
} from '../mixer/listeningSetup.svelte.js';

/** Changes are written this long after the last one. */
const WRITE_DELAY_MS = 1000;

/**
 * Keep the song and the listening setup saved for as long as the page is
 * open. Call once while the page is being set up.
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 */
export function keepWorkSaved(arranger) {
	const { song } = arranger;
	let timer = 0;

	const saveNow = () => {
		clearTimeout(timer);
		if (!song.ready) return;
		song.saveNow().catch(console.error);
		saveSetupChanges();
	};

	$effect(() => {
		const songChanged = song.ready && song.hasChanged;
		const setupChanged = listening.setup !== null && setupHasUnsavedChanges();
		if (!songChanged && !setupChanged) return;
		clearTimeout(timer);
		timer = window.setTimeout(saveNow, WRITE_DELAY_MS);
	});

	$effect(() => {
		const saveWhenHidden = () => document.visibilityState === 'hidden' && saveNow();
		document.addEventListener('visibilitychange', saveWhenHidden);
		window.addEventListener('pagehide', saveNow);
		return () => {
			saveNow();
			document.removeEventListener('visibilitychange', saveWhenHidden);
			window.removeEventListener('pagehide', saveNow);
		};
	});
}
