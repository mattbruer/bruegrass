/**
 * A chord shape typed as frets, lowest string first: `3,x,0,0,3,3` on the
 * guitar, or `3x0033` when every fret is a single digit (easier on a
 * phone); brackets around it are fine (`[5,3,2,x]`). x (or -) is a muted
 * string. The instrument says how many strings and frets.
 */
import { MAX_FRET } from '../instruments/guitar.js';

/**
 * @typedef {{ strings: number, maxFret: number, order: string, example: string }} FrettedNeck
 *   order: how the strings run, in words; example: a shape, as typed
 */

/** @type {FrettedNeck} */
const GUITAR = { strings: 6, maxFret: MAX_FRET, order: 'low E to high e', example: '3,x,0,0,3,3' };

const COUNTS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/**
 * @param {string} text
 * @param {FrettedNeck} [neck]
 * @returns {{ frets: (number | null)[] | null, error: string }}
 */
export function readFrets(text, neck = GUITAR) {
	const trimmed = text
		.trim()
		.replace(/^\[|\]$/g, '')
		.trim();
	if (trimmed === '') return { frets: null, error: '' };

	const parts = /[\s,]/.test(trimmed) ? trimmed.split(/[\s,]+/).filter(Boolean) : [...trimmed];
	if (parts.length !== neck.strings) {
		return {
			frets: null,
			error: `${COUNTS[neck.strings] ?? neck.strings} frets, ${neck.order}, like ${neck.example} (that's ${parts.length})`
		};
	}

	/** @type {(number | null)[]} */
	const frets = [];
	for (const part of parts) {
		if (/^[xX-]$/.test(part)) {
			frets.push(null);
			continue;
		}
		if (!/^\d+$/.test(part))
			return { frets: null, error: `“${part}” isn't a fret: use 0–${neck.maxFret} or x` };
		const fret = Number(part);
		if (fret > neck.maxFret)
			return { frets: null, error: `Fret ${fret} is past fret ${neck.maxFret}` };
		frets.push(fret);
	}
	return { frets, error: '' };
}

/**
 * @param {(number | null)[]} frets
 * @returns {string} e.g. "3,x,0,0,3,3"
 */
export function writeFrets(frets) {
	return frets.map((fret) => (fret === null ? 'x' : String(fret))).join(',');
}
