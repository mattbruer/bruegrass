/**
 * Notes sounded together, written in ABC as one chord in a whole note, each
 * spelled as given (B♭, not A♯), for drawing on a staff. The guitar's clef
 * (`treble-8`) draws them an octave above how they sound, as guitar music is written.
 */

const LETTERS = 'CDEFGAB';
const SIGNS = { '-2': '__', '-1': '_', 0: '', 1: '^', 2: '^^' };

/**
 * @typedef {{ pitch: number, letter: number, accidental: number }} SpelledNote
 *   pitch: MIDI; letter: index into C D E F G A B; accidental: in semitones
 */

/**
 * @param {SpelledNote[]} notes
 * @param {'treble' | 'treble-8'} [clef]
 * @returns {string} ABC
 */
export function chordAbc(notes, clef = 'treble') {
	const chord = notes.map(abcNote).join('');
	return `X:1\nL:1\nK:C clef=${clef}\n[${chord}]|\n`;
}

/** @param {SpelledNote} note */
function abcNote({ pitch, letter, accidental }) {
	const octave = Math.floor((pitch - accidental) / 12) - 1; // middle C is C4
	const name = LETTERS[letter];
	const written =
		octave >= 5 ? name.toLowerCase() + "'".repeat(octave - 5) : name + ','.repeat(4 - octave);
	return SIGNS[/** @type {keyof SIGNS} */ (String(accidental))] + written;
}
