/**
 * My chords: your own guitar shapes, saved on this device for every song.
 * The one place they're loaded, changed, and handed to the chord book.
 */
import { useYourShapes } from '../instruments/chordBook.js';
import {
	deleteChordVoicing,
	listChordVoicings,
	saveChordVoicing
} from '$lib/storage/chordVoicings.js';

export const myChords = $state({
	/** Every shape, by name. */
	all: /** @type {import('$lib/storage/chordVoicings.js').ChordVoicing[]} */ ([])
});

/** Read them from this device and play them. Call once the page is running. */
export function loadMyChords() {
	myChords.all = listChordVoicings();
	useYourShapes(Object.fromEntries(myChords.all.map((voicing) => [voicing.name, voicing.frets])));
}

/**
 * Save a new shape, or replace one (same id).
 * @param {{ id?: string, name: string, frets: (number | null)[] }} voicing
 */
export function saveMyChord(voicing) {
	saveChordVoicing(voicing);
	loadMyChords();
}

/** @param {string} id */
export function deleteMyChord(id) {
	deleteChordVoicing(id);
	loadMyChords();
}
