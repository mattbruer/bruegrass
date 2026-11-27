/**
 * What each part of a song is called: the name you gave it (the song's
 * `partNames`, part id → name), else its own (Melody, Tenor, Bass, Part 1).
 * The one place a part's name is decided, for the lanes, the piano roll,
 * the mixer and the MIDI file. A generated line isn't named by you: its
 * name is its lead's and where it sits ("Vocal above"), so renaming the
 * lead renames it.
 */
import { EXTRA_PARTS } from './extraParts.js';
import { MELODY_CHANNEL } from './harmony/partChannels.js';
import { BASS_VOICE } from '../bass/readBass.js';
import { generatedName } from './harmony/harmonyParts.js';

/** @typedef {Record<string, string>} PartNames part id → the name you gave it */

/** The longest name a part can be given. */
export const PART_NAME_LENGTH = 30;

const OWN_NAMES = new Map([
	[MELODY_CHANNEL, 'Melody'],
	[BASS_VOICE, 'Bass'],
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

/**
 * Every part's name, the generated lines' worked out from their leads'.
 * @param {PartNames} names the names you gave
 * @param {{ id: string, lead: string, sings: string }[]} generated the tune's generated lines
 * @returns {PartNames}
 */
export function namesWithGenerated(names, generated) {
	const derived = generated.map((part) => [
		part.id,
		generatedName(partName(part.lead, names), part.sings)
	]);
	return { ...names, ...Object.fromEntries(derived) };
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
