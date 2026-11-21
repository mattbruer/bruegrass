/**
 * Rewriting one chord in the chart text, found by where it's written
 * (section, bar, chord in the bar). Everything else stays as typed.
 */
import { sectionLineIndex } from './sectionBlocks.js';
import { chartTokens, isBar } from './chartTokens.js';

/**
 * @param {string} source the chart
 * @param {{ section: number, measure: number, chord: number }} place as the parser counts them
 * @param {(written: string) => string} rewrite gets the chord as typed (its mark too), returns its new text
 * @returns {string} the chart, unchanged if the place isn't there
 */
export function rewriteChordAt(source, place, rewrite) {
	const lineIndex = sectionLineIndex(source, place.section);
	if (lineIndex < 0) return source;
	const lines = source.split('\n');
	// A chord in a repeat (`"Break" as Chorus`) is written in its own section line
	const match = lines[lineIndex].match(/^(\s*"[^"]+"\s*)(.*)$/);
	if (!match) return source;
	const [, name, content] = match;
	lines[lineIndex] = name + rewriteInContent(content, place, rewrite);
	return lines.join('\n');
}

/**
 * The section line's bars with one chord rewritten. Bars and chords are
 * counted as the parser counts them (`isBar`).
 * @param {string} content
 * @param {{ measure: number, chord: number }} place
 * @param {(written: string) => string} rewrite
 */
function rewriteInContent(content, place, rewrite) {
	let measure = 0;
	let chord = 0;
	let afterBarline = false;
	return chartTokens(content)
		.map((token) => {
			if (token === '|') {
				if (isBar(chord > 0, afterBarline)) measure++;
				chord = 0;
				afterBarline = true;
				return token;
			}
			if (token.startsWith('[')) return token;
			return token
				.split(/(,)/)
				.map((piece) => {
					if (piece === ',' || !piece.trim()) return piece;
					const here = measure === place.measure && chord === place.chord;
					chord++;
					if (!here) return piece;
					const core = piece.trim();
					return piece.replace(core, rewrite(core));
				})
				.join('');
		})
		.join('');
}
