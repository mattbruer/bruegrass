/**
 * The one place that decides what the bass plays: the edited line when the
 * song has one, else the band's own, written from the chart (bassline.js).
 * Live playback, the exported audio and the MIDI file all ask here.
 */
import { bassLine } from '../instruments/bassline.js';
import { rhythm } from '../chart/timeline.js';
import { mod12 } from '../chart/key.js';

const EPSILON = 1e-6;

/**
 * @typedef {import('../instruments/bassline.js').BassNote} BassNote
 */

/**
 * @param {import('../chart/timeline.js').Section[]} sections the bars to play (a loop region, or the song)
 * @param {{
 *   capo?: number, transpose?: number, written?: BassNote[] | null,
 *   offset?: number, passes?: number
 * }} options
 *   written: the edited line for the whole song (readWrittenBass), or null;
 *   offset: where these sections start in the song, in quarters;
 *   passes: how many passes the band's own line should span, so it varies
 *   when it repeats (an edited line plays as written every time)
 * @returns {{ notes: BassNote[], passes: number }} beats in quarters from the
 *   first of these sections, at sounding pitch in the file's numbering
 */
export function bassPart(
	sections,
	{ capo = 0, transpose = 0, written = null, offset = 0, passes = 1 } = {}
) {
	if (!written) {
		const repeated = Array.from({ length: passes }, () => sections).flat();
		return { notes: bassLine(repeated, { capo: mod12(capo + transpose) }), passes };
	}
	const end = offset + rhythm(sections).quarters;
	const notes = written
		.filter((note) => note.beat >= offset - EPSILON && note.beat < end - EPSILON)
		.map((note) => ({
			...note,
			beat: note.beat - offset,
			length: Math.min(note.length, end - note.beat),
			pitch: note.pitch + transpose // written at concert pitch, like the melody
		}));
	return { notes, passes: 1 };
}
