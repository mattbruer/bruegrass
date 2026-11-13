/**
 * The tune's ABC read once with abcjs, for everything that needs it: the
 * band, the piano roll, harmony, the chord conversions. (The sheet music
 * draws it separately: abcjs can only draw from text.)
 */

/**
 * @typedef {{
 *   tune: import('abcjs').TuneObject | null,
 *   sequence: any[][] | null,
 *   warnings: string[]
 * }} ReadTune
 *   tune: the parsed tune (melody notes, voices, title)
 *   sequence: the tune as played, repeats played out (for its chord symbols)
 *   warnings: problems abcjs found in the notation, as plain text
 */

/** @type {ReadTune} */
export const NO_TUNE = Object.freeze({ tune: null, sequence: null, warnings: [] });

/**
 * @param {any} abcjs null while it's still loading
 * @param {string} abc
 * @returns {ReadTune}
 */
export function readTune(abcjs, abc) {
	if (!abcjs || !abc.trim()) return NO_TUNE;
	const tune = tryOrNull(() => abcjs.parseOnly(abc)[0]);
	if (!tune) return NO_TUNE;
	return {
		tune,
		sequence: tryOrNull(() => abcjs.synth.sequence(tune, {})),
		warnings: (tune.warnings ?? []).map(withoutHtml)
	};
}

/** abcjs warnings come as HTML snippets; show them as plain text. */
function withoutHtml(/** @type {string} */ warning) {
	return warning.replace(/<[^>]*>/g, '');
}

/**
 * @template T
 * @param {() => T} read
 * @returns {T | null}
 */
function tryOrNull(read) {
	try {
		return read();
	} catch {
		return null; // unusual notation abcjs can't play
	}
}
