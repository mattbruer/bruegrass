/**
 * Other ways to sing a harmony part: the part written in every harmony
 * style (harmony/harmonyStyles.js), to try by ear. Styles that come out the
 * same for this tune are offered once. An option can replace the whole
 * line, or just some bars of it, leaving the rest (hand edits included).
 */
import { HARMONY_STYLES } from '../harmony/harmonyStyles.js';
import { withHarmonies } from '../harmony/writeHarmonies.js';
import { partBlockText, withPartFrom } from '../harmony/keepParts.js';
import { concertChordAt } from '../../chart/concertChords.js';
import { withPartBars } from './freshHarmonyBars.js';

/**
 * @typedef {{ id: string, name: string, abc: string, current: boolean }} HarmonyOption
 *   abc: the whole tune with this part's line in this style; current: the
 *   part is already sung this way
 */

/**
 * @param {string} abc
 * @param {string} partId
 * @param {import('./drawnMelody.js').Song} song
 * @returns {Promise<HarmonyOption[]>}
 */
export async function harmonyOptions(abc, partId, song) {
	if (song.sections.length === 0) return [];
	const parse = await parser();
	const tune = parse(abc);
	if (!tune) return [];
	const chordAt = concertChordAt(song.sections, song.capo);
	const now = partBlockText(abc, partId);

	/** @type {Map<string, HarmonyOption>} */
	const byLine = new Map();
	for (const style of HARMONY_STYLES) {
		const written = withHarmonies(abc, tune, chordAt, [partId], { [partId]: style.id }).abc;
		const line = partBlockText(written, partId);
		const same = byLine.get(line);
		if (same) same.name += ` / ${style.name}`;
		else {
			const option = { id: style.id, name: style.name, current: line === now, abc: '' };
			option.abc = withPartFrom(abc, written, partId);
			byLine.set(line, option);
		}
	}
	return [...byLine.values()];
}

/**
 * The tune with this option sung in the given bars of the part (or all of it).
 * @param {string} abc
 * @param {HarmonyOption} option made from this ABC
 * @param {string} partId
 * @param {Set<number> | null} bars null: the whole line
 */
export async function withOption(abc, option, partId, bars) {
	if (!bars) return withPartFrom(abc, option.abc, partId);
	return withPartBars(abc, option.abc, await parser(), [partId], bars);
}

async function parser() {
	const { default: abcjs } = await import('abcjs');
	return (/** @type {string} */ text) => abcjs.parseOnly(text)[0];
}
