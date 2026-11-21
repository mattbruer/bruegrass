/**
 * Your own analysis of a chord, written after it in the chart in braces:
 * `|A7{V7/V}|D|`. It travels with the chord through edits, saves and
 * shares, and the band ignores it. The Roman display shows it instead of
 * the worked-out one (chart/chartAnalysis.js).
 */
import { rewriteChordAt } from './chordAt.js';

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
 * The chart with one chord's mark set (or removed, with null).
 * @param {string} source the chart
 * @param {{ section: number, measure: number, chord: number }} place as the parser counts them
 * @param {string | null} mark
 */
export function setMark(source, place, mark) {
	return rewriteChordAt(source, place, (written) => withMark(splitMark(written).chord, mark));
}
