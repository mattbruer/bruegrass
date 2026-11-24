/**
 * The tune as the sheet music shows it: an unmarked section's `P:` line is
 * kept (it still starts a part) but drawn with no name. Only on the page.
 */
import { UNMARKED_SECTION } from '../chart/unmarkedSection.js';

/** @param {string} abc */
export function unmarkedPartsUnnamed(abc) {
	return abc
		.split('\n')
		.map((line) => (line.trim() === `P:${UNMARKED_SECTION}` ? 'P:' : line))
		.join('\n');
}
