/**
 * Drafts: unsaved work, kept on this device so it isn't lost.
 *
 * Why: on a Mac, leaving the page with unsaved changes asks first. An
 * iPhone never asks: switch apps and iOS may quietly unload the page, or a
 * swipe closes the tab, and the changes are gone. So anything with unsaved
 * changes keeps a draft here as you work, and the next visit offers to
 * restore it. Saving for real still only happens when you press Save; a
 * draft is just a safety net, and is cleared once the work is saved.
 *
 * Use it for anything you can change and then lose: write a draft while
 * there are unsaved changes, clear it when there aren't, and offer drafts
 * back on the next visit.
 *
 * Drafts belong to this device (like thisDevice.js) and never sync.
 */
import { readStored, writeStored } from './localStore.js';

const DRAFTS_KEY = 'bruegrass.drafts';

/** @typedef {{ savedAt: string, value: any }} Draft */

/** @returns {Record<string, Draft>} */
function allDrafts() {
	const stored = readStored(DRAFTS_KEY);
	return stored && typeof stored === 'object' ? stored : {};
}

/**
 * The draft kept under `name`, or null.
 * @param {string} name e.g. 'song'
 * @returns {Draft | null}
 */
export function readDraft(name) {
	const draft = allDrafts()[name];
	return draft && typeof draft.savedAt === 'string' ? draft : null;
}

/**
 * Keep (or replace) a draft.
 * @param {string} name
 * @param {unknown} value plain data
 */
export function writeDraft(name, value) {
	writeStored(DRAFTS_KEY, { ...allDrafts(), [name]: { savedAt: new Date().toISOString(), value } });
}

/** @param {string} name */
export function clearDraft(name) {
	const drafts = allDrafts();
	if (!(name in drafts)) return;
	delete drafts[name];
	writeStored(DRAFTS_KEY, drafts);
}
