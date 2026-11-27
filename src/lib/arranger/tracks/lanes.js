/**
 * The tracks view's lanes, as plain data: one per thing that plays, each
 * on its own mixer channel (the lane's id). Times in quarter notes from
 * bar 1, so every lane lines up with the ruler.
 *
 * The chords lane (Band) is the chart's chords bar by bar, drawn and typed
 * by ChordLane from the chart itself. A voicings lane (guitar, mandolin)
 * is the same chords as that instrument plays them, each opening its editor. A notes lane is
 * blocks (bass, melody, added parts and the lines generated from them). A take lane is a record track:
 * its clips (takes/clips.js), where they sit on the song in seconds.
 */
import { EXTRA_PARTS } from '../melody/extraParts.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { partName } from '../melody/partNames.js';
import { RECORD_TRACKS } from '../takes/recordTracks.js';
import { clipLength, clipStart, clipsOfTrack, fromSongStart } from '../takes/clips.js';
import { stretchOf } from '../takes/takeTempo.js';

/**
 * @typedef {import('$lib/storage/songTakes.js').TakeDocument} TakeDocument
 * @typedef {{ start: number, length: number, label?: string, pitch?: number }} Block
 * @typedef {{ id: string, name: string, kind: 'chords' }} ChordsLane
 * @typedef {{ id: 'guitar' | 'mandolin', name: string, kind: 'voicings' }} VoicingsLane
 * @typedef {{ id: string, name: string, kind: 'notes', blocks: Block[], lead?: string }} NotesLane
 *   lead: the lane a generated line is written from (its name comes from it too)
 * @typedef {ChordsLane | VoicingsLane | NotesLane} BandLane
 * @typedef {{ index: number, clip: import('../takes/clips.js').AudioClip, take: TakeDocument, start: number, end: number, stretch: number }} LaneClip
 *   index: its place on the lane; start, end: seconds from bar 1 at the song's tempo now;
 *   stretch: how much longer its take lasts now than as recorded (takes/takeTempo.js)
 * @typedef {{ id: string, name: string, kind: 'take', filmed: boolean, takes: TakeDocument[], clips: LaneClip[] }} TakeLane
 *   filmed: an A/V lane (it films as it records)
 * @typedef {BandLane | TakeLane} Lane
 */

/** The lane of the chart's chords: not an instrument, so no mixer channel. */
export const BAND_LANE = 'band';

/**
 * @param {{
 *   bass: import('../instruments/bassline.js').BassNote[],
 *   melody: import('../melody/melody.js').Melody | null,
 *   voices?: string[],
 *   generated?: { id: string, lead: string }[],
 *   names?: import('../melody/partNames.js').PartNames
 * }} song bass: what the bass plays (bass/songBass.js: edited or the band's own);
 *   voices: the tune's voices (their channels), so a part with no notes yet has its lane;
 *   generated: the lines generated from other lanes (each sits under its lead);
 *   names: the names you gave the lanes
 * @returns {BandLane[]}
 */
export function bandLanes({ bass, melody, voices = [], generated = [], names = {} }) {
	return [
		{ id: BAND_LANE, name: partName(BAND_LANE, names, 'Band'), kind: 'chords' },
		{ id: 'guitar', name: partName('guitar', names, 'Guitar'), kind: 'voicings' },
		{ id: 'mandolin', name: partName('mandolin', names, 'Mandolin'), kind: 'voicings' },
		{ id: 'bass', name: partName('bass', names), kind: 'notes', blocks: bassBlocks(bass) },
		...tuneLanes(melody, voices, generated, names)
	];
}

/**
 * One audio lane per record track in use: one with takes, or one added on
 * the Tracks page (added lanes are named, in the song's part names).
 * @param {TakeDocument[]} takes
 * @param {import('../melody/partNames.js').PartNames} [names]
 * @param {import('../takes/clips.js').EditedLanes} [edited] the lanes whose clips you've edited
 * @param {string[]} [filmed] the A/V lanes
 * @param {number} [bpm] the song's tempo now (takes follow it; leave out: as recorded)
 * @param {number} [songStart] seconds from bar 1 at the tempo now: nothing before it shows
 * @returns {TakeLane[]}
 */
export function takeLanes(takes, names = {}, edited = {}, filmed = [], bpm = NaN, songStart = 0) {
	return RECORD_TRACKS.map((track) => ({
		id: track.id,
		name: partName(track.id, names, track.name),
		/** @type {'take'} */
		kind: 'take',
		filmed: filmed.includes(track.id),
		takes: takes.filter((take) => take.trackId === track.id),
		clips: clipsOfTrack(track.id, edited, takes).flatMap(({ clip: whole, take }, index) => {
			const stretch = Number.isFinite(bpm) ? stretchOf(take, bpm) : 1;
			const clip = fromSongStart(whole, take, songStart / stretch);
			if (!clip) return [];
			const start = clipStart(clip, take) * stretch;
			return [{ index, clip, take, start, end: start + clipLength(clip) * stretch, stretch }];
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
 * The melody and each extra part the tune has, each followed by the lines
 * generated from it: one with notes, or a voice of the tune still all rests
 * (a part just added, a tune just started from the chart, which has no line).
 * @param {import('../melody/melody.js').Melody | null} melody
 * @param {string[]} voices the tune's voices (their channels)
 * @param {{ id: string, lead: string }[]} generated
 * @param {import('../melody/partNames.js').PartNames} names
 * @returns {BandLane[]}
 */
function tuneLanes(melody, voices, generated, names) {
	const notes = melody?.notes ?? [];
	const isGenerated = (/** @type {string} */ id) => generated.some((part) => part.id === id);
	const leads = [MELODY_CHANNEL, ...EXTRA_PARTS.map((part) => part.id)].filter(
		(id) => !isGenerated(id)
	);
	const all = leads.flatMap((lead) => [
		lead,
		...generated.filter((part) => part.lead === lead).map((part) => part.id)
	]);
	return all
		.map((id) => ({
			id,
			name: partName(id, names),
			/** @type {'notes'} */
			kind: 'notes',
			lead: generated.find((part) => part.id === id)?.lead,
			blocks: notes
				.filter((note) => note.channel === id)
				.map((note) => ({ start: note.time, length: note.length, pitch: note.pitch }))
		}))
		.filter((lane) => lane.blocks.length > 0 || voices.includes(lane.id));
}
