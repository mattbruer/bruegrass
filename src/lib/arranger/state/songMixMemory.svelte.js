/**
 * Remembering each song's mix on this device (see $lib/storage/songMixes.js).
 *
 *   - Opening a song puts back the mix remembered for it, if any (that shows
 *     as an unsaved change when it differs from the saved song's mix).
 *   - While the page runs, every mix change is written under the open song.
 *   - Throwing a song's changes away forgets its remembered mix too.
 */
import { applySongMix, songMixSnapshot } from '../playback/eq/listeningSetup.svelte.js';
import { forgetSongMix, readSongMix, writeSongMix } from '$lib/storage/songMixes.js';

export { forgetSongMix };

/** Writing waits until the remembered mix has been put back, or the defaults would overwrite it. */
const remembering = $state({ on: false });

/**
 * Put the mix remembered for this song on the mixer, if there is one.
 * @param {string | null} songId
 */
export function applyRememberedMix(songId) {
	const mix = readSongMix(songId);
	if (mix) applySongMix(mix);
}

/**
 * Once the page is running in the browser (and this device's listening
 * setup is on): put back the open song's mix, then start writing changes.
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 */
export function startRememberingSongMixes(arranger) {
	applyRememberedMix(arranger.song.savedId);
	remembering.on = true;
}

/**
 * Write the open song's mix whenever it changes. Call once while the page
 * is being set up.
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 */
export function keepSongMixes(arranger) {
	$effect(() => {
		if (!remembering.on) return;
		writeSongMix(arranger.song.savedId, songMixSnapshot());
	});
	$effect(() => () => {
		remembering.on = false;
	});
}
