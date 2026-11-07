/**
 * The arrangement's chords at concert pitch (as they sound with the capo),
 * the pitch the ABC melody is written at.
 */
import { withoutVariant } from '../instruments/chordBook.js';
import { chordLabel, songKey } from './key.js';
import { slotPositions } from './timeline.js';

const EPSILON = 1e-6;

/**
 * A chord as written on the chart (a guitar shape), at concert pitch.
 * @param {string} name e.g. "G", "G:high"
 * @param {import('./key.js').Key | null} key the song's key
 * @param {number} capo
 */
export function concertChord(name, key, capo) {
	return chordLabel(withoutVariant(name), { key, shift: capo, mode: 'concert' });
}

/**
 * What the band plays at any moment of one pass. Before bar 1 (a pickup)
 * it's the last chord, the one the pickup leads out of when the song loops.
 * @param {import('./timeline.js').Section[]} sections
 * @param {number} capo
 * @returns {(time: number) => string | null} time in quarter notes from bar 1
 */
export function concertChordAt(sections, capo) {
	const slots = slotPositions(sections);
	const key = songKey(sections);
	return (time) => {
		const slot =
			time < 0 ? slots.at(-1) : (slots.findLast((s) => s.start <= time + EPSILON) ?? slots[0]);
		return slot ? concertChord(slot.name, key, capo) : null;
	};
}
