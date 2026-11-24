/**
 * Where one bar is written in the chart text, as character offsets, for
 * pointing at it (the bar playing now). A bar in a repeat (`"Break" as
 * Chorus`) is found where it's written, in Chorus. Bars are counted as the
 * parser counts them (`isBar`).
 */
import { sectionLineIndex } from './sectionBlocks.js';
import { chartTokens, isBar } from './chartTokens.js';

const SECTION_LINE = /^(\s*"[^"]+"\s*)(.*)$/;

/**
 * @param {string} source the chart
 * @param {{ section: number, measure: number }} place as the parser counts them
 * @returns {{ from: number, to: number } | null}
 */
export function barSpan(source, place) {
	const lineIndex = sectionLineIndex(source, place.section);
	if (lineIndex < 0) return null;
	const lines = source.split('\n');
	const match = lines[lineIndex].match(SECTION_LINE);
	if (!match) return null;
	const lineStart = lines.slice(0, lineIndex).reduce((sum, line) => sum + line.length + 1, 0);
	const span = spanInContent(match[2], place.measure);
	if (!span) return null;
	const offset = lineStart + match[1].length;
	return { from: offset + span.from, to: offset + span.to };
}

/**
 * The bar's chords within a section line's content, without the spaces
 * around them. An empty bar (`|G| |`) is its gap, or its closing barline
 * when there's no gap (`||`).
 * @param {string} content
 * @param {number} measure
 */
function spanInContent(content, measure) {
	let at = 0;
	let position = 0;
	let barStart = 0;
	let hasChords = false;
	let afterBarline = false;
	for (const token of [...chartTokens(content), null]) {
		const closesBar = token === '|' || (token === null && hasChords);
		if (closesBar) {
			if (isBar(hasChords, afterBarline)) {
				if (at === measure) return trimmed(content, barStart, position);
				at++;
			}
			hasChords = false;
			afterBarline = true;
			barStart = position + 1;
		} else if (token && !token.startsWith('[') && token.trim()) {
			hasChords = true;
		}
		position += token?.length ?? 0;
	}
	return null;
}

/**
 * @param {string} content
 * @param {number} from
 * @param {number} to where the bar's closing barline is
 */
function trimmed(content, from, to) {
	const text = content.slice(from, to);
	if (!text.trim()) return text ? { from, to } : { from: to, to: to + 1 };
	const lead = text.length - text.trimStart().length;
	const trail = text.length - text.trimEnd().length;
	return { from: from + lead, to: to - trail };
}
