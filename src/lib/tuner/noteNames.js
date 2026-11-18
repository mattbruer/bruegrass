/** Note names as a tuner shows them: sharps, and the octave as players number it (A4 = 440). */
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** @param {number} midi */
export function noteName(midi) {
	const name = NAMES[((midi % 12) + 12) % 12];
	return { letter: name[0], accidental: name.slice(1), octave: Math.floor(midi / 12) - 1 };
}
