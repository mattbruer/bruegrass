/**
 * One bar's syllables onto its notes. The bar's own words go on its first
 * notes, in order; a following section's pickup goes on its last notes. A
 * note tied from the one before holds the syllable; a note left over after
 * a syllable holds it too (a melisma); notes before any word are unsung.
 *
 * @typedef {import('./syllables.js').Syllable} Syllable
 * @typedef {{ kind: 'syllable', syllable: Syllable } | { kind: 'hold' } | { kind: 'unsung' }} Token
 */

/**
 * @param {{ tied: boolean }[]} notes the bar's sung notes (not rests), in order
 * @param {Syllable[]} own
 * @param {Syllable[]} pickup sung at the end of this bar, leading into the next section
 * @returns {{ tokens: Token[], leftOver: Syllable[] }} one token per note
 */
export function placeInBar(notes, own, pickup) {
	const free = notes.flatMap((note, i) => (note.tied ? [] : [i]));
	/** @type {Map<number, Syllable>} */
	const placed = new Map();
	let leftOver = /** @type {Syllable[]} */ ([]);

	if (own.length + pickup.length > free.length) {
		const all = [...own, ...pickup];
		free.forEach((i, k) => placed.set(i, all[k]));
		leftOver = all.slice(free.length);
	} else {
		own.forEach((syllable, k) => placed.set(free[k], syllable));
		const firstPickup = free.length - pickup.length;
		pickup.forEach((syllable, k) => placed.set(free[firstPickup + k], syllable));
	}

	let sungYet = false;
	const tokens = notes.map((note, i) => {
		const syllable = placed.get(i);
		if (syllable) {
			sungYet = true;
			return /** @type {Token} */ ({ kind: 'syllable', syllable });
		}
		return /** @type {Token} */ (note.tied || sungYet ? { kind: 'hold' } : { kind: 'unsung' });
	});

	return { tokens, leftOver };
}
