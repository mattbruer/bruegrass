/**
 * Your own chord shapes ("My chords"): a guitar shape under a chord name,
 * like `Cadd9`, or a variant of a chord like `G:high`. They're yours, so
 * every song on this device can use them.
 */
import { savedCollection } from './collection.js';

/** Bump when the document's shape changes, and migrate older ones in `upgrade`. */
export const CHORD_VOICING_VERSION = 1;

/**
 * @typedef {{
 *   id: string,
 *   version: number,
 *   name: string,
 *   frets: (number | null)[],
 *   createdAt: string,
 *   updatedAt: string
 * }} ChordVoicing
 *   name: the chord as written in the chart (no slash bass);
 *   frets: six, low E to high e, null for a muted string, without capo
 */

const voicings = savedCollection('bruegrass.chordVoicings', upgrade);

export const listChordVoicings = voicings.list;
export const deleteChordVoicing = voicings.delete;

/**
 * Save a new shape, or replace the one with this id.
 * @param {{ id?: string, name: string, frets: ChordVoicing['frets'] }} fields
 * @returns {ChordVoicing}
 */
export function saveChordVoicing(fields) {
	const existing = fields.id ? voicings.get(fields.id) : null;
	return voicings.save({ ...existing, ...fields, version: CHORD_VOICING_VERSION });
}

/**
 * @param {any} stored
 * @returns {ChordVoicing | null}
 */
function upgrade(stored) {
	const frets = stored?.frets;
	const validFret = (/** @type {unknown} */ fret) =>
		fret === null || (Number.isInteger(fret) && /** @type {number} */ (fret) >= 0);
	if (typeof stored?.name !== 'string' || !stored.name) return null;
	if (!Array.isArray(frets) || frets.length !== 6 || !frets.every(validFret)) return null;
	return { ...stored, version: CHORD_VOICING_VERSION };
}
