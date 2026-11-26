/**
 * The arrangement's chords as they sound, for the tune (ABC, in the chart's own key)
 * and for the instruments that play concert pitch.
 */
import { withoutVariant } from '../instruments/chordBook.js';
import { chordLabel } from './key.js';
import { slotPositions } from './timeline.js';
import { isNoChord } from './noChord.js';

const EPSILON = 1e-6;

/**
 * A chord of the chart as it sounds with the song moved by some semitones.
 * @param {string} name e.g. "G", "G:high"
 * @param {import('./key.js').Key | null} key the key it's in (the song's, or one a [K:] named)
 * @param {number} shift semitones (the Key setting)
 */
export function concertChord(name, key, shift) {
	return chordLabel(withoutVariant(name), { key, shift, mode: 'concert' });
}

/**
 * What the band plays at any moment of one pass, the chart's chords as written. Before bar 1 (a pickup)
 * it's the last chord, the one the pickup leads out of when the song loops.
 * @param {import('./timeline.js').Section[]} sections
 * @returns {(time: number) => string | null} time in quarter notes from bar 1
 */
export function concertChordAt(sections) {
	const slots = slotPositions(sections);
	return (time) => {
		const slot =
			time < 0 ? slots.at(-1) : (slots.findLast((s) => s.start <= time + EPSILON) ?? slots[0]);
		return slot && !isNoChord(slot.name) ? withoutVariant(slot.name) : null;
	};
}
