/**
 * The chart with one bar's chords replaced in place, so everything else
 * typed in it (lyrics, repeats, time and key fields, other bars) stays as
 * it is. A bar in a repeat (`"Break" as Chorus`) is changed where it's
 * written, in Chorus.
 */
import { sectionLineIndex } from './sectionBlocks.js';
import { chartTokens, isBar } from './chartTokens.js';

/**
 * @param {string} source the chart
 * @param {{ section: number, measure: number }} place as the parser counts them
 * @param {string} cell the bar's chords as the chart writes them ("G", "G,C")
 */
export function withBarChords(source, place, cell) {
	const lineIndex = sectionLineIndex(source, place.section);
	if (lineIndex < 0) return source;
	const lines = source.split('\n');
	const match = lines[lineIndex].match(/^(\s*"[^"]+"\s*)(.*)$/);
	if (!match) return source;
	const [, name, content] = match;
	lines[lineIndex] = name + cellInContent(content, place.measure, cell);
	return lines.join('\n');
}

/**
 * The section line's bars with one bar's chords swapped. Bars are counted
 * as the parser counts them (`isBar`); fields like `[2/4]` stay. An empty
 * bar gets the chords written into it.
 * @param {string} content
 * @param {number} measure
 * @param {string} cell
 */
function cellInContent(content, measure, cell) {
	let at = 0;
	let hasChords = false;
	let afterBarline = false;
	let written = false;
	return chartTokens(content)
		.map((token) => {
			if (token === '|') {
				const fillEmpty = afterBarline && !hasChords && at === measure && !written;
				if (fillEmpty) written = true;
				if (isBar(hasChords, afterBarline)) at++;
				hasChords = false;
				afterBarline = true;
				return fillEmpty ? cell + token : token;
			}
			if (token.startsWith('[') || !token.trim()) return token;
			hasChords = true;
			if (at !== measure) return token;
			if (written) return '';
			written = true;
			return token.replace(token.trim(), cell);
		})
		.join('');
}
