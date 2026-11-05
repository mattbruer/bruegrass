import { buildEvents, guitarTuning, midiNote } from '../instruments/guitar.js';
import { DEFAULT_METER, barQuarters, slotPositions } from '../chart/timeline.js';
import { melodyEvents, melodyPitch } from '../melody/melody.js';
import { bassLine } from '../instruments/bassline.js';
import { mod12 } from '../chart/key.js';
import { chopNotes } from '../instruments/mandolin.js';

/** Ticks per quarter note. */
const PPQ = 480;

/**
 * Shift from true guitar pitch to the user's Logic sampler mapping: E0.mp3
 * (low E, MIDI 40) sits on the key Logic labels E2 (MIDI 52, middle C = C3).
 */
const GUITAR_OFFSET = 12;
/**
 * Same convention for the mandolin: each note sits on the key Logic labels
 * with its real name, so the open G string (G3, MIDI 55) is on Logic's G3
 * (MIDI 67), ready to map the G0.mp3 sample there.
 */
const MANDO_OFFSET = 12;
/** A chop is short; the samples' recorded choke does the rest. */
const CHOP_LENGTH = 0.5; // quarter notes

const GUITAR_CHANNEL = 0;
const BASS_CHANNEL = 1;
const MANDO_CHANNEL = 2;
const MELODY_CHANNEL = 3;

/*
 * Track names match the Logic instruments they're meant for. A MIDI file
 * can't load a Logic patch, so these are labels; the General MIDI programs
 * (0-based) give other players a sensible default sound.
 */
const GUITAR_TRACK = { name: 'Bluegrass Guitar', program: 25 }; // GM 26: Acoustic Guitar (steel)
const BASS_TRACK = { name: 'Roots Upright', program: 32 }; // GM 33: Acoustic Bass
const MANDO_TRACK = { name: 'Mandolin Chop', program: 25 }; // no GM mandolin; steel guitar is closest
const MELODY_TRACK = { name: 'Melody', program: 25 }; // played on the guitar samples, like Bluegrass Guitar

/**
 * @typedef {{ tick: number, end: number, note: number, velocity: number }} MidiNote
 */

/**
 * Velocity from a mixer level in dB (0 dB = 100).
 * @param {number} db
 */
export function velocityFromDb(db) {
	if (!Number.isFinite(db)) return 1;
	return Math.max(1, Math.min(127, Math.round(100 * 10 ** (db / 20))));
}

/**
 * One pass of the arrangement as a Standard MIDI File (format 1):
 * a tempo track, the guitar (bass notes + strums, channel 1), a
 * bluegrass bass part (channel 2, see bassline.js), the mandolin chop
 * (channel 3, see mandolin.js) and, when there is one, the ABC melody
 * (channel 4, see melody.js), on the same guitar-sampler mapping.
 *
 * A file can't start before its first tick, so when the melody has a
 * pickup, everything moves one bar later: the pickup ends that bar and the
 * arrangement starts on the next bar line.
 *
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{
 *   capo?: number, transpose?: number, bpm?: number, bassDb?: number, strumDb?: number,
 *   melody?: import('../melody/melody.js').Melody | null, melodyDb?: number
 * }} options melodyDb: the Melody fader, like bassDb/strumDb for the guitar's parts
 * @returns {Uint8Array}
 */
export function arrangementToMidi(
	sections,
	{ capo = 0, transpose = 0, bpm = 120, bassDb = 0, strumDb = 0, melody = null, melodyDb = 0 } = {}
) {
	const shift = capo + transpose;
	// Same split as playback: capo where it reaches, plain transposition beyond
	const tuning = guitarTuning(sections, shift);
	const { events } = buildEvents(sections, { capo: tuning.capo, bpm });
	const quarter = 60 / bpm;
	/** @param {number} seconds */
	const toTicks = (seconds) => Math.round((seconds / quarter) * PPQ);

	const partDb = { bass: bassDb, strum: strumDb };

	/** @type {MidiNote[]} */
	const guitar = events.map((event) => ({
		tick: toTicks(event.time),
		end: toTicks(event.stop),
		note: midiNote(event.string, event.fret) + GUITAR_OFFSET + tuning.detune,
		velocity: velocityFromDb(partDb[event.part] + event.levelDb) // includes the player's touch
	}));

	// Bass player: its own root-fifth line with walks into chord changes
	/** @type {MidiNote[]} */
	const bass = bassLine(sections, { capo: mod12(shift) }).map((note) => ({
		tick: Math.round(note.beat * PPQ),
		end: Math.round((note.beat + note.length * note.gate) * PPQ),
		note: note.pitch,
		velocity: note.velocity
	}));

	// Mandolin chops on the off-beats, one note per string, strummed G → E
	/** @type {MidiNote[]} */
	const mando = chopNotes(sections, { capo: mod12(shift), bpm }).map((note) => ({
		tick: toTicks(note.time),
		end: toTicks(note.time) + Math.round(CHOP_LENGTH * PPQ),
		note: note.pitch + MANDO_OFFSET,
		velocity: velocityFromDb(note.levelDb)
	}));

	// The melody, fingered and timed as it plays in the browser, ending with the pass
	const tune = melody
		? melodyEvents(melody, { sections, bpm, shift: transpose, loop: false })
		: null;
	/** @type {MidiNote[]} */
	const melodyNotes = tune
		? [...tune.intro, ...tune.events].map((event) => ({
				tick: toTicks(event.time),
				end: toTicks(event.stop),
				note: melodyPitch(event) + GUITAR_OFFSET,
				velocity: velocityFromDb(melodyDb + event.levelDb)
			}))
		: [];

	// A bar of lead-in for the pickup
	const firstMeter = slotPositions(sections)[0]?.meter ?? DEFAULT_METER;
	const lead = tune && tune.intro.length > 0 ? barQuarters(firstMeter) * PPQ : 0;
	/** @param {MidiNote[]} notes */
	const later = (notes) => notes.map((n) => ({ ...n, tick: n.tick + lead, end: n.end + lead }));
	const markers = sectionMarkers(sections).map((m) => ({ ...m, tick: m.tick + lead }));
	// The first time signature also covers the lead-in bar
	const meters = meterChanges(sections).map((m, i) => ({
		...m,
		tick: i === 0 ? 0 : m.tick + lead
	}));

	const title = sections
		.map((section) => section.name)
		.filter(Boolean)
		.join(' / ');

	return writeSmf([
		tempoTrack(bpm, title, markers, meters),
		noteTrack(GUITAR_TRACK, GUITAR_CHANNEL, later(guitar)),
		noteTrack(BASS_TRACK, BASS_CHANNEL, later(bass)),
		noteTrack(MANDO_TRACK, MANDO_CHANNEL, later(mando)),
		...(tune ? [noteTrack(MELODY_TRACK, MELODY_CHANNEL, later(melodyNotes))] : [])
	]);
}

/**
 * @param {number} bpm
 * @param {string} title
 * @param {{ tick: number, name: string }[]} markers
 * @param {{ tick: number, meter: import('../chart/timeline.js').Meter }[]} meters
 */
function tempoTrack(bpm, title, markers, meters) {
	const usPerQuarter = Math.round(60_000_000 / bpm);
	const bytes = [
		...metaText(0x03, title || 'Arrangement'),
		...[
			0x00,
			0xff,
			0x51,
			0x03,
			(usPerQuarter >> 16) & 0xff,
			(usPerQuarter >> 8) & 0xff,
			usPerQuarter & 0xff
		]
	];

	// Time signatures (FF 58) wherever the meter changes, and markers (FF 06),
	// which Logic and most DAWs import as markers
	/** @type {{ tick: number, data: number[] }[]} */
	const events = [
		...meters.map(({ tick, meter }) => ({
			tick,
			// numerator, denominator as a power of 2, clocks per click, 32nds per quarter
			data: [0xff, 0x58, 0x04, meter.beats, Math.log2(meter.unit), (24 * 4) / meter.unit, 8]
		})),
		...markers.map(({ tick, name }) => {
			const text = [...new TextEncoder().encode(name)];
			return { tick, data: [0xff, 0x06, ...vlq(text.length), ...text] };
		})
	].sort((a, b) => a.tick - b.tick);

	let last = 0;
	for (const event of events) {
		bytes.push(...vlq(event.tick - last), ...event.data);
		last = event.tick;
	}

	bytes.push(0x00, 0xff, 0x2f, 0x00);
	return bytes;
}

/**
 * A marker at the first chord of each section, named after it.
 * @param {{ name?: string, measures: string[][] }[]} sections
 * @returns {{ tick: number, name: string }[]}
 */
function sectionMarkers(sections) {
	/** @type {{ tick: number, name: string }[]} */
	const markers = [];
	const slots = slotPositions(sections);
	slots.forEach((slot, k) => {
		if (k === 0 || slot.section !== slots[k - 1].section) {
			markers.push({
				tick: slot.start * PPQ,
				name: slot.sectionName || `Section ${slot.section + 1}`
			});
		}
	});
	return markers;
}

/**
 * A time signature at the start, then at every bar where it changes.
 * @param {import('../chart/timeline.js').Section[]} sections
 */
function meterChanges(sections) {
	/** @type {{ tick: number, meter: import('../chart/timeline.js').Meter }[]} */
	const changes = [];
	for (const slot of slotPositions(sections)) {
		const previous = changes.at(-1)?.meter;
		if (previous && previous.beats === slot.meter.beats && previous.unit === slot.meter.unit)
			continue;
		changes.push({ tick: slot.barStart * PPQ, meter: slot.meter });
	}
	return changes;
}

/**
 * @param {{ name: string, program: number }} track
 * @param {number} channel 0–15
 * @param {MidiNote[]} notes
 */
function noteTrack({ name, program }, channel, notes) {
	/** @type {{ tick: number, on: boolean, note: number, velocity: number }[]} */
	const messages = notes.flatMap((n) => [
		{ tick: n.tick, on: true, note: n.note, velocity: n.velocity },
		{ tick: Math.max(n.end, n.tick + 1), on: false, note: n.note, velocity: 0 }
	]);
	// Note-offs before note-ons on the same tick so repeated pitches retrigger cleanly
	messages.sort((a, b) => a.tick - b.tick || Number(a.on) - Number(b.on));

	const bytes = [...metaText(0x03, name), 0x00, 0xc0 | channel, program & 0x7f];
	let last = 0;
	for (const message of messages) {
		bytes.push(...vlq(message.tick - last));
		bytes.push((message.on ? 0x90 : 0x80) | channel, message.note & 0x7f, message.velocity & 0x7f);
		last = message.tick;
	}
	bytes.push(0x00, 0xff, 0x2f, 0x00);
	return bytes;
}

/**
 * Delta-time 0 meta event carrying text.
 * @param {number} type
 * @param {string} text
 */
function metaText(type, text) {
	const data = [...new TextEncoder().encode(text)];
	return [0x00, 0xff, type, ...vlq(data.length), ...data];
}

/**
 * MIDI variable-length quantity.
 * @param {number} value
 */
function vlq(value) {
	const bytes = [value & 0x7f];
	while ((value >>= 7) > 0) bytes.unshift((value & 0x7f) | 0x80);
	return bytes;
}

/** @param {number} n */
function u32(n) {
	return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

/** @param {number[][]} tracks */
function writeSmf(tracks) {
	const header = [
		0x4d,
		0x54,
		0x68,
		0x64,
		...u32(6),
		0,
		1,
		0,
		tracks.length,
		(PPQ >> 8) & 0xff,
		PPQ & 0xff
	];
	const body = tracks.flatMap((track) => [0x4d, 0x54, 0x72, 0x6b, ...u32(track.length), ...track]);
	return new Uint8Array([...header, ...body]);
}
