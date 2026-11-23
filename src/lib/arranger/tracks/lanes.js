/**
 * The tracks view's lanes, as plain data: one per thing that plays, each
 * on its own mixer channel (the lane's id). Times in quarter notes from
 * bar 1, so every lane lines up with the ruler.
 *
 * A chords lane (guitar, mandolin) is the chart's chords bar by bar,
 * drawn and edited by ChordLane from the chart itself. A notes lane is
 * blocks (bass, melody, harmony parts). A take lane is a record track:
 * its clips (takes/clips.js), where they sit on the song in seconds.
 */
import { HARMONY_PARTS } from '../melody/harmony/harmonyParts.js';
import { EXTRA_PARTS } from '../melody/extraParts.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { partName } from '../melody/partNames.js';
import { RECORD_TRACKS } from '../takes/recordTracks.js';
import { clipLength, clipStart, clipsOfTrack } from '../takes/clips.js';

/**
 * @typedef {import('$lib/storage/songTakes.js').TakeDocument} TakeDocument
 * @typedef {{ start: number, length: number, label?: string, pitch?: number }} Block
 * @typedef {{ id: string, name: string, kind: 'chords' }} ChordsLane
 * @typedef {{ id: string, name: string, kind: 'notes', blocks: Block[] }} NotesLane
 * @typedef {ChordsLane | NotesLane} BandLane
 * @typedef {{ index: number, clip: import('../takes/clips.js').AudioClip, take: TakeDocument, start: number, end: number }} LaneClip
 *   index: its place on the lane; start, end: seconds from bar 1
 * @typedef {{ id: string, name: string, kind: 'take', takes: TakeDocument[], clips: LaneClip[] }} TakeLane
 * @typedef {BandLane | TakeLane} Lane
 */

/**
 * @param {{
 *   bass: import('../instruments/bassline.js').BassNote[],
 *   melody: import('../melody/melody.js').Melody | null,
 *   voices?: string[],
 *   names?: import('../melody/partNames.js').PartNames
 * }} song bass: what the bass plays (bass/songBass.js: edited or the band's own);
 *   voices: the tune's voices (their channels), so a part with no notes yet has its lane;
 *   names: the names you gave the lanes
 * @returns {BandLane[]}
 */
export function bandLanes({ bass, melody, voices = [], names = {} }) {
	return [
		{ id: 'guitar', name: partName('guitar', names, 'Guitar'), kind: 'chords' },
		{ id: 'mandolin', name: partName('mandolin', names, 'Mandolin'), kind: 'chords' },
		{ id: 'bass', name: partName('bass', names), kind: 'notes', blocks: bassBlocks(bass) },
		...tuneLanes(melody, voices, names)
	];
}

/**
 * One audio lane per record track in use: one with takes, or one added on
 * the Tracks page (added lanes are named, in the song's part names).
 * @param {TakeDocument[]} takes
 * @param {import('../melody/partNames.js').PartNames} [names]
 * @param {import('../takes/clips.js').EditedLanes} [edited] the lanes whose clips you've edited
 * @returns {TakeLane[]}
 */
export function takeLanes(takes, names = {}, edited = {}) {
	return RECORD_TRACKS.map((track) => ({
		id: track.id,
		name: partName(track.id, names, track.name),
		/** @type {'take'} */
		kind: 'take',
		takes: takes.filter((take) => take.trackId === track.id),
		clips: clipsOfTrack(track.id, edited, takes).map(({ clip, take }, index) => {
			const start = clipStart(clip, take);
			return { index, clip, take, start, end: start + clipLength(clip) };
		})
	})).filter((lane) => lane.takes.length > 0 || names[lane.id]);
}

/**
 * The record track a new audio lane goes on (null: all are in use).
 * @param {TakeLane[]} lanes the audio lanes shown now
 */
export function freeTrack(lanes) {
	return RECORD_TRACKS.find((track) => !lanes.some((lane) => lane.id === track.id)) ?? null;
}

/** @param {import('../instruments/bassline.js').BassNote[]} notes */
function bassBlocks(notes) {
	return notes.map((note) => ({
		start: note.beat,
		length: note.length,
		pitch: note.pitch
	}));
}

/**
 * The melody and each harmony and extra part the tune has, in the mixer's order.
 * @param {import('../melody/melody.js').Melody | null} melody
 * @param {string[]} voices the tune's voices (their channels)
 * @param {import('../melody/partNames.js').PartNames} names
 * @returns {BandLane[]}
 */
function tuneLanes(melody, voices, names) {
	if (!melody) return [];
	const all = [MELODY_CHANNEL, ...[...HARMONY_PARTS, ...EXTRA_PARTS].map((part) => part.id)];
	return all
		.map((id) => ({
			id,
			name: partName(id, names),
			/** @type {'notes'} */
			kind: 'notes',
			blocks: melody.notes
				.filter((note) => note.channel === id)
				.map((note) => ({ start: note.time, length: note.length, pitch: note.pitch }))
		}))
		.filter((lane) => lane.blocks.length > 0 || voices.includes(lane.id));
}
