/**
 * What the tune's voices (the melody and each harmony part) can play on:
 * recorded instruments from free sample sets, chosen by ear. Each voice's channel picks one on its mixer strip. A new
 * instrument is one entry in TUNE_INSTRUMENTS; a new sample set is one entry
 * in SAMPLE_SETS. How they're played: tuneVoice.js.
 *
 * The samples load from where the sets are published (GitHub Pages) for
 * now; copying them to our own storage is a change to `url` only.
 * Licences: tonejs-instruments CC BY 3.0 (credit nbrosowsky), FluidR3 GM MIT.
 * The band's own guitar (our samples, one per string and fret) is here too,
 * for parts that are the guitar's: a fill sounds like the guitar playing it.
 */
import { BAND_GUITAR_NOTES, bandGuitarSampleUrl } from './guitarSamples.js';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   family: string,
 *   set: keyof typeof SAMPLE_SETS,
 *   folder: string,
 *   notes: number[],
 *   octave: number,
 *   volumeDb: number,
 *   struck?: boolean
 * }} TuneInstrument
 *   family: the heading it's listed under; folder: the instrument's name in its set;
 *   notes: the MIDI notes it has a sample of (the others are pitched from the nearest);
 *   octave: semitones above where the guitar sounds the tune (12 is the piano roll's pitch, concert);
 *   struck: each note starts at its strike (soundStart.js), past the sample's silence and pick scrape
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const octaveOf = (/** @type {number} */ midi) => Math.floor(midi / 12) - 1;

/** The notes loaded: a voice is never pitched further than this range allows. */
const LOWEST = 36;
const HIGHEST = 96;
/** A General MIDI set has every note; a sample every this many semitones is plenty. */
const GM_STEP = 3;

export const SAMPLE_SETS = {
	tonejs: {
		/** @param {string} folder @param {number} midi */
		url: (folder, midi) =>
			`https://nbrosowsky.github.io/tonejs-instruments/samples/${folder}/${NOTE_NAMES[midi % 12].replace('#', 's')}${octaveOf(midi)}.mp3`
	},
	band: {
		/** @param {string} _folder @param {number} midi */
		url: (_folder, midi) => bandGuitarSampleUrl(midi)
	},
	fluidR3: {
		/** @param {string} folder @param {number} midi */
		url: (folder, midi) =>
			`https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/${folder}-mp3/${FLAT_NAMES[midi % 12]}${octaveOf(midi)}.mp3`
	}
};

/** @param {string} list notes as tonejs-instruments names its files: "A3,As3,C4" */
function tonejsNotes(list) {
	return list
		.split(',')
		.map((name) => {
			const octave = Number(name.slice(-1));
			return (octave + 1) * 12 + NOTE_NAMES.indexOf(name.slice(0, -1).replace('s', '#'));
		})
		.filter((midi) => midi >= LOWEST && midi <= HIGHEST);
}

const GM_NOTES = Array.from(
	{ length: Math.floor((HIGHEST - LOWEST) / GM_STEP) + 1 },
	(_, i) => LOWEST + i * GM_STEP
);

/**
 * @param {string} id
 * @param {string} name
 * @param {string} family
 * @param {string} list
 * @param {number} [octave]
 * @returns {TuneInstrument}
 */
const tonejs = (id, name, family, list, octave = 12) => ({
	id,
	name,
	family,
	set: 'tonejs',
	folder: id,
	notes: tonejsNotes(list),
	octave,
	volumeDb: 0
});

/**
 * @param {string} folder
 * @param {string} name
 * @param {string} family
 * @param {number} [octave]
 * @returns {TuneInstrument}
 */
const fluidR3 = (folder, name, family, octave = 12) => ({
	id: folder.replaceAll('_', '-'),
	name,
	family,
	set: 'fluidR3',
	folder,
	notes: GM_NOTES,
	octave,
	volumeDb: 0
});

/** The band's own guitar, for a part the guitar plays (its fills). */
export const BAND_GUITAR = 'band-guitar';

/** @type {TuneInstrument[]} */
export const TUNE_INSTRUMENTS = [
	tonejs(
		'piano',
		'Piano',
		'Keys',
		'A1,A2,A3,A4,A5,A6,C2,C3,C4,C5,C6,C7,Ds2,Ds3,Ds4,Ds5,Ds6,Fs2,Fs3,Fs4,Fs5,Fs6'
	),
	fluidR3('electric_piano_1', 'Electric piano', 'Keys'),
	tonejs(
		'organ',
		'Organ',
		'Organ',
		'A1,A2,A3,A4,A5,C1,C2,C3,C4,C5,C6,Ds1,Ds2,Ds3,Ds4,Ds5,Fs1,Fs2,Fs3,Fs4,Fs5'
	),
	fluidR3('rock_organ', 'Rock organ', 'Organ'),
	fluidR3('accordion', 'Accordion', 'Reeds'),
	fluidR3('tango_accordion', 'Tango accordion', 'Reeds'),
	{
		id: BAND_GUITAR,
		name: 'Bluegrass guitar (the band’s)',
		family: 'Plucked',
		set: 'band',
		folder: '',
		notes: BAND_GUITAR_NOTES,
		octave: 12,
		volumeDb: 0,
		struck: true
	},
	fluidR3('banjo', 'Banjo', 'Plucked'),
	fluidR3('sitar', 'Sitar', 'Plucked'),
	fluidR3('pizzicato_strings', 'Pizzicato strings', 'Plucked'),
	tonejs('violin', 'Violin', 'Strings', 'A3,A4,A5,A6,C4,C5,C6,C7,E4,E5,E6,G3,G4,G5,G6'),
	tonejs(
		'cello',
		'Cello',
		'Strings',
		'A2,A3,A4,As2,As3,B2,B3,B4,C2,C3,C4,C5,Cs3,Cs4,D2,D3,D4,Ds2,Ds3,Ds4,E2,E3,E4,F2,F3,F4,Fs3,Fs4,G2,G3,G4,Gs2,Gs3,Gs4',
		0
	),
	tonejs('flute', 'Flute', 'Winds', 'A4,A5,A6,C4,C5,C6,C7,E4,E5,E6', 24),
	tonejs('clarinet', 'Clarinet', 'Winds', 'As3,As4,As5,D3,D4,D5,D6,F3,F4,F5,Fs6'),
	fluidR3('oboe', 'Oboe', 'Winds'),
	fluidR3('bassoon', 'Bassoon', 'Winds', 0),
	tonejs('trumpet', 'Trumpet', 'Brass', 'A3,A5,As4,C4,C6,D5,Ds4,F3,F4,F5,G4'),
	tonejs('xylophone', 'Xylophone', 'Tuned percussion', 'C5,C6,C7,C8,G4,G5,G6,G7', 24),
	fluidR3('vibraphone', 'Vibraphone', 'Tuned percussion'),
	fluidR3('marimba', 'Marimba', 'Tuned percussion'),
	fluidR3('glockenspiel', 'Glockenspiel', 'Tuned percussion', 24),
	fluidR3('celesta', 'Celesta', 'Tuned percussion', 24),
	fluidR3('steel_drums', 'Steel drums', 'Tuned percussion')
];

/** What each tune channel starts on, so the parts stand apart from the lead and each other. */
export const TUNE_INSTRUMENT_DEFAULTS = {
	melody: 'piano',
	tenor: 'violin',
	'high-baritone': 'flute',
	baritone: 'clarinet',
	'low-tenor': 'cello',
	roots: 'bassoon'
};
const FALLBACK = TUNE_INSTRUMENT_DEFAULTS.melody;

/**
 * The instruments by family, in list order.
 * @returns {{ family: string, instruments: TuneInstrument[] }[]}
 */
export function instrumentFamilies() {
	const families = [...new Set(TUNE_INSTRUMENTS.map((each) => each.family))];
	return families.map((family) => ({
		family,
		instruments: TUNE_INSTRUMENTS.filter((each) => each.family === family)
	}));
}

/**
 * The instrument with this id, or `fallback`'s (no id, or one not in the list).
 * @param {string | undefined} id
 * @param {string} [fallback]
 * @returns {TuneInstrument}
 */
export function tuneInstrument(id, fallback = FALLBACK) {
	const found = (/** @type {string | undefined} */ each) =>
		TUNE_INSTRUMENTS.find((instrument) => instrument.id === each);
	return found(id) ?? found(fallback) ?? TUNE_INSTRUMENTS[0];
}

/**
 * The tune channel's own starting instrument.
 * @param {string} channelId
 */
export function defaultTuneInstrument(channelId) {
	return (
		TUNE_INSTRUMENT_DEFAULTS[/** @type {keyof typeof TUNE_INSTRUMENT_DEFAULTS} */ (channelId)] ??
		FALLBACK
	);
}

/**
 * The instrument a mixer channel plays the tune on.
 * @param {{ id: string, instrument?: string }[]} channels the live mixer's or a saved mix's
 * @param {string} channelId
 */
export function channelInstrument(channels, channelId) {
	const chosen = channels.find((channel) => channel.id === channelId)?.instrument;
	return tuneInstrument(chosen, defaultTuneInstrument(channelId));
}
