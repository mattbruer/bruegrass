/**
 * Other ways to sing a generated line: the line written in every harmony
 * style (harmony/harmonyStyles.js), to try by ear. Styles that come out the
 * same for this tune are offered once. An option replaces the whole line
 * but the bars you've locked, and the line keeps that style when it follows
 * its lead and the chords.
 */
import { HARMONY_STYLES } from '../harmony/harmonyStyles.js';
import { generatedParts, withPartsWritten } from '../harmony/generatedParts.js';
import { voiceMusic } from '../harmony/voiceText.js';
import { concertChordAt } from '../../chart/concertChords.js';
import { withKeptBarsFrom } from './freshHarmonyBars.js';

/**
 * @typedef {{ id: string, name: string, abc: string, current: boolean }} HarmonyOption
 *   abc: the whole tune with the line in this style; current: it's sung this way now
 */

/**
 * @param {string} abc
 * @param {import('abcjs').TuneObject | null} tune abcjs's parse of this ABC
 * @param {string} partId a generated line
 * @param {import('./drawnMelody.js').Song} song
 * @param {(abc: string) => any} parse abcjs parseOnly, first tune
 * @returns {HarmonyOption[]}
 */
export function harmonyOptions(abc, tune, partId, song, parse) {
	const part = generatedParts(abc).find((each) => each.id === partId);
	if (song.sections.length === 0 || !tune || !part) return [];
	const chordAt = concertChordAt(song.sections);

	/** @type {Map<string, HarmonyOption>} */
	const byLine = new Map();
	for (const style of HARMONY_STYLES) {
		const written = withPartsWritten(abc, tune, chordAt, [{ ...part, style: style.id }]);
		const range = voiceMusic(written, partId);
		const line = range ? written.slice(range.from, range.to).trim() : '';
		const same = byLine.get(line);
		if (same) {
			same.name += ` / ${style.name}`;
			same.current ||= part.style === style.id;
		} else {
			const current = part.style === style.id;
			byLine.set(line, { id: style.id, name: style.name, current, abc: written });
		}
	}
	const options = [...byLine.values()];
	for (const option of options) option.abc = withKeptBarsFrom(option.abc, abc, parse, [partId]);
	return options;
}
