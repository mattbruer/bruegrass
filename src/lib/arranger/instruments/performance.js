/**
 * Everything the band plays for a song, as plain data: every note of every
 * instrument, in seconds, with the sample each one needs. Nothing here makes
 * sound (band.js does that), so the same notes feed live playback
 * (playback/livePlayback.js) and an exported file (export/renderSong.js).
 *
 * Looping (live): notes repeat; the guitar's ringing notes wrap into the
 * next repeat, and the guitar and bass line each span several passes so
 * they vary.
 * Not looping (export): exactly one pass, the last chord ringing on, like the
 * MIDI file.
 */
import { buildEvents, guitarTuning, sampleUrl, touch } from './guitar.js';
import { bassEvents } from './upright.js';
import { chopNotes, mandoSampleUrl } from './mandolin.js';
import { mod12 } from '../chart/key.js';
import { rhythm } from '../chart/timeline.js';

/**
 * @typedef {ReturnType<typeof preparePerformance>} Performance
 * @typedef {{ time: number }} TimedNote
 */

/**
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{
 *   bpm?: number, capo?: number, transpose?: number, loop?: boolean,
 *   melody?: import('../melody/melody.js').MelodyPart | null
 * }} options
 *   transpose: semitones on top of the capo, for every instrument;
 *   melody: from melodyEvents() for these sections at this tempo (looping
 *   to match), played on the guitar samples, each voice through its own
 *   channel (Melody, or a harmony part's)
 */
export function preparePerformance(
	sections,
	{ bpm = 120, capo = 0, transpose = 0, loop = true, melody = null } = {}
) {
	const quarter = 60 / bpm;
	const passLength = rhythm(sections).quarters * quarter;
	const shift = capo + transpose;

	// Guitar: the capo where it reaches, resampling for the rest
	const tuning = guitarTuning(sections, shift);
	const { events, duration } = buildEvents(sections, { bpm, capo: tuning.capo, loop });

	// Bass and mandolin work in concert pitch and pick their own register
	const concert = { bpm, capo: mod12(shift) };
	const bass = bassEvents(sections, concert);
	const chops = chopNotes(sections, concert);

	if (melody && loop && Math.abs(melody.period - passLength) > 1e-6) {
		throw new Error('The melody was prepared for a different arrangement or tempo');
	}
	/** @param {import('../melody/melody.js').MelodyEvent} note */
	const melodyUrl = (note) => sampleUrl(note.string, note.fret);

	return {
		bpm,
		quarter,
		/** One pass of the arrangement, in seconds. */
		passLength,
		guitar: {
			events,
			urls: events.map((event) => sampleUrl(event.string, event.fret)),
			/** When looping, the guitar repeats every this many seconds (it spans several passes). */
			period: loop ? duration : passLength,
			/** Any transposition the capo can't reach is made by resampling. */
			rate: 2 ** (tuning.detune / 12),
			/** A lighter pick stroke at faster tempos (level, filter, attack). */
			feel: touch(bpm)
		},
		mandolin: {
			chops,
			urls: chops.map((note) => mandoSampleUrl(note.course, note.fret))
		},
		bass: {
			notes: loop ? bass.notes : bass.notes.filter((note) => note.time < passLength),
			/** The bass line repeats every this many seconds (it spans several passes). */
			period: bass.passes * passLength
		},
		melody: melody
			? {
					events: melody.events,
					/** The pickup before bar 1 (negative times). */
					intro: melody.intro,
					/** How long the band waits for the pickup, in seconds. */
					leadIn: melody.leadIn,
					urls: melody.events.map(melodyUrl),
					introUrls: melody.intro.map(melodyUrl)
				}
			: null
	};
}
