/**
 * A recording's transcription, kept on this device as you work, so leaving
 * the page (or an iPhone unloading it) never loses your fixes: what belongs
 * to the recording (where beat 1 is, the beats and bars, the time, lanes you
 * added, the fine tuning, how early each section's tune starts, the part
 * being worked on). The chords, sections and key are the song's own,
 * in its chart, which saves itself like any song.
 * One draft per recording, found again by the recording's key.
 */
import { clearDraft, readDraft, writeDraft } from '$lib/storage/drafts.js';

/**
 * @typedef {{
 *   grid: import('./beatGrid.js').BeatGrid,
 *   time: string, lanes: import('./extraLanes.js').ExtraLane[],
 *   cents: number, downbeat: number,
 *   pickups: Record<number, number>
 * }} Transcription
 *   downbeat: where you placed beat 1 of bar 1 (seconds)
 *   cents: the recording's pitch moved by this much (fine tuning)
 *   pickups: bar number → how many beats before it its section's tune starts (a marker's pickup)
 */

/** @param {string} referenceKey */
function draftName(referenceKey) {
	return `transcription:${referenceKey}`;
}

/**
 * @param {string} referenceKey
 * @returns {(Transcription & { savedAt: string }) | null} savedAt: when it was last kept
 */
export function readTranscriptionDraft(referenceKey) {
	const draft = readDraft(draftName(referenceKey));
	return draft ? { ...draft.value, savedAt: draft.savedAt } : null;
}

/**
 * @param {string} referenceKey
 * @param {Transcription} transcription
 */
export function writeTranscriptionDraft(referenceKey, transcription) {
	writeDraft(draftName(referenceKey), transcription);
}

/** @param {string} referenceKey */
export function clearTranscriptionDraft(referenceKey) {
	clearDraft(draftName(referenceKey));
}
