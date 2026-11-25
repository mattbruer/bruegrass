/**
 * The lanes of the parts being written, in the tracks view's shape
 * (tracks/lanes.js): the bass first (it sits under the band), then the
 * melody, each other voice the tune has (harmony parts, then lanes added
 * with + Lane: melody/extraParts.js). Times in quarters from bar 1. Each
 * lane's id is the voice the piano roll edits for it, and the mixer channel
 * it plays on.
 */
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { isExtraPart } from '../melody/extraParts.js';
import { partName } from '../melody/partNames.js';
import { BASS_VOICE } from '../bass/readBass.js';

/**
 * @param {{
 *   melody: import('../melody/melody.js').Melody | null,
 *   voices: string[],
 *   bass: import('../instruments/bassline.js').BassNote[],
 *   names: import('../melody/partNames.js').PartNames
 * }} song voices: the tune's voices (their channels) in order; bass: the
 *   notes the Bass lane shows (the edited line, else the band's own); names: the names you gave the parts
 * @returns {import('../tracks/lanes.js').BandLane[]}
 */
export function partLanes({ melody, voices, bass, names }) {
	const notes = melody?.notes ?? [];
	/** @param {string} id */
	const lane = (id) => ({
		id,
		name: partName(id, names),
		/** @type {'notes'} */
		kind: 'notes',
		blocks: notes
			.filter((note) => note.channel === id)
			.map((note) => ({ start: note.time, length: note.length, pitch: note.pitch }))
	});
	const others = [...new Set(voices)].filter((id) => id !== MELODY_CHANNEL);
	const bassLane = {
		...lane(BASS_VOICE),
		blocks: bass.map((note) => ({ start: note.beat, length: note.length, pitch: note.pitch }))
	};
	return [
		bassLane,
		lane(MELODY_CHANNEL),
		...others.filter((id) => !isExtraPart(id)).map(lane),
		...others.filter(isExtraPart).map(lane)
	];
}
