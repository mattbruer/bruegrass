/**
 * The keys a singer can move the song to, for the Key menu.
 */
import { keyName } from './key.js';

/* How far the Key menu reaches from the song's key, in semitones */
const SEMITONES_DOWN = 5;
const SEMITONES_UP = 6;

/**
 * Each key the song can be moved to: how many semitones that is (the
 * `transpose` setting) and the key's name as it would sound with this capo.
 * @param {import('./key.js').Key | null} key the song's key, as written
 * @param {number} capo
 * @returns {{ transpose: number, name: string }[]}
 */
export function keyChoicesFor(key, capo) {
	if (!key) return [];

	const choices = [];
	for (let transpose = -SEMITONES_DOWN; transpose <= SEMITONES_UP; transpose++) {
		const name = keyName(key, capo + transpose);
		choices.push({ transpose, name: transpose === 0 ? `${name} (original)` : name });
	}
	return choices;
}
