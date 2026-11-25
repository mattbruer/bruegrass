/**
 * Whether the band can play a chord: N.C., or a name the chord book has a
 * shape for (built in, or built from its notes). The one place a typed chord is
 * checked, wherever it was typed (the chart, Transcribe).
 */
import { hasShape } from '../instruments/chordBook.js';
import { splitMark } from './analysisMarks.js';
import { splitHit } from './hits.js';
import { isNoChord } from './noChord.js';

/** @param {string} name as typed, maybe with marks: "A7", "A7{V7/V}", "G~", "G/B", "N.C." */
export function isKnownChord(name) {
	const { chord } = splitHit(splitMark(name.trim()).chord);
	return isNoChord(chord) || hasShape(chord);
}

/**
 * What to tell you about a chord the band can't play.
 * @param {string} name
 * @param {string} [where] e.g. "Verse, bar 3"
 */
export function unknownChordMessage(name, where) {
	const place = where ? ` (${where})` : '';
	return `"${name}"${place} isn't a chord the band can play. Use one like G, Am, D7 or Bdim.`;
}

/**
 * What's wrong with one chord box ('' when nothing is): it holds one chord
 * the band can play, or nothing.
 * @param {string} text
 */
export function chordBoxProblem(text) {
	const name = text.trim();
	if (!name) return '';
	if (/[\s,|]/.test(name)) return 'One chord per box.';
	return isKnownChord(name) ? '' : unknownChordMessage(name);
}

/**
 * The first chord in the chart the band can't play, worded ('' when there's none).
 * @param {import('./timeline.js').Section[]} sections
 */
export function unknownChordProblem(sections) {
	for (const section of sections) {
		for (const [index, bar] of section.measures.entries()) {
			const unknown = bar.find((name) => !isKnownChord(name));
			if (unknown) return unknownChordMessage(unknown, `${section.name}, bar ${index + 1}`);
		}
	}
	return '';
}
