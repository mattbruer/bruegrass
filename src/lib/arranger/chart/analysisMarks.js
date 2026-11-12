/**
 * Your own analysis of a chord, written after it in the chart in braces:
 * `|A7{V7/V}|D|`. It travels with the chord through edits, saves and
 * shares, and the band ignores it. The Roman display shows it instead of
 * the worked-out one (chart/chartAnalysis.js).
 */
import { sectionBlocks } from './sectionBlocks.js';

const MARKED = /^(.*?)\s*\{([^}]*)\}\s*$/;
/* Characters that would break the chart's own syntax */
const NOT_IN_MARKS = /[{}|,[\]"\n]/g;

/**
 * @param {string} text a chord as typed: "A7", "A7{V7/V}", "A7 {V7/V}"
 * @returns {{ chord: string, mark: string | null }}
 */
export function splitMark(text) {
	const match = text.match(MARKED);
	if (!match) return { chord: text, mark: null };
	return { chord: match[1], mark: match[2].trim() || null };
}

/**
 * @param {string} chord
 * @param {string | null} mark null for none
 */
export function withMark(chord, mark) {
	const clean = mark?.replace(NOT_IN_MARKS, '').trim();
	return clean ? `${chord}{${clean}}` : chord;
}

/**
 * The chart with one chord's mark set (or removed, with null). A chord in
 * a repeat (`"Break" as Chorus`) is marked where it's written, in Chorus.
 * @param {string} source the chart
 * @param {{ section: number, measure: number, chord: number }} place as the parser counts them
 * @param {string | null} mark
 */
export function setMark(source, place, mark) {
	const lineIndex = sectionLineIndex(source, place.section);
	if (lineIndex < 0) return source;
	const lines = source.split('\n');
	const match = lines[lineIndex].match(/^(\s*"[^"]+"\s*)(.*)$/);
	if (!match) return source;
	const [, name, content] = match;
	lines[lineIndex] = name + markInContent(content, place, mark);
	return lines.join('\n');
}

/**
 * Which line holds a section's chords, following `as` to the section it repeats.
 * @param {string} source
 * @param {number} section
 */
function sectionLineIndex(source, section) {
	const blocks = sectionBlocks(source);
	const block = blocks[section];
	if (!block) return -1;
	const written = block.content.startsWith('as ')
		? blocks.findIndex((other) => other.name === block.content.slice(3).trim())
		: section;
	let count = -1;
	return source
		.split('\n')
		.findIndex((line) => /^"[^"]+"/.test(line.trim()) && ++count === written);
}

/**
 * The section line's bars with one chord's mark changed. Bars and chords
 * are counted as the parser counts them (empty bars don't count).
 * @param {string} content
 * @param {{ measure: number, chord: number }} place
 * @param {string | null} mark
 */
function markInContent(content, place, mark) {
	let measure = 0;
	let chord = 0;
	const tokens = content.match(/\[[^\]]*\]|\||[^|[]+/g) ?? [];
	return tokens
		.map((token) => {
			if (token === '|') {
				if (chord > 0) measure++;
				chord = 0;
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
					return piece.replace(core, withMark(splitMark(core).chord, mark));
				})
				.join('');
		})
		.join('');
}
