/**
 * The tune as the sheet music shows it: a chord symbol only where the chord
 * changes, and at the start of every section (a `P:` line, or `[P:]` in the
 * music), as the chart
 * draws them (chart/chordChanges.js). Only on the page: the saved ABC keeps
 * every chord symbol as written.
 */

/** A header or field line (T:, w:, V:…): no chord symbols to look at. */
const FIELD_LINE = /^[A-Za-z]:/;
/**
 * Text in quotes over a note: a chord symbol, unless it starts with ^ _ < > @
 * (an annotation). Or a section starting in the music (`[P:Verse]`).
 */
const QUOTED_OR_PART = /\[P:[^\]]*\]|"([^"]*)"/g;
const ANNOTATION = /^[\^_<>@]/;

/** @param {string} abc */
export function chordChangesOnly(abc) {
	/** @type {Map<string, string>} the last chord named in each voice */
	const lastChord = new Map();
	let voice = '';
	return abc
		.split('\n')
		.map((line) => {
			if (line.startsWith('V:')) voice = line.slice(2).trim().split(/\s/)[0];
			if (line.startsWith('P:')) lastChord.delete(voice);
			if (FIELD_LINE.test(line) || line.startsWith('%')) return line;
			return line.replace(QUOTED_OR_PART, (symbol, name) => {
				if (name === undefined) {
					lastChord.delete(voice);
					return symbol;
				}
				if (ANNOTATION.test(name)) return symbol;
				const same = lastChord.get(voice) === name;
				lastChord.set(voice, name);
				return same ? '' : symbol;
			});
		})
		.join('\n');
}
