/**
 * Your own chord shapes ("My chords"): a guitar shape under a chord name,
 * like `Cadd9`, or a variant of a chord like `G:high`. They're yours, so
 * every song on this device can use them.
 */
import { savedCollection } from './collection.js';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   frets: (number | null)[],
 *   createdAt: string,
 *   updatedAt: string
 * }} ChordVoicing
 *   name: the chord as written in the chart (no slash bass);
 *   frets: six, low E to high e, null for a muted string, without capo
 */

const voicings = savedCollection('bruegrass.chordVoicings');

export const listChordVoicings = voicings.list;
export const deleteChordVoicing = voicings.delete;

/**
 * Save a new shape, or replace the one with this id.
 * @param {{ id?: string, name: string, frets: ChordVoicing['frets'] }} fields
 * @returns {ChordVoicing}
 */
export function saveChordVoicing(fields) {
	const existing = fields.id ? voicings.get(fields.id) : null;
	return voicings.save({ ...existing, ...fields });
}
