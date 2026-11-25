/**
 * Where a sample's note is struck, in seconds. Every MP3 starts with the
 * encoder's silence (about 23 ms; browsers decode it differently), and some
 * recordings have a quiet scrape of the pick before the string really sounds
 * (ee8, the high e's 8th fret, about 35 ms of it). Both are passed over:
 * the strike is where the sound first reaches a fifth of the sample's peak.
 * Measured here, as each sample loads, so new samples need nothing.
 */

/** The note has been struck at this share of the sample's peak (a scrape stays under it). */
const STRIKE_SHARE = 0.2;
/** Seconds of a plucked sample kept before its strike: the pick catching the string. */
const PICK_BEFORE_STRIKE = 0.005;

/** @type {WeakMap<object, number>} */
const measured = new WeakMap();

/** @param {{ getChannelData: (channel: number) => Float32Array, sampleRate: number }} buffer */
export function soundStart(buffer) {
	let start = measured.get(buffer);
	if (start === undefined) {
		const data = buffer.getChannelData(0);
		let peak = 0;
		for (const sample of data) peak = Math.max(peak, Math.abs(sample));
		const index = data.findIndex((sample) => Math.abs(sample) >= peak * STRIKE_SHARE);
		start = Math.max(0, index) / buffer.sampleRate;
		measured.set(buffer, start);
	}
	return start;
}

/**
 * Start a sample so its note is struck exactly at `at`, whatever silence
 * or scrape the recording has before it. A pluck keeps the pick's last
 * moment before the strike; a graze starts `skip` past it, leaving the
 * pick's click out.
 * @param {import('tone').Player} player
 * @param {import('tone').ToneAudioBuffer} buffer
 * @param {number} at
 * @param {number} skip seconds of the sample after the strike left out (0: a pluck)
 * @param {number} [rate] the player's playback rate
 */
export function startOnTheBeat(player, buffer, at, skip, rate = 1) {
	const strike = soundStart(buffer);
	const from = skip > 0 ? strike + skip : Math.max(0, strike - PICK_BEFORE_STRIKE);
	return player.start(Math.max(0, at + (from - strike) / rate), from);
}
