/**
 * What a database sync would send for the open song: its saved document
 * (exactly as storage keeps it) and its takes' details. The takes' audio
 * isn't here: it would go to file storage, one file per take.
 */
import { getArrangement } from '$lib/storage/arrangements.js';
import { readSongFields } from './songFields.js';

/** @param {import('./Arranger.svelte.js').Arranger} arranger */
export async function songPayload(arranger) {
	await arranger.song.saveNow();
	const saved = arranger.song.savedId ? await getArrangement(arranger.song.savedId) : null;
	const song = saved ?? { notSavedYet: true, ...readSongFields(arranger) };
	return { song, takes: arranger.recording.takes };
}
