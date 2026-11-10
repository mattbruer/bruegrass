/**
 * Where a harmony note could go instead: the other notes of the chord
 * sounding under it, near where it is. There's no one right harmony, so
 * the roll shows these as dots to pick from.
 */
import { chordFromName, chordTones, semitones } from '../../theory/musicInKey.js';
import { MELODY_ROWS } from './pitchRows.js';

/** How far from the note to offer chord tones, in semitones each way. */
const OPTION_RANGE = 7;

/**
 * @param {string | null} chord the concert chord under the note ("G", "D7")
 * @param {import('../../theory/musicInKey.js').Key} spelling the tune's key
 * @param {number} midi the note now
 * @param {import('./pitchRows.js').RowRange} [range] the roll's rows
 * @returns {number[]} pitches it could move to
 */
export function chordToneOptions(chord, spelling, midi, range = MELODY_ROWS) {
	const parsed = chord ? chordFromName(spelling, chord) : null;
	if (!parsed) return [];
	const pitchClasses = chordTones(parsed).map((note) => mod12(spelling.pc + semitones(note)));
	const options = [];
	for (let pitch = midi - OPTION_RANGE; pitch <= midi + OPTION_RANGE; pitch++) {
		const inRange = pitch >= range.lowest && pitch <= range.highest;
		if (inRange && pitch !== midi && pitchClasses.includes(mod12(pitch))) options.push(pitch);
	}
	return options;
}

/** @param {number} n */
function mod12(n) {
	return ((n % 12) + 12) % 12;
}
