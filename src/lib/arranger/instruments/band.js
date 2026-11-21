/**
 * The band as sound: turns a performance (performance.js) into sample
 * players and the upright's synth, playing into the mixer's channels. It
 * doesn't decide *when* notes are queued: live playback queues them a little
 * ahead (playback/livePlayback.js), an export queues them all at once
 * (export/renderSong.js). Both get the same sound from here.
 */
import { createUpright } from './upright.js';
import { createTuneVoice } from './tuneVoice.js';
import { tuneInstrument } from './tuneInstruments.js';
import { melodyPitch } from '../melody/melody.js';
import { soundStart } from './soundStart.js';
import { CHOP_ARTICULATION } from './mandolin.js';
import { CHOP_DECAY, CHOP_FADE_OUT, chopFilter, createChopTick } from './chopSound.js';
import { tuningFix } from './sampleTuning.js';

/** Seconds of a plucked sample kept before its strike: the pick catching the string. */
const PICK_BEFORE_STRIKE = 0.005;

/** Decoded samples, shared by every performance (and by live and offline audio). */
/** @type {Map<string, Promise<import('tone').ToneAudioBuffer>>} */
const buffers = new Map();

/**
 * @param {typeof import('tone')} Tone
 * @param {string} url
 */
export function loadBuffer(Tone, url) {
	let buffer = buffers.get(url);
	if (!buffer) {
		buffer = new Tone.ToneAudioBuffer().load(url);
		buffer.catch(() => buffers.delete(url));
		buffers.set(url, buffer);
	}
	return buffer;
}

/**
 * @typedef {{
 *   notes: { time: number }[],
 *   period: number,
 *   play: (note: any, index: number, at: number) => void
 * }} Stream
 *   one instrument's notes, repeating every `period` seconds when looping;
 *   play(note, its index, absolute audio-clock time)
 */

/**
 * Build the band in the current Tone context (load its samples, make its
 * synth and filters).
 * @param {typeof import('tone')} Tone
 * @param {import('./performance.js').Performance} performance
 * @param {(id: string) => import('tone').ToneAudioNode | Promise<import('tone').ToneAudioNode>} channelInput
 *   where each instrument plays into the mixer
 * @param {{
 *   live?: boolean,
 *   instrumentOf?: (channelId: string) => import('./tuneInstruments.js').TuneInstrument
 * }} [options]
 *   live: playing for as long as you listen, so each finished note's player
 *   is let go (an offline render is thrown away whole once it's done; and
 *   there, Tone reports a player stopped before it has even played, so
 *   letting it go then would silence it); instrumentOf: what each tune
 *   channel plays on, asked at each note, so a change is heard while playing
 *   (the default when not given)
 */
export async function createBand(
	Tone,
	performance,
	channelInput,
	{ live = true, instrumentOf } = {}
) {
	const { guitar, mandolin, bass, melody } = performance;

	// Touch filters: a lighter pick stroke is duller
	const guitarInput = await channelInput('guitar');
	/** @param {'bass' | 'strum'} part */
	const touchFilter = (part) =>
		new Tone.Filter({
			type: 'lowpass',
			frequency: guitar.feel.cutoff[part],
			Q: Math.SQRT1_2
		}).connect(guitarInput);
	const guitarOut = { bass: touchFilter('bass'), strum: touchFilter('strum') };
	const upright = createUpright(Tone, await channelInput('bass'));
	const mandolinOut = new Tone.Filter({
		type: 'lowpass',
		frequency: CHOP_ARTICULATION.brightness,
		Q: Math.SQRT1_2
	}).connect(await channelInput('mandolin'));
	const chopTick = createChopTick(Tone, mandolinOut);
	/** @type {Map<string, import('tone').ToneAudioNode>} the melody's and each harmony part's channel */
	const melodyOuts = new Map();
	for (const note of [...(melody?.events ?? []), ...(melody?.intro ?? [])]) {
		if (!melodyOuts.has(note.channel))
			melodyOuts.set(note.channel, await channelInput(note.channel));
	}

	const [guitarSounds, chopSounds] = await Promise.all(
		[guitar.urls, mandolin.urls].map((urls) =>
			Promise.all(urls.map((url) => loadBuffer(Tone, url)))
		)
	);

	/**
	 * Start a sample so its note is struck exactly at `at`, whatever silence
	 * or scrape the recording has before it (soundStart.js). A pluck keeps
	 * the pick's last moment before the strike; a graze starts `skip` past it,
	 * leaving the pick's click out.
	 * @param {import('tone').Player} player
	 * @param {import('tone').ToneAudioBuffer} buffer
	 * @param {number} at
	 * @param {number} skip seconds of the sample after the strike left out (0: a pluck)
	 * @param {number} [rate] the player's playback rate
	 */
	const startOnTheBeat = (player, buffer, at, skip, rate = 1) => {
		const strike = soundStart(buffer);
		const from = skip > 0 ? strike + skip : Math.max(0, strike - PICK_BEFORE_STRIKE);
		return player.start(Math.max(0, at + (from - strike) / rate), from);
	};

	/** Live players, each with the nodes made just for it (a chop's filter). */
	/** @type {Map<import('tone').Player, import('tone').ToneAudioNode[]>} */
	const players = new Map();
	/** @param {import('tone').Player} player */
	const release = (player) => {
		if (!players.has(player)) return;
		for (const node of players.get(player) ?? []) node.dispose();
		players.delete(player);
		player.dispose();
	};
	/**
	 * @param {import('tone').Player} player
	 * @param {...import('tone').ToneAudioNode} ownNodes freed with the player
	 */
	const track = (player, ...ownNodes) => {
		if (!live) return player;
		player.onstop = () => release(player);
		players.set(player, ownNodes);
		return player;
	};

	/** What each tune channel plays on now (asked at each note, so a change is heard while playing). */
	const instrumentFor = (/** @type {string} */ channel) =>
		instrumentOf?.(channel) ?? tuneInstrument(undefined);

	/** Tune voices, made when a channel first plays on an instrument: key "channel:instrument" */
	/** @type {Map<string, ReturnType<typeof createTuneVoice>>} */
	const tuneVoices = new Map();
	/** @param {string} channel */
	const tuneVoice = (channel) => {
		const instrument = instrumentFor(channel);
		const key = `${channel}:${instrument.id}`;
		let voice = tuneVoices.get(key);
		if (!voice) {
			const output = /** @type {import('tone').ToneAudioNode} */ (melodyOuts.get(channel));
			voice = createTuneVoice(Tone, instrument, output, { live });
			tuneVoices.set(key, voice);
		}
		return voice;
	};
	// Every tune channel's samples are loaded before the first note
	await Promise.all([...melodyOuts.keys()].map((channel) => tuneVoice(channel).ready));

	/**
	 * A melody note, on its channel's instrument.
	 * @param {import('../melody/melody.js').MelodyEvent} note
	 * @param {number} at
	 */
	const playMelody = (note, at) =>
		tuneVoice(note.channel).play(melodyPitch(note), note.stop - note.time, at, note.levelDb);

	/** @type {Stream[]} */
	const streams = [
		{
			notes: guitar.events,
			period: guitar.period,
			/** @param {import('./guitar.js').NoteEvent} event @param {number} i @param {number} at */
			play: (event, i, at) => {
				const rate = guitar.rate * tuningFix(event.string, event.fret);
				const player = track(
					new Tone.Player({
						url: guitarSounds[i],
						volume: event.levelDb,
						fadeIn: guitar.feel.fadeIn[event.part],
						fadeOut: event.fadeOut,
						playbackRate: rate
					}).connect(guitarOut[event.part])
				);
				const skip = guitar.feel.skip[event.part];
				startOnTheBeat(player, guitarSounds[i], at, skip, rate).stop(at + event.stop - event.time);
			}
		},
		{
			notes: mandolin.chops,
			period: performance.passLength,
			/** @param {import('./mandolin.js').MandoNote} chop @param {number} i @param {number} at */
			play: (chop, i, at) => {
				const filter = chopFilter(Tone, at);
				const player = track(
					new Tone.Player({
						url: chopSounds[i],
						volume: chop.levelDb,
						fadeIn: CHOP_ARTICULATION.attack,
						fadeOut: CHOP_FADE_OUT
					})
						.connect(filter)
						.connect(mandolinOut),
					filter
				);
				startOnTheBeat(player, chopSounds[i], at, CHOP_ARTICULATION.skip);
				player.stop(at + CHOP_DECAY);
				// One tk per chop, on its first course (struck first)
				if (chop.course === 0) chopTick.strike(at);
			}
		},
		{
			notes: bass.notes,
			period: bass.period,
			/** @param {import('./upright.js').UprightNote} note @param {number} _i @param {number} at */
			play: (note, _i, at) => upright.play(note, at)
		}
	];

	if (melody) {
		// Same origin and period as the band: one pass of melody per pass of the arrangement
		streams.push({
			notes: melody.events,
			period: performance.passLength,
			/** @param {import('../melody/melody.js').MelodyEvent} note @param {number} i @param {number} at */
			play: (note, _i, at) => playMelody(note, at)
		});
	}

	return {
		streams,

		/**
		 * The melody's pickup, before bar 1 (it's at most a bar, so it's queued at once).
		 * @param {number} barOne the audio-clock time of bar 1
		 */
		playIntro(barOne) {
			melody?.intro.forEach((note) => playMelody(note, barOne + note.time));
		},

		/** Stop everything at once and let go of the players, synth and filters. */
		stop() {
			for (const player of [...players.keys()]) {
				try {
					player.stop();
				} catch {
					// already stopped
				}
				release(player);
			}
			upright.stop();
			for (const voice of tuneVoices.values()) voice.stop();
			tuneVoices.clear();
			// Let any fade-outs finish before removing the touch and graze filters
			setTimeout(() => {
				guitarOut.bass.dispose();
				guitarOut.strum.dispose();
				mandolinOut.dispose();
				chopTick.dispose();
			}, 200);
		}
	};
}
