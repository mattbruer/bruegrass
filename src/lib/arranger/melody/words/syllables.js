/**
 * Words as sung syllables: split at spaces, and inside a word at a hyphen
 * (`sun-ny` is two syllables, sung on two notes; `to-` at the end of a bar
 * goes on into the next one).
 *
 * @typedef {{ text: string, continues: boolean }} Syllable
 *   continues: the word goes on into the next syllable
 */

/**
 * @param {string} words
 * @returns {Syllable[]}
 */
export function syllablesOf(words) {
	return words
		.split(/\s+/)
		.filter(Boolean)
		.flatMap((word) => {
			const parts = word.split('-').filter(Boolean);
			// A hyphen at the end carries the word on into the next bar: `to-|day`
			const carriesOn = word.endsWith('-');
			return parts.map((text, i) => ({
				text: plain(text),
				continues: i < parts.length - 1 || carriesOn
			}));
		});
}

/** Characters that mean something else in an ABC `w:` line are left out. @param {string} text */
function plain(text) {
	return text.replace(/[_*~|\\]/g, '');
}
