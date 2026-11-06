/**
 * The arranger's drafts (see $lib/storage/drafts.js for why): the song's
 * unsaved changes, and the listening setup's unsaved EQ changes.
 *
 *   - While something has unsaved changes, its draft is kept up to date (a
 *     moment after each change, and at once when the page is hidden: on an
 *     iPhone, switching apps is the last chance).
 *   - Once it's saved (or the changes are undone), the draft is cleared.
 *   - When the page starts and there's a draft, the page offers to restore
 *     it (components/song/RestoreDraftsDialog.svelte). Drafts aren't kept
 *     until that's answered, so the fresh page can't overwrite them first.
 */
import { clearDraft, readDraft, writeDraft } from '$lib/storage/drafts.js';
import { getArrangement } from '$lib/storage/arrangements.js';
import { readSongFields } from './songFields.js';
import { applyEqs, eqsSnapshot } from '../playback/mixer.svelte.js';
import { listening, setupHasUnsavedChanges } from '../playback/eq/listeningSetup.svelte.js';

/** Changes are written to the draft this long after the last one (not on every slider tick). */
const WRITE_DELAY_MS = 1000;

const SONG = 'song';
const SETUP = 'listeningSetup';

/**
 * @typedef {{ savedId: string | null, name: string, fields: import('./songFields.js').SongFields }} SongDraft
 * @typedef {{ setupId: string, setupName: string, eqs: Record<string, any> }} SetupDraft
 * @typedef {{ song: (SongDraft & { savedAt: string }) | null, setup: (SetupDraft & { savedAt: string }) | null }} DraftOffer
 */

/** The latest drafts to write (null: clear it), waiting for the delay. */
let pending = /** @type {{ song: SongDraft | null, setup: SetupDraft | null } | null} */ (null);
let timer = 0;

export const drafts = $state({
	/** Drafts from last time, waiting for Restore or Discard (null: nothing to offer). */
	offer: /** @type {DraftOffer | null} */ (null),
	/** Keeping drafts (only once any offer is answered). */
	keeping: false
});

/**
 * Once the page has started (and this device's listening setup is on):
 * offer last time's drafts, or start keeping new ones.
 */
export function offerDraftsFromLastTime() {
	const song = readDraft(SONG);
	const setupDraft = readDraft(SETUP);
	// A setup draft only means something if this device still uses that setup
	const setup = setupDraft && setupDraft.value?.setupId === listening.setup?.id ? setupDraft : null;
	if (setupDraft && !setup) clearDraft(SETUP);

	if (!song && !setup) {
		drafts.keeping = true;
		return;
	}
	drafts.offer = {
		song: song ? { ...song.value, savedAt: song.savedAt } : null,
		setup: setup ? { ...setup.value, savedAt: setup.savedAt } : null
	};
}

/**
 * Put last time's unsaved changes back: the song (on top of its saved
 * version, so it still shows unsaved changes) and the setup's EQs.
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 */
export function restoreDrafts(arranger) {
	const offer = drafts.offer;
	if (offer?.song) {
		const stillSaved = offer.song.savedId ? getArrangement(offer.song.savedId) : null;
		arranger.song.restoreDraft(
			stillSaved ? offer.song : { ...offer.song, savedId: null, name: '' }
		);
	}
	if (offer?.setup) applyEqs(offer.setup.eqs);
	drafts.offer = null;
	drafts.keeping = true;
}

/** Throw last time's unsaved changes away. */
export function discardDrafts() {
	clearDraft(SONG);
	clearDraft(SETUP);
	drafts.offer = null;
	drafts.keeping = true;
}

/**
 * You chose to leave and discard your changes: drop the drafts too, and
 * stop keeping them, so they don't come back next time.
 */
export function forgetDraftsOnLeaving() {
	clearTimeout(timer);
	pending = null;
	drafts.keeping = false;
	clearDraft(SONG);
	clearDraft(SETUP);
}

function writePending() {
	clearTimeout(timer);
	if (!pending) return;
	if (pending.song) writeDraft(SONG, pending.song);
	else clearDraft(SONG);
	if (pending.setup) writeDraft(SETUP, pending.setup);
	else clearDraft(SETUP);
	pending = null;
}

/**
 * Keep drafts up to date for as long as the page is open. Call once while
 * the page is being set up.
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 */
export function keepDrafts(arranger) {
	$effect(() => {
		if (!drafts.keeping) return;
		const song = arranger.song;
		const setup = listening.setup;
		pending = {
			song: song.hasUnsavedChanges
				? { savedId: song.savedId, name: song.name, fields: readSongFields(arranger) }
				: null,
			setup:
				setup && setupHasUnsavedChanges()
					? { setupId: setup.id, setupName: setup.name, eqs: eqsSnapshot() }
					: null
		};
		clearTimeout(timer);
		timer = window.setTimeout(writePending, WRITE_DELAY_MS);
	});

	// Hidden (another app, another tab, the phone locking): write at once
	$effect(() => {
		const writeNow = () => document.visibilityState === 'hidden' && writePending();
		document.addEventListener('visibilitychange', writeNow);
		window.addEventListener('pagehide', writePending);
		return () => {
			writePending();
			document.removeEventListener('visibilitychange', writeNow);
			window.removeEventListener('pagehide', writePending);
		};
	});
}
