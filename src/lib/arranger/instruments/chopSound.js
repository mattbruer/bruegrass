/**
 * The percussive part of a mandolin chop, faked on top of the samples: a
 * short noise "tk" where the hand and pick hit the strings, a filter that
 * starts bright and closes, and a fade so the chop stops like a hand
 * coming off the strings. Tuning lives here; band.js wires it in.
 *
 * Tuned toward percussion (the user's ear, Nov 2026: the chuck was buried
 * under the notes): a louder, longer, lower tk, and the notes cut shorter
 * and duller. A recorded chuck (muted strings) would replace the tk here:
 * `createChopTick` is the one place that makes it.
 */

/** Seconds from a chop's strike to silence. */
export const CHOP_DECAY = 0.08;
/** Seconds of fade-out before that stop. */
export const CHOP_FADE_OUT = 0.025;

/** Each chop's low-pass starts at `from` Hz and closes to `to` Hz over `seconds`. */
export const CHOP_SWEEP = { from: 6000, to: 1400, seconds: 0.02 };

/** The "tk": a burst of noise through a band-pass, once per chop. */
export const CHOP_TICK = { seconds: 0.03, frequency: 2200, q: 0.7, levelDb: -2 };

/**
 * A low-pass for one chop, bright at its strike and closing after.
 * @param {typeof import('tone')} Tone
 * @param {number} at audio-clock time of the strike
 */
export function chopFilter(Tone, at) {
	const filter = new Tone.Filter({ type: 'lowpass', frequency: CHOP_SWEEP.from, Q: 1 });
	filter.frequency.setValueAtTime(CHOP_SWEEP.from, at);
	filter.frequency.exponentialRampToValueAtTime(CHOP_SWEEP.to, at + CHOP_SWEEP.seconds);
	return filter;
}

/**
 * The shared "tk" voice. One is enough: chops are never closer than an
 * eighth note, and each tk is over in about 15 ms.
 * @param {typeof import('tone')} Tone
 * @param {import('tone').ToneAudioNode} output
 */
export function createChopTick(Tone, output) {
	const noise = new Tone.NoiseSynth({
		noise: { type: 'white' },
		envelope: { attack: 0.001, decay: CHOP_TICK.seconds, sustain: 0, release: 0.002 },
		volume: CHOP_TICK.levelDb
	});
	const band = new Tone.Filter({
		type: 'bandpass',
		frequency: CHOP_TICK.frequency,
		Q: CHOP_TICK.q
	}).connect(output);
	noise.connect(band);
	return {
		/** @param {number} at audio-clock time of the strike */
		strike(at) {
			noise.triggerAttackRelease(CHOP_TICK.seconds, at);
		},
		dispose() {
			noise.dispose();
			band.dispose();
		}
	};
}
