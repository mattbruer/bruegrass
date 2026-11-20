/**
 * What the open song's bass line is written from: its chart, key and capo.
 */

/** @typedef {import('./bassAbc.js').BassSong} BassSong */

/**
 * @param {{
 *   arrangement: { sections: any[], key: any, capoFret: number },
 *   melodyKey: BassSong['melodyKey']
 * }} arranger
 * @returns {BassSong}
 */
export function bassSongOf({ arrangement, melodyKey }) {
	return {
		sections: arrangement.sections,
		songKey: arrangement.key,
		capo: arrangement.capoFret,
		melodyKey
	};
}
