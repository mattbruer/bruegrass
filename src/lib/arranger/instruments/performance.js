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
import { bassPart } from '../bass/songBass.js';
import { leadOnsetsOfPart } from '../bass/melodySpace.js';
import { chopNotes, mandoSampleUrl } from './mandolin.js';
import { mod12 } from '../chart/key.js';
import { rhythm } from '../chart/timeline.js';
import { endBeforeStops, sectionsToPlay, stops, withoutStops } from '../chart/noChord.js';
import { secondsPerQuarter } from '../chart/tempo.js';
import { SWING_STRAIGHT, swungTime } from '../chart/swing.js';

/**
 * @typedef {ReturnType<typeof preparePerformance>} Performance
 * @typedef {{ time: number }} TimedNote
 */

/**
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{
 *   bpm?: number, capo?: number, transpose?: number, loop?: boolean,
 *   melody?: import('../melody/melody.js').MelodyPart | null,
 *   bass?: import('./bassline.js').BassNote[] | null, offset?: number,
 *   bassStyle?: import('./bassStyles.js').BassStyle, swing?: number
 * }} options
 *   transpose: semitones on top of the capo, for every instrument;
 *   melody: from melodyEvents() for these sections at this tempo (looping
 *   to match), played on the guitar samples, each voice through its own
 *   channel (Melody, or a harmony part's);
 *   bass: the song's edited bass line (BassState.written), or null for the
 *   band's own; offset: where these sections start in the song (quarters),
 *   for the edited bass; bassStyle: how busy the band's own bass is;
 *   swing: how long-short the eighths are (chart/swing.js), for every instrument
 */
export function preparePerformance(
	written,
	{
		bpm = 120,
		capo = 0,
		transpose = 0,
		loop = true,
		melody = null,
		bass = null,
		offset = 0,
		bassStyle = undefined,
		swing = SWING_STRAIGHT
	} = {}
) {
	const quarter = secondsPerQuarter(bpm);
	/** @param {number} seconds */
	const swung = (seconds) => swungTime(seconds, quarter, swing);
	/** @template {{ time: number, stop: number }} T @param {T[]} notes */
	const swingNotes = (notes) =>
		notes.map((note) => ({ ...note, time: swung(note.time), stop: swung(note.stop) }));
	const passQuarters = rhythm(written).quarters;
	const passLength = passQuarters * quarter;
	const shift = capo + transpose;
	// No-chord bars (N.C.): every part is worked out as if the chord before
	// carried on, then the notes starting in them are left out
	const sections = sectionsToPlay(written);
	const silent = stops(written);
	/** @template {{ time: number }} T @param {T[]} notes */
	const quiet = (notes) => withoutStops(notes, silent, (note) => note.time / quarter, passQuarters);

	// Guitar: the capo where it reaches, resampling for the rest
	const tuning = guitarTuning(sections, shift);
	const built = buildEvents(sections, { bpm, capo: tuning.capo, loop });
	const duration = built.duration;
	const events = swingNotes(
		quiet(built.events).map((event) => ({
			...event,
			stop:
				endBeforeStops(event.time / quarter, event.stop / quarter, silent, passQuarters) * quarter
		}))
	);

	// Bass and mandolin work in concert pitch and pick their own register
	const concert = { bpm, capo: mod12(shift) };
	const bassLine = bassEvents(
		bassPart(written, {
			capo,
			transpose,
			written: bass,
			offset,
			passes: loop ? 2 : 1,
			tuneOnsets: leadOnsetsOfPart(melody, bpm),
			style: bassStyle
		}),
		{ bpm }
	);
	const chops = quiet(chopNotes(sections, concert)).map((note) => ({
		...note,
		time: swung(note.time)
	}));
	const bassNotes = bassLine.notes.map((note) => {
		const time = swung(note.time);
		return { ...note, time, duration: swung(note.time + note.duration) - time };
	});

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
			notes: loop ? bassNotes : bassNotes.filter((note) => note.time < passLength),
			/** The bass line repeats every this many seconds (the band's own spans several passes). */
			period: bassLine.passes * passLength
		},
		melody: melody
			? {
					events: swingNotes(melody.events),
					/** The pickup before bar 1 (negative times). */
					intro: swingNotes(melody.intro),
					/** How long the band waits for the pickup, in seconds. */
					leadIn: melody.leadIn,
					urls: melody.events.map(melodyUrl),
					introUrls: melody.intro.map(melodyUrl)
				}
			: null
	};
}
