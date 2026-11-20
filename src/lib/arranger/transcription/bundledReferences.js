/**
 * The app's own recordings (the playlist's MP3s), as recordings to
 * transcribe. A recording's key is its address, so a song written from one
 * can open it again.
 */
import { songs } from '$lib/playlist/songs.js';

/** Every bundled recording, by title. */
export const BUNDLED_REFERENCES = songs
	.map((song) => ({ key: song.src, name: song.title.trim(), source: song.src }))
	.toSorted((a, b) => a.name.localeCompare(b.name));

/**
 * The bundled recording with this key, or null (a file from your device can't be reopened).
 * @param {string} key
 * @returns {import('./TranscriptionState.svelte.js').Reference | null}
 */
export function bundledReference(key) {
	return BUNDLED_REFERENCES.find((reference) => reference.key === key) ?? null;
}
