/**
 * What a chord edit means for the harmony parts. A part is "as written"
 * when it's exactly what one of the harmony styles writes for the melody
 * over the chords it was written for; otherwise it was changed by hand.
 * Rewriting writes each whole part fresh for the chords now, in its own
 * style (a hand-changed part in the stack), so the lines flow again.
 */
import { harmonyPartsIn, withHarmonies } from './harmony/writeHarmonies.js';
import { HARMONY_STYLES } from './harmony/harmonyStyles.js';
import { partBlockText, withPartsKept } from './harmony/keepParts.js';

/**
 * @typedef {import('./harmony/writeHarmonies.js').ChordAt} ChordAt
 * @typedef {{ id: string, style: string | null }} PartNow style: the style it's
 *   written in, null when it was changed by hand
 */

const DEFAULT_STYLE = 'stack';

/**
 * The parts the chords now would change.
 * @param {string} abc
 * @param {any} tune abcjs's parse of this ABC
 * @param {ChordAt[]} writtenFor the chords the parts may have been written for
 * @param {ChordAt} chordNow
 * @returns {PartNow[]}
 */
export function partsOffTheChords(abc, tune, writtenFor, chordNow) {
	return harmonyPartsIn(abc)
		.map((id) => ({ id, style: styleOf(abc, tune, id, writtenFor) }))
		.filter(({ id, style }) => written(abc, tune, chordNow, id, style) !== partBlockText(abc, id));
}

/**
 * The ABC with these parts written fresh for the chords now.
 * @param {string} abc
 * @param {any} tune
 * @param {PartNow[]} parts
 * @param {ChordAt} chordNow
 */
export function withPartsRewritten(abc, tune, parts, chordNow) {
	const styles = Object.fromEntries(parts.map(({ id, style }) => [id, style ?? DEFAULT_STYLE]));
	const keep = harmonyPartsIn(abc).filter((id) => !(id in styles));
	const fresh = withHarmonies(abc, tune, chordNow, harmonyPartsIn(abc), styles).abc;
	return withPartsKept(fresh, abc, keep);
}

/**
 * The style a part is written in over any of these chords, or null.
 * @param {string} abc
 * @param {any} tune
 * @param {string} id
 * @param {ChordAt[]} writtenFor
 */
function styleOf(abc, tune, id, writtenFor) {
	const now = partBlockText(abc, id);
	const match = HARMONY_STYLES.find((style) =>
		writtenFor.some((chordAt) => written(abc, tune, chordAt, id, style.id) === now)
	);
	return match?.id ?? null;
}

/**
 * One part as a style writes it.
 * @param {string} abc
 * @param {any} tune
 * @param {ChordAt} chordAt
 * @param {string} id
 * @param {string | null} style
 */
function written(abc, tune, chordAt, id, style) {
	const fresh = withHarmonies(abc, tune, chordAt, [id], { [id]: style ?? DEFAULT_STYLE }).abc;
	return partBlockText(fresh, id);
}
