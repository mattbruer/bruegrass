/**
 * A recording's transcription, kept on this device as you work, so leaving
 * the page (or an iPhone unloading it) never loses your fixes: what belongs
 * to the recording (its beats, where it sits on the bars and how it's
 * trimmed, the time, the fine tuning, how early each section's tune starts). The chords, sections and key are the song's own,
 * in its chart, which saves itself like any song.
 * One draft per recording, found again by the recording's key.
 */
import { clearDraft, readDraft, writeDraft } from '$lib/storage/drafts.js';

/**
 * @typedef {{
 *   grid: import('./beatGrid.js').BeatGrid,
 *   time: string, timeChosen: boolean,
 *   cents: number,
 *   pickups: Record<number, number>,
 *   pickupBar: boolean
 * }} Transcription
 *   timeChosen: false until you've said the time signature (the bars aren't shown before)
 *   cents: the recording's pitch moved by this much (fine tuning)
 *   pickups: bar number → how many beats before it its section's tune starts (a marker's pickup)
 *   pickupBar: bar 1 is the pickup bar (only how bars are numbered on screen)
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
	// A draft from before the recording could be trimmed isn't this shape: start afresh
	if (!draft?.value?.grid?.trim) return null;
	return { ...draft.value, savedAt: draft.savedAt };
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
