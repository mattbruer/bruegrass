/**
 * What the open song's bass line is written from: its chart and key.
 */

/** @typedef {import('./bassAbc.js').BassSong} BassSong */

/**
 * @param {{
 *   arrangement: { sections: any[], key: any },
 *   melodyKey: BassSong['melodyKey']
 * }} arranger
 * @returns {BassSong}
 */
export function bassSongOf({ arrangement, melodyKey }) {
	return {
		sections: arrangement.sections,
		songKey: arrangement.key,
		melodyKey
	};
}
