/**
 * Chops you've changed by hand, saved with the song: each where its chord
 * starts (quarter notes from bar 1, as the song plays) and for which chord
 * (as it sounds, `chopChord` in mandolin.js). A changed chop is only
 * played while the same chord is there, so changing the chart or
 * the key quietly drops it and the band's own chop comes back.
 */

/**
 * @typedef {(number | null)[]} Frets G D A E, null = muted
 * @typedef {Record<string, { chord: string, frets: Frets }>} ChopEdits
 */

/**
 * Your chop for the chord starting here, if you've changed it.
 * @param {ChopEdits} edits
 * @param {number} start quarter notes from bar 1
 * @param {string} chord
 * @returns {Frets | null}
 */
export function editedChop(edits, start, chord) {
	const edit = edits[String(start)];
	return edit && edit.chord === chord ? edit.frets : null;
}

/**
 * The edits with this chop changed (frets null: back to the band's own).
 * @param {ChopEdits} edits
 * @param {number} start
 * @param {string} chord
 * @param {Frets | null} frets
 * @returns {ChopEdits}
 */
export function withChopEdit(edits, start, chord, frets) {
	const at = String(start);
	const others = Object.fromEntries(Object.entries(edits).filter(([place]) => place !== at));
	return frets ? { ...others, [at]: { chord, frets } } : others;
}
