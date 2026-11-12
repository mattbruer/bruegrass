/**
 * The lanes of the parts being written, in the tracks view's shape
 * (tracks/lanes.js): the melody always, each harmony part the tune has,
 * and the bass once it's written or added by hand (+ Lane: most people
 * never write one, and the band plays its own). Times in quarters from
 * bar 1. Each lane's id is the voice the piano roll edits for it.
 */
import { HARMONY_PARTS } from '../melody/harmony/harmonyParts.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { BASS_VOICE } from '../bass/readBass.js';

/** Lanes + Lane can add, empty, to write by ear. A new one is one entry. */
export const ADDABLE_LANES = Object.freeze([{ id: BASS_VOICE, name: 'Bass' }]);

/**
 * @param {import('../melody/melody.js').Melody | null} melody
 * @param {import('../instruments/bassline.js').BassNote[] | null} writtenBass the edited bass line, or null
 * @param {string[]} added lanes added by hand
 * @returns {import('../tracks/lanes.js').BandLane[]}
 */
export function partLanes(melody, writtenBass, added) {
	const notes = melody?.notes ?? [];
	const tune = [{ id: MELODY_CHANNEL, name: 'Melody' }, ...HARMONY_PARTS]
		.map((voice) => ({
			id: voice.id,
			name: voice.name,
			/** @type {'notes'} */
			kind: 'notes',
			blocks: notes
				.filter((note) => note.channel === voice.id)
				.map((note) => ({ start: note.time, length: note.length, pitch: note.pitch }))
		}))
		.filter((lane) => lane.id === MELODY_CHANNEL || lane.blocks.length > 0);
	const bass = {
		id: BASS_VOICE,
		name: 'Bass',
		/** @type {'notes'} */
		kind: 'notes',
		blocks: (writtenBass ?? []).map((note) => ({
			start: note.beat,
			length: note.length,
			pitch: note.pitch
		}))
	};
	return writtenBass?.length || added.includes(BASS_VOICE) ? [...tune, bass] : tune;
}
