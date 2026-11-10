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
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { RECORD_TRACKS } from '../takes/recordTracks.js';
import { takeStart } from '../takes/takeTiming.js';

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
 *   melody: import('../melody/melody.js').Melody | null
 * }} song bass: what the bass plays (bass/songBass.js: edited or the band's own)
 * @returns {BandLane[]}
 */
export function bandLanes({ sections, bass, melody }) {
	const chords = chordBlocks(sections);
	return [
		{ id: 'guitar', name: 'Guitar', kind: 'chords', blocks: chords },
		{ id: 'mandolin', name: 'Mandolin', kind: 'chords', blocks: chords },
		{ id: 'bass', name: 'Bass', kind: 'notes', blocks: bassBlocks(bass) },
		...tuneLanes(melody)
	];
}

/**
 * One lane per record track with takes.
 * @param {TakeDocument[]} takes
 * @param {number} bpm the song's tempo now
 * @returns {TakeLane[]}
 */
export function takeLanes(takes, bpm) {
	const quarters = bpm / 60;
	return RECORD_TRACKS.map((track) => {
		const onTrack = takes.filter((take) => take.trackId === track.id);
		const inUse = onTrack.find((take) => take.inUse);
		return {
			id: track.id,
			name: track.name,
			/** @type {'take'} */
			kind: 'take',
			takes: onTrack,
			clip: inUse
				? { take: inUse, start: takeStart(inUse) * quarters, length: inUse.seconds * quarters }
				: null
		};
	}).filter((lane) => lane.takes.length > 0);
}

/** @param {import('../chart/timeline.js').Section[]} sections */
function chordBlocks(sections) {
	return barsInPlayOrder(sections).flatMap((bar) => {
		let start = bar.start;
		return bar.chords.map((chord) => {
			const block = { start, length: chord.length, label: chord.name };
			start += chord.length;
			return block;
		});
	});
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
 * The melody and each harmony part it has, in the mixer's order.
 * @param {import('../melody/melody.js').Melody | null} melody
 * @returns {BandLane[]}
 */
function tuneLanes(melody) {
	if (!melody) return [];
	const voices = [{ id: MELODY_CHANNEL, name: 'Melody' }, ...HARMONY_PARTS];
	return voices
		.map((voice) => ({
			id: voice.id,
			name: voice.name,
			/** @type {'notes'} */
			kind: 'notes',
			blocks: melody.notes
				.filter((note) => note.channel === voice.id)
				.map((note) => ({ start: note.time, length: note.length, pitch: note.pitch }))
		}))
		.filter((lane) => lane.blocks.length > 0);
}
