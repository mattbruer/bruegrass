/**
 * A tune instrument (tuneInstruments.js) ready to play into a channel: each
 * note is the nearest sample, pitched to the note. Its samples load once
 * per page and are shared by every voice on that instrument; a note asked
 * for before they've arrived is left out (`loadTuneSamples` waits for them).
 */
import { loadBuffer } from './band.js';
import { SAMPLE_SETS } from './tuneInstruments.js';
import { levelMatchDb } from './sampleLoudness.js';
import { startOnTheBeat } from './soundStart.js';

/** Seconds a note fades out when it ends, or when the same pitch is struck again. */
const RELEASE = 0.15;
const DAMP = 0.02;

/**
 * Loaded, by instrument id; `gainDb` brings the set to one loudness (sampleLoudness.js).
 * @type {Map<string, { samples: { midi: number, buffer: import('tone').ToneAudioBuffer }[], gainDb: number }>}
 */
const loaded = new Map();

/**
 * Load an instrument's samples (once).
 * @param {typeof import('tone')} Tone
 * @param {import('./tuneInstruments.js').TuneInstrument} instrument
 */
export async function loadTuneSamples(Tone, instrument) {
	if (loaded.has(instrument.id)) return;
	const { url } = SAMPLE_SETS[instrument.set];
	const samples = await Promise.all(
		instrument.notes.map(async (midi) => ({
			midi,
			buffer: await loadBuffer(Tone, url(instrument.folder, midi))
		}))
	);
	const gainDb = levelMatchDb(samples.map((each) => each.buffer));
	loaded.set(instrument.id, { samples, gainDb });
}

/**
 * @param {typeof import('tone')} Tone
 * @param {import('./tuneInstruments.js').TuneInstrument} instrument
 * @param {import('tone').InputNode} destination
 * @param {{ live?: boolean }} [options] live: let each note's player go when it ends
 *   (not offline, where Tone reports a player stopped before it has played: band.js)
 */
export function createTuneVoice(Tone, instrument, destination, { live = true } = {}) {
	/** @type {Set<import('tone').Player>} */
	const players = new Set();
	/** @type {Map<number, import('tone').Player>} the last note on each pitch */
	const lastOn = new Map();
	const pending = loadTuneSamples(Tone, instrument).catch(console.error);

	return {
		/** Resolves when its samples have loaded. */
		ready: pending,

		/**
		 * @param {number} pitch MIDI, where the guitar would sound it
		 * @param {number} duration seconds
		 * @param {number} time audio-clock time
		 * @param {number} levelDb the note's level as the guitar would play it
		 */
		play(pitch, duration, time, levelDb) {
			const instrumentSamples = loaded.get(instrument.id);
			if (!instrumentSamples) return;
			const { samples, gainDb } = instrumentSamples;
			const midi = pitch + instrument.octave;
			const nearest = samples.reduce((best, each) =>
				Math.abs(each.midi - midi) < Math.abs(best.midi - midi) ? each : best
			);
			lastOn.get(midi)?.stop(Math.max(0, time - DAMP));

			const rate = 2 ** ((midi - nearest.midi) / 12);
			const player = new Tone.Player({
				url: nearest.buffer,
				volume: gainDb + instrument.volumeDb + levelDb,
				fadeOut: RELEASE,
				playbackRate: rate
			}).connect(/** @type {any} */ (destination));
			if (live)
				player.onstop = () => {
					players.delete(player);
					if (lastOn.get(midi) === player) lastOn.delete(midi);
					player.dispose();
				};
			players.add(player);
			lastOn.set(midi, player);
			if (instrument.struck) startOnTheBeat(player, nearest.buffer, time, 0, rate);
			else player.start(time);
			player.stop(time + duration);
		},

		/** Stop at once and let go of the players. */
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
			lastOn.clear();
		}
	};
}
