/**
 * A chord shape typed as frets, low E to high e: `3,x,0,0,3,3`, or
 * `3x0033` when every fret is a single digit (easier on a phone).
 * x (or -) is a muted string.
 */
import { MAX_FRET } from '../instruments/guitar.js';

const STRINGS = 6;
const EXAMPLE = '3,x,0,0,3,3';

/**
 * @param {string} text
 * @returns {{ frets: (number | null)[] | null, error: string }}
 */
export function readFrets(text) {
	const trimmed = text.trim();
	if (trimmed === '') return { frets: null, error: '' };

	const parts = /[\s,]/.test(trimmed) ? trimmed.split(/[\s,]+/).filter(Boolean) : [...trimmed];
	if (parts.length !== STRINGS) {
		return {
			frets: null,
			error: `Six frets, low E to high e, like ${EXAMPLE} (that's ${parts.length})`
		};
	}

	/** @type {(number | null)[]} */
	const frets = [];
	for (const part of parts) {
		if (/^[xX-]$/.test(part)) {
			frets.push(null);
			continue;
		}
		if (!/^\d+$/.test(part)) return { frets: null, error: `“${part}” isn't a fret: use 0–12 or x` };
		const fret = Number(part);
		if (fret > MAX_FRET) return { frets: null, error: `Fret ${fret} is past fret ${MAX_FRET}` };
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
