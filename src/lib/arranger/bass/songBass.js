/**
 * The one place that decides what the bass plays: the edited line when the
 * song has one, else the band's own, written from the chart (bassline.js).
 * Live playback, the exported audio and the MIDI file all ask here.
 */
import { bassLine } from '../instruments/bassline.js';
import { rhythm } from '../chart/timeline.js';
import { mod12 } from '../chart/key.js';
import { sectionsToPlay, stops, withoutStops } from '../chart/noChord.js';
import { hitAt, hitSpans } from '../chart/hits.js';
import { mutedAfter } from '../instruments/strumPatterns.js';

const EPSILON = 1e-6;

/**
 * @typedef {import('../instruments/bassline.js').BassNote} BassNote
 */

/**
 * @param {import('../chart/timeline.js').Section[]} sections the bars to play (a loop region, or the song)
 * @param {{
 *   transpose?: number, written?: BassNote[] | null,
 *   offset?: number, passes?: number
 * }} options
 *   written: the edited line for the whole song (BassState.written), or null;
 *   offset: where these sections start in the song, in quarters;
 *   passes: how many passes the band's own line should span, so it varies
 *   when it repeats (an edited line plays as written every time)
 * @returns {{ notes: BassNote[], passes: number }} beats in quarters from the
 *   first of these sections, at sounding pitch in the file's numbering
 */
export function bassPart(sections, { transpose = 0, written = null, offset = 0, passes = 1 } = {}) {
	const quarters = rhythm(sections).quarters;
	if (!written) {
		const repeated = Array.from({ length: passes }, () => sections).flat();
		return { notes: bandsBassLine(repeated, { shift: mod12(transpose) }), passes };
	}
	const end = offset + quarters;
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

/**
 * The band's own bass line for these bars (bassline.js), silent in no-chord
 * bars (N.C.): worked out as if the chord before carried on, then the notes
 * starting in them are left out. A hit (chart/hits.js) is one note, held.
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {Parameters<typeof bassLine>[1]} options
 * @returns {BassNote[]}
 */
export function bandsBassLine(sections, options) {
	const notes = bassLine(sectionsToPlay(sections), options);
	const played = withoutStops(
		notes,
		stops(sections),
		(note) => note.beat,
		rhythm(sections).quarters
	);
	return withHits(played, hitSpans(sections));
}

/**
 * The note on each hit held until the next chord (or choked with the
 * guitar), and the notes after it left out.
 * @param {BassNote[]} notes
 * @param {ReturnType<typeof hitSpans>} spans
 * @returns {BassNote[]}
 */
function withHits(notes, spans) {
	return notes.flatMap((note) => {
		const span = hitAt(note.beat, spans);
		if (!span) return [note];
		if (span.start < note.beat - EPSILON) return [];
		const length = span.end - span.start;
		const sounding = mutedAfter(span.hit, note.length) ?? length;
		return [{ ...note, length, gate: Math.min(1, sounding / length) }];
	});
}
