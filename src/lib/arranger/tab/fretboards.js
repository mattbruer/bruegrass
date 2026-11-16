/**
 * The fretted instruments TAB is written for, as plain data. A new one is
 * one entry. Strings are listed as TAB draws them, top line first (string
 * 1). `open` is the open string's pitch as the tune is written (MIDI, the
 * piano roll's pitches): guitar and banjo music is written an octave above
 * where it sounds, so their numbers are an octave above the real strings;
 * mandolin music is written where it sounds. `firstFret`: a short string
 * that starts partway up the neck (the banjo's 5th string, at the 5th fret).
 */

/**
 * @typedef {{ name: string, open: number, firstFret?: number }} FretString
 * @typedef {{ id: string, name: string, strings: FretString[], frets: number }} Fretboard
 */

/** @type {readonly Fretboard[]} */
export const FRETBOARDS = Object.freeze([
	{
		id: 'guitar',
		name: 'Guitar',
		strings: [
			{ name: 'e', open: 76 },
			{ name: 'B', open: 71 },
			{ name: 'G', open: 67 },
			{ name: 'D', open: 62 },
			{ name: 'A', open: 57 },
			{ name: 'E', open: 52 }
		],
		frets: 20
	},
	{
		id: 'mandolin',
		name: 'Mandolin',
		strings: [
			{ name: 'E', open: 76 },
			{ name: 'A', open: 69 },
			{ name: 'D', open: 62 },
			{ name: 'G', open: 55 }
		],
		frets: 20
	},
	{
		id: 'banjo',
		name: 'Banjo',
		strings: [
			{ name: 'D', open: 74 },
			{ name: 'B', open: 71 },
			{ name: 'G', open: 67 },
			{ name: 'D', open: 62 },
			{ name: 'g', open: 79, firstFret: 5 }
		],
		frets: 22
	}
]);

/** @param {string} id */
export function fretboard(id) {
	return FRETBOARDS.find((board) => board.id === id) ?? null;
}
