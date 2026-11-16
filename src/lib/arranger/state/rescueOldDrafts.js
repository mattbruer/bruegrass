/**
 * Before songs saved themselves, unsaved changes were kept as drafts. Once,
 * on the first start since: a song draft becomes a saved song and opens,
 * and a listening setup draft's EQs go back on (they then save themselves).
 * Safe to delete once no device has old drafts left.
 */
import { clearDraft, readDraft } from '$lib/storage/drafts.js';
import { getArrangement } from '$lib/storage/arrangements.js';
import { applyEqs } from '../mixer/mixer.svelte.js';
import { listening } from '../mixer/listeningSetup.svelte.js';
import { loadSongIntoPage } from './songFields.js';

/** @param {import('./Arranger.svelte.js').Arranger} arranger */
export async function rescueOldDrafts(arranger) {
	const setupDraft = readDraft('listeningSetup')?.value;
	clearDraft('listeningSetup');
	if (setupDraft && setupDraft.setupId === listening.setup?.id) applyEqs(setupDraft.eqs);

	const songDraft = readDraft('song')?.value;
	clearDraft('song');
	if (!songDraft?.fields) return;
	const { song } = arranger;
	if (songDraft.savedId && (await getArrangement(songDraft.savedId))) {
		await song.open(songDraft.savedId);
	} else {
		song.startNew();
		song.name = songDraft.name ?? '';
	}
	loadSongIntoPage(arranger, songDraft.fields);
	await song.saveNow();
}
