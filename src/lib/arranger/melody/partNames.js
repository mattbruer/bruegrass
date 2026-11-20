/**
 * What each part of a song is called: the name you gave it (the song's
 * `partNames`, part id → name), else its own (Melody, Tenor, Bass, Part 1).
 * The one place a part's name is decided, for the lanes, the piano roll,
 * the mixer and the MIDI file.
 */
import { HARMONY_PARTS } from './harmony/harmonyParts.js';
import { EXTRA_PARTS } from './extraParts.js';
import { MELODY_CHANNEL } from './harmony/partChannels.js';
import { BASS_VOICE } from '../bass/readBass.js';

/** @typedef {Record<string, string>} PartNames part id → the name you gave it */

/** The longest name a part can be given. */
export const PART_NAME_LENGTH = 30;

const OWN_NAMES = new Map([
	[MELODY_CHANNEL, 'Melody'],
	[BASS_VOICE, 'Bass'],
	...HARMONY_PARTS.map((part) => /** @type {[string, string]} */ ([part.id, part.name])),
	...EXTRA_PARTS.map((part) => /** @type {[string, string]} */ ([part.id, part.name]))
]);

/**
 * @param {string} id
 * @param {PartNames} [names]
 * @param {string} [otherwise] the name of a channel that isn't a part (the guitar's strip)
 */
export function partName(id, names = {}, otherwise = id) {
	return names[id]?.trim() || OWN_NAMES.get(id) || otherwise;
}

/** @param {string} id */
export function ownName(id) {
	return OWN_NAMES.get(id) ?? id;
}

/**
 * The names with one part's changed; a blank name (or its own) goes back to its own.
 * @param {PartNames} names
 * @param {string} id
 * @param {string} name
 * @returns {PartNames}
 */
export function withPartName(names, id, name) {
	const rest = { ...names };
	delete rest[id];
	const trimmed = name.trim().slice(0, PART_NAME_LENGTH);
	return trimmed && trimmed !== ownName(id) ? { ...rest, [id]: trimmed } : rest;
}
