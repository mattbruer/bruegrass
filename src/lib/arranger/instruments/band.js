/**
 * The band as sound: turns a performance (performance.js) into sample
 * players and the upright's synth, playing into the mixer's channels. It
 * doesn't decide *when* notes are queued: live playback queues them a little
 * ahead (playback/livePlayback.js), an export queues them all at once
 * (export/renderSong.js). Both get the same sound from here.
 */
import { createUpright } from './upright.js';

/** Seconds; avoids clicks when a note is cut off. */
const FADE_OUT = 0.03;

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
 * @param {(id: string, part?: string) => import('tone').ToneAudioNode | Promise<import('tone').ToneAudioNode>} channelInput
 *   where each instrument plays into the mixer
 * @param {{ live?: boolean }} [options]
 *   live: playing for as long as you listen, so each finished note's player
 *   is let go (an offline render is thrown away whole once it's done; and
 *   there, Tone reports a player stopped before it has even played, so
 *   letting it go then would silence it)
 */
export async function createBand(Tone, performance, channelInput, { live = true } = {}) {
	const { guitar, mandolin, bass, melody } = performance;

	// Touch filters: a lighter pick stroke is duller
	/** @param {'bass' | 'strum'} part */
	const touchFilter = async (part) =>
		new Tone.Filter({
			type: 'lowpass',
			frequency: guitar.feel.cutoff[part],
			Q: Math.SQRT1_2
		}).connect(await channelInput('guitar', part));
	const guitarOut = { bass: await touchFilter('bass'), strum: await touchFilter('strum') };
	const upright = createUpright(Tone, await channelInput('bass'));
	const mandolinOut = await channelInput('mandolin');
	/** @type {Map<string, import('tone').ToneAudioNode>} the melody's and each harmony part's channel */
	const melodyOuts = new Map();
	for (const note of [...(melody?.events ?? []), ...(melody?.intro ?? [])]) {
		if (!melodyOuts.has(note.channel))
			melodyOuts.set(note.channel, await channelInput(note.channel));
	}

	const [guitarSounds, chopSounds, melodySounds, introSounds] = await Promise.all(
		[guitar.urls, mandolin.urls, melody?.urls ?? [], melody?.introUrls ?? []].map((urls) =>
			Promise.all(urls.map((url) => loadBuffer(Tone, url)))
		)
	);

	/** @type {Set<import('tone').Player>} */
	const players = new Set();
	/** @param {import('tone').Player} player */
	const track = (player) => {
		if (!live) return player;
		player.onstop = () => {
			players.delete(player);
			player.dispose();
		};
		players.add(player);
		return player;
	};

	/**
	 * A melody note on the guitar samples.
	 * @param {import('../melody/melody.js').MelodyEvent} note
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
			}).connect(/** @type {import('tone').ToneAudioNode} */ (melodyOuts.get(note.channel)))
		)
			.start(at)
			.stop(at + note.stop - note.time);

	/** @type {Stream[]} */
	const streams = [
		{
			notes: guitar.events,
			period: guitar.period,
			/** @param {import('./guitar.js').NoteEvent} event @param {number} i @param {number} at */
			play: (event, i, at) =>
				track(
					new Tone.Player({
						url: guitarSounds[i],
						volume: event.levelDb,
						fadeIn: guitar.feel.fadeIn[event.part],
						fadeOut: event.fadeOut,
						playbackRate: guitar.rate
					}).connect(guitarOut[event.part])
				)
					.start(at)
					.stop(at + event.stop - event.time)
		},
		{
			notes: mandolin.chops,
			period: performance.passLength,
			// Mandolin chops play to the end of each sample (the choke is recorded)
			/** @param {import('./mandolin.js').MandoNote} chop @param {number} i @param {number} at */
			play: (chop, i, at) =>
				track(
					new Tone.Player({ url: chopSounds[i], volume: chop.levelDb }).connect(mandolinOut)
				).start(at)
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
			play: (note, i, at) => playMelody(note, melodySounds[i], at)
		});
	}

	return {
		streams,

		/**
		 * The melody's pickup, before bar 1 (it's at most a bar, so it's queued at once).
		 * @param {number} barOne the audio-clock time of bar 1
		 */
		playIntro(barOne) {
			melody?.intro.forEach((note, i) => playMelody(note, introSounds[i], barOne + note.time));
		},

		/** Stop everything at once and let go of the players, synth and filters. */
		stop() {
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
				guitarOut.bass.dispose();
				guitarOut.strum.dispose();
			}, 200);
		}
	};
}
