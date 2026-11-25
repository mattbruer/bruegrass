/**
 * What you've changed about how the guitar plays a chord, saved with the
 * song: each where its chord starts (quarter notes from bar 1, as the song
 * plays) and for which chord (as written, the shape's name). Any part can
 * be left to the band: the shape the hand holds, the string each boom
 * plays, the strings each chuck strums, and any beat played as one picked
 * note instead (a run: the band never plays one of its own), or the whole
 * chord left to a fill you write as a part of the tune (the guitar rests). A change is only played while the
 * same chord is there, so changing the chart quietly drops it.
 */

/**
 * @typedef {(number | null)[]} Shape six frets, low E to high e, null = muted
 * @typedef {{ string: number, fret: number }} PickedNote
 * @typedef {{ shape?: Shape, booms?: number[], chucks?: number[][], notes?: (PickedNote | null)[], fill?: string }} GuitarChange
 *   booms: the string each boom plays, in order; chucks: the strings each chuck strums;
 *   notes: by beat of the chord, the one note played there instead (null: the band's boom or chuck);
 *   fill: the part (a tune voice) that plays a fill here instead: the guitar rests
 * @typedef {Record<string, GuitarChange & { chord: string }>} GuitarEdits
 */

/**
 * What you've changed about the chord starting here.
 * @param {GuitarEdits} edits
 * @param {number} start quarter notes from bar 1
 * @param {string} chord as written
 * @returns {GuitarChange}
 */
export function editedGuitar(edits, start, chord) {
	const edit = edits[String(start)];
	if (!edit || edit.chord !== chord) return {};
	const { shape, booms, chucks, notes, fill } = edit;
	return { shape, booms, chucks, notes, fill };
}

/**
 * The edits with this chord's changes replaced (an empty change: back to the band's own).
 * @param {GuitarEdits} edits
 * @param {number} start
 * @param {string} chord
 * @param {GuitarChange} change
 * @returns {GuitarEdits}
 */
export function withGuitarEdit(edits, start, chord, change) {
	const at = String(start);
	const others = Object.fromEntries(Object.entries(edits).filter(([place]) => place !== at));
	const kept = Object.fromEntries(
		Object.entries(change).filter(([, value]) => value && !isAllEmpty(value))
	);
	return Object.keys(kept).length > 0 ? { ...others, [at]: { chord, ...kept } } : others;
}

/** @param {unknown} value a list with nothing in it (notes all back to the band's) */
function isAllEmpty(value) {
	return Array.isArray(value) && value.every((each) => each === null);
}
