import chords from './guitar-chords.json';
import { getChannel } from './mixer.svelte.js';
import { bassEvents, createUpright } from './upright.js';
import { chopNotes, mandoSampleUrl } from './mandolin.js';
import { mod12 } from './key.js';
import { rhythm, slotPositions } from './timeline.js';
import { createStream } from './scheduler.js';

/** @typedef {import('./timeline.js').SlotPosition} SlotPosition */

/** String sample prefixes, low E to high e. */
export const STRINGS = ['E', 'A', 'D', 'G', 'B', 'ee'];

/** MIDI note of each open string, low E to high e. */
const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

/** Highest fret with a sample. */
export const MAX_FRET = 12;

/** Strings used for the chuck (G, B, high e). */
const STRUM_STRINGS = [3, 4, 5];

/*
 * Right-hand pendulum. The strumming hand swings down and up once per quarter
 * note; boom and chuck are both downstrokes. The pick's position across the
 * strings is x(t) = center + A·sin(2πt / quarter), so it moves fastest
 * mid-guitar and slows toward the ends of the swing. Each string sounds when
 * the pick reaches it.
 */
const STRING_SPACING_MM = 10; // ~54 mm E–E at the saddle, ~36 mm at the nut
const SWING_CENTER = 2.5; // in string gaps from low E: between the D and G strings
const SWING_MM_AT_120 = 55; // swing amplitude at 120 BPM
const SWING_TEMPO_EXPONENT = 0.3; // faster tempo → smaller (but faster) swing
const SWING_MIN_MM = 30; // must clear the outermost string (25 mm from center)

/*
 * Touch. Faster tempos are played lighter: quieter, duller, softer attack.
 * With one sample set this is faked with gain, a low-pass filter and a short
 * fade-in on each note.
 */
const TOUCH_DB_PER_DOUBLING = -6; // above TOUCH_BASE_BPM
const TOUCH_BASE_BPM = 120;
const TOUCH_MIN_DB = -9;
const TOUCH_BASS_RATIO = 0.5; // bass notes are still picked deliberately
const TOUCH_FULL_CUTOFF = 16000; // Hz at full touch; falls 10x per -12 dB
const TOUCH_FADE_IN_PER_DB = 0.0005; // s of fade-in per dB lighter (3 ms at -6 dB)

const START_DELAY = 0.1; // lead before the first note so nothing is clipped
const FADE_OUT = 0.03; // seconds; avoids clicks when a note is cut off
const LOOKAHEAD = 2; // seconds; queue notes this far ahead of the audio clock
const TICK = 0.1; // seconds between scheduler runs; each queues only what's newly due

const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Chord shape as written (no capo), low E to high e.
 * @param {string} name
 * @returns {(number | null)[]}
 */
export function chordShape(name) {
	const shape = chords[name];
	if (!shape) throw new Error(`Unknown chord: ${name}`);
	return shape;
}

/**
 * Pitch class (0–11) of the chord's root, from its name.
 * @param {string} name
 */
export function rootPitchClass(name) {
	const match = name.match(/^([A-G])([#b]?)/);
	if (!match) throw new Error(`Can't read root of chord: ${name}`);
	const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
	return (PITCH_CLASS[match[1]] + accidental + 12) % 12;
}

/**
 * Where the bass note lives in the chord shape: the lowest-sounding played
 * string whose note is the root (or fifth). Frets are without capo.
 * @param {string} name
 * @param {'root' | 'fifth'} which
 * @returns {{ string: number, fret: number }}
 */
export function bassNote(name, which) {
	const shape = chordShape(name);
	const pc = (rootPitchClass(name) + (which === 'fifth' ? 7 : 0)) % 12;
	let best = null;

	shape.forEach((fret, string) => {
		if (fret === null) return;
		const midi = OPEN_MIDI[string] + fret;
		if (midi % 12 === pc && (!best || midi < best.midi)) {
			best = { string, fret, midi };
		}
	});

	if (!best) throw new Error(`The ${name} shape has no ${which} to play in the bass`);
	return { string: best.string, fret: best.fret };
}

/**
 * True MIDI pitch of a fretted note (low E open = 40, E2).
 * @param {number} string index into STRINGS
 * @param {number} fret
 */
export function midiNote(string, fret) {
	return OPEN_MIDI[string] + fret;
}

/**
 * @param {number} string index into STRINGS
 * @param {number} fret
 */
export function sampleUrl(string, fret) {
	if (fret > MAX_FRET) {
		throw new Error(`Fret ${fret} on the ${STRINGS[string]} string is above fret ${MAX_FRET}`);
	}
	return `/samples/guitar/${STRINGS[string]}${fret}.mp3`;
}

/**
 * When each string of a downstroke sounds, in seconds after the first one,
 * following the right hand's pendulum swing.
 * @param {number[]} strings string indices in stroke order
 * @param {number} bpm
 */
export function strumOffsets(strings, bpm) {
	const quarter = 60 / bpm;
	const omega = (2 * Math.PI) / quarter;
	const amplitude = Math.max(
		SWING_MIN_MM,
		SWING_MM_AT_120 * (120 / bpm) ** SWING_TEMPO_EXPONENT
	);
	const crossing = strings.map(
		(string) => Math.asin(((string - SWING_CENTER) * STRING_SPACING_MM) / amplitude) / omega
	);
	return crossing.map((t) => t - crossing[0]);
}

/**
 * How lightly the player is picking at this tempo.
 * @param {number} bpm
 */
export function touch(bpm) {
	const strumDb =
		bpm > TOUCH_BASE_BPM
			? Math.max(TOUCH_MIN_DB, TOUCH_DB_PER_DOUBLING * Math.log2(bpm / TOUCH_BASE_BPM))
			: 0;
	const bassDb = strumDb * TOUCH_BASS_RATIO;
	/** @param {number} db */
	const cutoff = (db) => TOUCH_FULL_CUTOFF * 10 ** (db / 12);
	/** @param {number} db */
	const fadeIn = (db) => -db * TOUCH_FADE_IN_PER_DB;
	return {
		levelDb: { strum: strumDb, bass: bassDb },
		cutoff: { strum: cutoff(strumDb), bass: cutoff(bassDb) },
		fadeIn: { strum: fadeIn(strumDb), bass: fadeIn(bassDb) }
	};
}

/**
 * How the guitar sounds a pitch shift (capo + transposition) with its
 * shapes: as much as possible with a capo, and anything the capo can't
 * reach (below the open shapes, or past the highest sample) by resampling.
 * @param {{ measures: string[][] }[]} sections
 * @param {number} shift semitones
 * @returns {{ capo: number, detune: number }} detune in semitones
 */
export function guitarTuning(sections, shift) {
	const names = slotPositions(sections).map((slot) => slot.name);
	const highest = Math.max(
		0,
		...names.flatMap((name) => chordShape(name).filter((fret) => fret !== null))
	);
	const capo = Math.min(Math.max(shift, 0), MAX_FRET - highest);
	return { capo, detune: shift - capo };
}

/**
 * @typedef {{ time: number, stop: number, string: number, fret: number, chord: string, part: 'bass' | 'strum', levelDb: number }} NoteEvent
 */

/**
 * Turn parsed sections into scheduled notes for one pass (seconds from 0).
 *
 * Plays the rhythm grid from timeline.js: a bass note on each boom and a
 * strum of the top three strings on each chuck (boom-chuck in 4/4 and 2/4,
 * boom-chuck-chuck in 3/4). Booms on the same chord alternate root/fifth; a
 * new chord (or a new pass) starts on its root. A note rings until its
 * string is played again or the chord changes. When looping, that rule wraps
 * into the next pass; otherwise the last chord rings one extra half note.
 *
 * @param {import('./timeline.js').Section[]} sections
 * @param {{ capo?: number, bpm?: number, loop?: boolean }} options
 * @returns {{ events: NoteEvent[], duration: number }} duration = one pass
 */
export function buildEvents(sections, { capo = 0, bpm = 120, loop = false } = {}) {
	const { beats, quarters, slots } = rhythm(sections);
	if (beats.length === 0) throw new Error('Nothing to play');

	const quarter = 60 / bpm;
	const passLength = quarters * quarter;

	// Build two passes when looping so stop times can see into the next one
	const passes = loop ? 2 : 1;
	const end = loop ? passes * passLength : passLength + 2 * quarter;
	const sequence = Array.from({ length: passes }, (_, p) =>
		slots.map((slot) => ({ name: slot.name, start: (slot.start + p * quarters) * quarter }))
	).flat();

	// When each slot's chord stops (next different chord, or the end)
	const chordEnds = new Array(sequence.length);
	let chordEnd = end;
	for (let k = sequence.length - 1; k >= 0; k--) {
		chordEnds[k] = chordEnd;
		if (k > 0 && sequence[k - 1].name !== sequence[k].name) chordEnd = sequence[k].start;
	}

	const { levelDb } = touch(bpm);

	/** @type {NoteEvent[]} */
	let events = [];
	let repeat = 0;

	for (let p = 0; p < passes; p++) {
		/** @type {string | null} */
		let lastBoom = null; // each pass starts on the root
		for (const beat of beats) {
			const k = p * slots.length + beat.slot;
			const chord = sequence[k].name;
			const time = (beat.time + p * quarters) * quarter;
			const stop = chordEnds[k];

			if (beat.role === 'boom') {
				repeat = lastBoom === chord ? repeat + 1 : 0;
				lastBoom = chord;
				const bass = bassNote(chord, repeat % 2 === 0 ? 'root' : 'fifth');
				events.push({
					time,
					stop,
					string: bass.string,
					fret: bass.fret + capo,
					chord,
					part: 'bass',
					levelDb: levelDb.bass
				});
				continue;
			}

			const shape = chordShape(chord);
			const strings = STRUM_STRINGS.filter((string) => shape[string] !== null);
			const offsets = strumOffsets(strings, bpm);
			strings.forEach((string, i) => {
				events.push({
					time: time + offsets[i],
					stop,
					string,
					fret: /** @type {number} */ (shape[string]) + capo,
					chord,
					part: 'strum',
					levelDb: levelDb.strum
				});
			});
		}
	}

	// A string playing again cuts off its previous note
	events.sort((a, b) => a.time - b.time);
	events.forEach((event, i) => {
		const next = events.slice(i + 1).find((other) => other.string === event.string);
		if (next) event.stop = Math.min(event.stop, next.time);
	});

	if (loop) events = events.filter((event) => event.time < passLength);

	return { events, duration: loop ? passLength : end };
}

/** @type {Map<string, Promise<import('tone').ToneAudioBuffer>>} */
const buffers = new Map();

/**
 * @param {typeof import('tone')} Tone
 * @param {string} url
 */
function loadBuffer(Tone, url) {
	let buffer = buffers.get(url);
	if (!buffer) {
		buffer = new Tone.ToneAudioBuffer().load(url);
		buffer.catch(() => buffers.delete(url));
		buffers.set(url, buffer);
	}
	return buffer;
}

/**
 * Play the arrangement on a loop until stopped. Resolves once the first pass
 * is scheduled; later passes are scheduled shortly before they start.
 * @param {{ measures: string[][] }[]} sections
 * @param {{ capo?: number, transpose?: number, bpm?: number, melody?: import('./melody.js').MelodyPart | null }} options
 *   transpose: semitones on top of the capo, for every instrument;
 *   melody: from melodyEvents() for these sections at this tempo, played on
 *   the guitar samples through the Melody channel, locked to the band
 * @returns {Promise<{
 *   stop: () => void,
 *   beats: () => { elapsed: number, length: number } | null,
 *   position: () => (SlotPosition & { beat: number, role: 'boom' | 'chuck', progress: number }) | null
 * }>}
 */
export async function playArrangement(sections, options = {}) {
	/*
	 * iPhone: the ring/silent switch mutes Web Audio unless the page says it
	 * plays music, as a music app does (Safari 16.4+'s Audio Session API).
	 * Set before anything is awaited, while we're still inside the tap.
	 */
	const audioSession = /** @type {any} */ (globalThis.navigator)?.audioSession;
	if (audioSession) audioSession.type = 'playback';

	const bpm = options.bpm ?? 120;
	const shift = (options.capo ?? 0) + (options.transpose ?? 0);
	const tuning = guitarTuning(sections, shift);
	const { events, duration } = buildEvents(sections, { bpm, capo: tuning.capo, loop: true });
	const { slots: positions, beats: grid } = rhythm(sections);
	const quarter = 60 / bpm;
	const urls = events.map((event) => sampleUrl(event.string, event.fret));
	// Bass and mandolin work in concert pitch and pick their own register
	const concert = { bpm, capo: mod12(shift) };
	const bass = bassEvents(sections, concert);
	const chops = chopNotes(sections, concert);
	const chopUrls = chops.map((note) => mandoSampleUrl(note.course, note.fret));
	const melody = options.melody ?? null;
	if (melody && Math.abs(melody.period - duration) > 1e-6) {
		throw new Error('The melody was prepared for a different arrangement or tempo');
	}
	/** @param {import('./melody.js').MelodyEvent} note */
	const melodyUrl = (note) => sampleUrl(note.string, note.fret);

	const Tone = await import('tone');
	await Tone.start();
	// Touch filters: a lighter pick stroke is duller
	const feel = touch(bpm);
	// Any transposition the capo can't reach is made by resampling
	const guitarRate = 2 ** (tuning.detune / 12);
	/** @param {'bass' | 'strum'} part */
	const touchFilter = async (part) =>
		new Tone.Filter({ type: 'lowpass', frequency: feel.cutoff[part], Q: Math.SQRT1_2 }).connect(
			await getChannel('guitar', part)
		);
	const outputs = {
		bass: await touchFilter('bass'),
		strum: await touchFilter('strum')
	};

	const upright = createUpright(Tone, await getChannel('bass'));

	const mandolin = await getChannel('mandolin');

	const loaded = await Promise.all(urls.map((url) => loadBuffer(Tone, url)));
	const chopSounds = await Promise.all(chopUrls.map((url) => loadBuffer(Tone, url)));
	const melodyOut = melody ? await getChannel('melody') : null;
	const melodySounds = await Promise.all(
		(melody?.events ?? []).map((note) => loadBuffer(Tone, melodyUrl(note)))
	);
	const introSounds = await Promise.all(
		(melody?.intro ?? []).map((note) => loadBuffer(Tone, melodyUrl(note)))
	);

	/*
	 * Timing. Every note is placed on the audio hardware's sample clock at an
	 * absolute time, start + pass × duration + offset, all from one fixed
	 * origin; nothing is timed relative to the previous note or pass, so error
	 * can't accumulate however long it loops. The timer below only decides
	 * *when to queue* upcoming passes. It runs on Tone's clock (a worker
	 * ticking against the audio clock, unaffected by background-tab timer
	 * throttling), queues everything due within the lookahead, catches up if
	 * it was ever late, and never plays a note after its time has passed.
	 */
	const context = Tone.getContext();
	// The band waits for the melody's pickup, so bar 1 lands together
	const start = Tone.now() + START_DELAY + (melody?.leadIn ?? 0);
	/** @type {Set<import('tone').Player>} */
	const players = new Set();
	/** @type {number | undefined} */
	let timer;
	let stopped = false;

	/** @param {import('tone').Player} player */
	const track = (player) => {
		player.onstop = () => {
			players.delete(player);
			player.dispose();
		};
		players.add(player);
		return player;
	};

	/**
	 * A melody note on the guitar samples, at an absolute audio-clock time.
	 * @param {import('./melody.js').MelodyEvent} note
	 * @param {import('tone').ToneAudioBuffer} buffer
	 * @param {number} at
	 */
	const playMelody = (note, buffer, at) =>
		track(
			new Tone.Player({
				url: buffer,
				volume: note.levelDb,
				fadeOut: FADE_OUT,
				playbackRate: note.rate
			}).connect(/** @type {import('tone').ToneAudioNode} */ (melodyOut))
		)
			.start(at)
			.stop(at + note.stop - note.time);

	// Each instrument is a looping stream; the upright's line spans several
	// passes so it can vary between them
	const streams = [
		{
			stream: createStream(events, duration),
			/** @param {NoteEvent} event @param {number} i @param {number} at */
			play: (event, i, at) =>
				track(
					new Tone.Player({
						url: loaded[i],
						volume: event.levelDb,
						fadeIn: feel.fadeIn[event.part],
						fadeOut: FADE_OUT,
						playbackRate: guitarRate
					}).connect(outputs[event.part])
				)
					.start(at)
					.stop(at + event.stop - event.time)
		},
		{
			stream: createStream(chops, duration),
			// Mandolin chops play to the end of each sample (the choke is recorded)
			/** @param {import('./mandolin.js').MandoNote} chop @param {number} i @param {number} at */
			play: (chop, i, at) =>
				track(new Tone.Player({ url: chopSounds[i], volume: chop.levelDb }).connect(mandolin)).start(at)
		},
		{
			stream: createStream(bass.notes, bass.passes * duration),
			/** @param {import('./upright.js').UprightNote} note @param {number} _i @param {number} at */
			play: (note, _i, at) => upright.play(note, at)
		}
	];

	if (melody) {
		// Same origin and period as the band: one pass of melody per pass of the arrangement
		streams.push({
			stream: createStream(melody.events, duration),
			/** @param {import('./melody.js').MelodyEvent} note @param {number} i @param {number} at */
			play: (note, i, at) => playMelody(note, melodySounds[i], at)
		});
		// The pickup before the first downbeat (it's at most a bar, so it's queued now)
		melody.intro.forEach((note, i) => playMelody(note, introSounds[i], start + note.time));
	}

	/*
	 * Lookahead scheduler: every TICK, queue just the notes due within the
	 * lookahead. The work is spread evenly (a few notes per tick) instead of a
	 * whole pass at once, which would stall the main thread and make the
	 * scrolling chart stutter.
	 */
	function tick() {
		if (stopped) return;
		const now = Tone.now() - start;
		for (const { stream, play } of streams) {
			stream.skipBefore(now); // never play a note late
			for (const { note, index, at } of stream.take(now + LOOKAHEAD)) {
				play(/** @type {any} */ (note), index, start + at);
			}
		}
		timer = context.setTimeout(tick, TICK);
	}

	tick();

	return {
		/**
		 * The audio clock in quarter notes: `elapsed` from bar 1 of the first
		 * pass (negative during the melody's pickup), `length` of one pass.
		 * @returns {{ elapsed: number, length: number } | null}
		 */
		beats() {
			if (stopped) return null;
			return { elapsed: (Tone.immediate() - start) / quarter, length: duration / quarter };
		},
		/** Where playback is right now, by the audio clock. */
		position() {
			const elapsed = Tone.immediate() - start;
			if (stopped || elapsed < 0) return null;
			const inPass = elapsed % duration;
			const q = Math.min(Math.floor(inPass / quarter), grid.length - 1);
			const slot = positions[grid[q].slot];
			return {
				...slot,
				beat: q - slot.start, // quarter note within this chord
				role: grid[q].role,
				// progress: 0–1 through the current pass, for smooth scrolling
				progress: inPass / duration
			};
		},
		stop() {
			stopped = true;
			if (timer !== undefined) context.clearTimeout(timer);
			for (const player of players) {
				try {
					player.stop();
				} catch {
					// already stopped
				}
				player.dispose();
			}
			players.clear();
			upright.stop();
			// Let any fade-outs finish before removing the touch filters
			setTimeout(() => {
				outputs.bass.dispose();
				outputs.strum.dispose();
			}, 200);
		}
	};
}
