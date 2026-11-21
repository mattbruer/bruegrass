/**
 * The tracks view's lanes, as plain data: one per thing that plays, each
 * on its own mixer channel (the lane's id). Times in quarter notes from
 * bar 1, so every lane lines up with the ruler.
 *
 * A band lane is blocks: chords (guitar, mandolin) or notes (bass, melody,
 * harmony parts). A take lane is a record track: the take in use as a clip.
 * A lane that can be edited later (the bass) stays this shape; its editor
 * reads and writes the blocks.
 */
import { barsInPlayOrder } from '../chart/chartBars.js';
import { HARMONY_PARTS } from '../melody/harmony/harmonyParts.js';
import { EXTRA_PARTS } from '../melody/extraParts.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { partName } from '../melody/partNames.js';
import { RECORD_TRACKS } from '../takes/recordTracks.js';
import { takeStart } from '../takes/takeTiming.js';
import { secondsPerQuarter } from '../chart/tempo.js';

/**
 * @typedef {import('$lib/storage/songTakes.js').TakeDocument} TakeDocument
 * @typedef {{ start: number, length: number, label?: string, pitch?: number }} Block
 * @typedef {{ id: string, name: string, kind: 'chords' | 'notes', blocks: Block[] }} BandLane
 * @typedef {{ take: TakeDocument, start: number, length: number }} Clip
 * @typedef {{ id: string, name: string, kind: 'take', takes: TakeDocument[], clip: Clip | null }} TakeLane
 * @typedef {BandLane | TakeLane} Lane
 */

/**
 * @param {{
 *   sections: import('../chart/timeline.js').Section[],
 *   bass: import('../instruments/bassline.js').BassNote[],
 *   melody: import('../melody/melody.js').Melody | null,
 *   names?: import('../melody/partNames.js').PartNames
 * }} song bass: what the bass plays (bass/songBass.js: edited or the band's own); names: the names you gave the parts
 * @returns {BandLane[]}
 */
export function bandLanes({ sections, bass, melody, names = {} }) {
	const chords = chordBlocks(sections);
	return [
		{ id: 'guitar', name: 'Guitar', kind: 'chords', blocks: chords },
		{ id: 'mandolin', name: 'Mandolin', kind: 'chords', blocks: chords },
		{ id: 'bass', name: partName('bass', names), kind: 'notes', blocks: bassBlocks(bass) },
		...tuneLanes(melody, names)
	];
}

/**
 * One audio lane per record track in use: one with takes, or one added on
 * the Tracks page (added lanes are named, in the song's part names).
 * @param {TakeDocument[]} takes
 * @param {number} bpm the song's tempo now
 * @param {import('../melody/partNames.js').PartNames} [names]
 * @returns {TakeLane[]}
 */
export function takeLanes(takes, bpm, names = {}) {
	const quarters = 1 / secondsPerQuarter(bpm);
	return RECORD_TRACKS.map((track) => {
		const onTrack = takes.filter((take) => take.trackId === track.id);
		const inUse = onTrack.find((take) => take.inUse);
		return {
			id: track.id,
			name: partName(track.id, names, track.name),
			/** @type {'take'} */
			kind: 'take',
			takes: onTrack,
			clip: inUse
				? { take: inUse, start: takeStart(inUse) * quarters, length: inUse.seconds * quarters }
				: null
		};
	}).filter((lane) => lane.takes.length > 0 || names[lane.id]);
}

/**
 * The record track a new audio lane goes on (null: all are in use).
 * @param {TakeLane[]} lanes the audio lanes shown now
 */
export function freeTrack(lanes) {
	return RECORD_TRACKS.find((track) => !lanes.some((lane) => lane.id === track.id)) ?? null;
}

/** @param {import('../chart/timeline.js').Section[]} sections */
export function chordBlocks(sections) {
	/** @type {{ start: number, length: number, label: string }[]} */
	const blocks = [];
	for (const bar of barsInPlayOrder(sections)) {
		const before = blocks.at(-1);
		if (bar.held && before) {
			before.length += bar.beats; // the chord carries on: one block
			continue;
		}
		let start = bar.start;
		for (const chord of bar.chords) {
			blocks.push({ start, length: chord.length, label: chord.name });
			start += chord.length;
		}
	}
	return blocks;
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
 * The melody and each harmony and extra part it has, in the mixer's order.
 * @param {import('../melody/melody.js').Melody | null} melody
 * @param {import('../melody/partNames.js').PartNames} names
 * @returns {BandLane[]}
 */
function tuneLanes(melody, names) {
	if (!melody) return [];
	const voices = [MELODY_CHANNEL, ...[...HARMONY_PARTS, ...EXTRA_PARTS].map((part) => part.id)];
	return voices
		.map((id) => ({
			id,
			name: partName(id, names),
			/** @type {'notes'} */
			kind: 'notes',
			blocks: melody.notes
				.filter((note) => note.channel === id)
				.map((note) => ({ start: note.time, length: note.length, pitch: note.pitch }))
		}))
		.filter((lane) => lane.blocks.length > 0);
}
