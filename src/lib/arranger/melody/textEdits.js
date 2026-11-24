/**
 * Changes to a text, each placed by where it was in the original, made
 * together so one doesn't move the others.
 * @typedef {{ from: number, to: number, put: string }} TextEdit
 *   replaces text from..to (from === to: inserts at from)
 */

/**
 * @param {string} text
 * @param {TextEdit[]} edits none overlapping
 */
export function withEdits(text, edits) {
	// From the end, so earlier places still hold; at one place, the longer change first
	const lastFirst = edits.toSorted((a, b) => b.from - a.from || b.to - a.to);
	let edited = text;
	for (const { from, to, put } of lastFirst)
		edited = edited.slice(0, from) + put + edited.slice(to);
	return edited;
}
