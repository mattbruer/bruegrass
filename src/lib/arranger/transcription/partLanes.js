/**
 * The lanes of the parts being written, in the tracks view's shape
 * (tracks/lanes.js): the melody, each harmony part the tune has, the bass
 * once it's written, then each generic lane (+ Lane). Times in quarters from
 * bar 1. Each lane's id is the voice the piano roll edits for it.
 */
import { HARMONY_PARTS } from '../melody/harmony/harmonyParts.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { BASS_VOICE } from '../bass/readBass.js';

/**
 * @typedef {{ id: string, name: string, notes: { beat: number, length: number, pitch: number }[] | null }} LaneNotes
 *   a generic lane's notes (null: none written yet)
 */

/**
 * @param {import('../melody/melody.js').Melody | null} melody
 * @param {import('../instruments/bassline.js').BassNote[] | null} writtenBass the edited bass line, or null
 * @param {LaneNotes[]} extraLanes
 * @returns {import('../tracks/lanes.js').BandLane[]}
 */
export function partLanes(melody, writtenBass, extraLanes) {
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
	const bass = writtenBass?.length
		? [{ id: BASS_VOICE, name: 'Bass', kind: 'notes', blocks: blocksOf(writtenBass) }]
		: [];
	const generic = extraLanes.map((lane) => ({
		id: lane.id,
		name: lane.name,
		/** @type {'notes'} */
		kind: 'notes',
		blocks: blocksOf(lane.notes ?? [])
	}));
	return [...tune, ...bass, ...generic];
}

/**
 * @param {{ beat: number, length: number, pitch: number }[]} notes
 */
function blocksOf(notes) {
	return notes.map((note) => ({ start: note.beat, length: note.length, pitch: note.pitch }));
}
