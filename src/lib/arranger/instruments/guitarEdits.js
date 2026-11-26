/**
 * What you've changed about how the guitar plays a chord, saved with the
 * song: each where its chord starts (quarter notes from bar 1, as the song
 * plays) and for which chord (as written, the shape's name). Any part can
 * be left to the band: the shape the hand holds, the string each boom
 * plays, the strings each chuck strums, and any beat played as one picked
 * note instead (a run: the band never plays one of its own), or the last bars of the
 * chord played as a fill you write instead (guitarFill.js). A change is only played while the
 * same chord is there, so changing the chart quietly drops it.
 */

/**
 * @typedef {(number | null)[]} Shape six frets, low E to high e, null = muted
 * @typedef {{ string: number, fret: number }} PickedNote
 * @typedef {{ shape?: Shape, madeAt?: number, booms?: (PickedNote | null)[], chucks?: number[][], notes?: (PickedNote | null)[], accents?: boolean[], slurs?: (import('./slurs.js').SlurEdit | null)[], strums?: (StrumEdit | null)[], fill?: import('./guitarFill.js').Fill }} GuitarChange
 *   madeAt: the guitar's shift (Key less capo) the shape and picked notes were written at: at another they move (guitarPlan.js);
 *   booms: the note each boom plays, in order, on any fret (null: the band's); chucks: the strings each chuck strums;
 *   notes: by beat of the chord, the one note played there instead (null: the band's boom or chuck);
 *   accents: by beat of the chord, played louder (true) or as the band does;
 *   strums: by beat of the chord, a strum of your own (StrumEdit), null: the band's;
 *   slurs: by beat of the chord, a slur on a string (slurs.js: a hammer-on or pull-off), null: none;
 *   fill: notes you wrote, played instead of the band's strum over the chord's last bars
 * @typedef {{ strings: number[], end: 'chuck' | 'ring' | 'choke' }} StrumEdit
 *   a strum of your own on a beat, whatever the band plays there: the strings (low first) and how it ends:
 *   a chuck (rings like the band's), held (`~`: rings, the guitar plays no more until the next chord), choked (`!`:
 *   muted a beat later, then no more until the next chord)
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
	const { shape, madeAt, chucks, notes, accents, slurs, strums, fill } = edit;
	return {
		shape,
		madeAt,
		booms: pickedBooms(edit.booms),
		chucks,
		notes,
		accents,
		slurs,
		strums,
		fill
	};
}

/**
 * Booms saved as notes; one saved the old way (a string only) is the band's again.
 * @param {unknown[] | undefined} booms
 */
function pickedBooms(booms) {
	return booms?.map((boom) =>
		boom && typeof boom === 'object' ? /** @type {PickedNote} */ (boom) : null
	);
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
	return Array.isArray(value) && value.every((each) => each === null || each === false);
}
