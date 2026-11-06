/**
 * The notes of a chord voicing, for a checklist: which string sounds at
 * which fret. A voicing is one fret per string, low to high, with `null`
 * for a muted string (the shape `guitar-chords.json` uses, and what the
 * voicing engine will hand over later).
 *
 *   voicingNotes([3, null, 0, 0, 3, 3], STANDARD_TUNING, ['D', 'G', 'B', 'ee'])
 *   → D open, G open, B fret 3, high e fret 3
 */

/**
 * @param {(number | null)[]} voicing
 * @param {import('./guitar.js').InstrumentString[]} strings
 * @param {string[]} stringIds only these strings (muted ones are left out anyway)
 * @returns {import('./guitar.js').Note[]}
 */
export function voicingNotes(voicing, strings, stringIds) {
	return strings.flatMap((string, index) => {
		const fret = voicing[index];
		if (fret === null || fret === undefined || !stringIds.includes(string.id)) return [];
		return [{ stringId: string.id, fret }];
	});
}
