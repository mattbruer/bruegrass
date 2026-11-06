/**
 * The band as sound: turns a performance (performance.js) into sample
 * players and the upright's synth, playing into the mixer's channels. It
 * doesn't decide *when* notes are queued: live playback queues them a little
 * ahead (playback/livePlayback.js), an export queues them all at once
 * (export/renderSong.js). Both get the same sound from here.
 */
import { createUpright } from './upright.js';
import { roundRobin } from './roundRobin.js';
import { brightness } from './hand.js';
import { settings } from '$lib/settings/settings.svelte.js';

/** Seconds; avoids clicks when a note is cut off. */
const FADE_OUT = 0.03;

/** Decoded samples, shared by every performance (and by live and offline audio). */
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

	const audio = Tone.getContext().rawContext;
	const guitarOut = {
		bass: await channelInput('guitar', 'bass'),
		strum: await channelInput('guitar', 'strum')
	};

	/**
	 * Each guitar note's own low-pass: a lighter touch (faster tempo, softer
	 * stroke) is duller.
	 * @param {'bass' | 'strum'} part
	 * @param {number} forceDb the stroke's force (hand.js)
	 */
	const touchFilter = (part, forceDb) => {
		const filter = audio.createBiquadFilter();
		filter.type = 'lowpass';
		filter.Q.value = Math.SQRT1_2;
		filter.frequency.value = Math.min(
			guitar.feel.cutoff[part] * brightness(forceDb),
			audio.sampleRate / 2
		);
		Tone.connect(filter, guitarOut[part]);
		return filter;
	};

	/** How much of the hand's feel to play: the Feel button and slider by Play, read per note. */
	const feelAmount = () => (settings.feelOn ? settings.feelAmount : 0);
	const upright = createUpright(Tone, await channelInput('bass'));
	const mandolinOut = await channelInput('mandolin');
	const melodyOut = melody ? await channelInput('melody') : null;

	const [guitarSounds, chopSounds, melodySounds, introSounds] = await Promise.all(
		[guitar.urls, mandolin.urls, melody?.urls ?? [], melody?.introUrls ?? []].map((urls) =>
			Promise.all(urls.map((url) => loadBuffer(Tone, url)))
		)
	);

	/** Every sounding player, with what to let go of when it ends. */
	/** @type {Map<import('tone').Player, (() => void) | undefined>} */
	const players = new Map();
	/**
	 * @param {import('tone').Player} player
	 * @param {() => void} [release] lets go of anything else the note made
	 */
	const track = (player, release) => {
		if (!live) return player;
		player.onstop = () => {
			players.delete(player);
			player.dispose();
			release?.();
		};
		players.set(player, release);
		return player;
	};

	/**
	 * A melody note on the guitar samples.
	 * @param {import('../melody/melody.js').MelodyEvent} note
	 * @param {import('tone').ToneAudioBuffer} buffer
	 * @param {number} at
	 */
	const playMelody = (note, buffer, at) => {
		const each = roundRobin();
		track(
			new Tone.Player({
				url: buffer,
				volume: note.levelDb + each.db,
				fadeOut: FADE_OUT,
				playbackRate: note.rate * each.rate
			}).connect(/** @type {import('tone').ToneAudioNode} */ (melodyOut))
		)
			.start(at, each.skip)
			.stop(at + note.stop - note.time);
	};

	/** @type {Stream[]} */
	const streams = [
		{
			notes: guitar.events,
			period: guitar.period,
			/** @param {import('./guitar.js').NoteEvent} event @param {number} i @param {number} at */
			play: (event, i, at) => {
				const each = roundRobin();
				const feel = feelAmount();
				const forceDb = event.force * feel;
				const start = at + event.nudge * feel;
				const filter = touchFilter(event.part, forceDb);
				track(
					new Tone.Player({
						url: guitarSounds[i],
						volume: event.levelDb + forceDb + each.db,
						fadeIn: guitar.feel.fadeIn[event.part],
						fadeOut: FADE_OUT,
						playbackRate: guitar.rate * each.rate
					}).connect(filter),
					() => filter.disconnect()
				)
					.start(start, each.skip)
					.stop(start + event.stop - event.time);
			}
		},
		{
			notes: mandolin.chops,
			period: performance.passLength,
			// Mandolin chops play to the end of each sample (the choke is recorded)
			/** @param {import('./mandolin.js').MandoNote} chop @param {number} i @param {number} at */
			play: (chop, i, at) => {
				const each = roundRobin();
				track(
					new Tone.Player({
						url: chopSounds[i],
						volume: chop.levelDb + each.db,
						playbackRate: each.rate
					}).connect(mandolinOut)
				).start(at, each.skip);
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
			for (const [player, release] of players) {
				player.onstop = () => {};
				try {
					player.stop();
				} catch {
					// already stopped
				}
				player.dispose();
				release?.();
			}
			players.clear();
			upright.stop();
		}
	};
}
