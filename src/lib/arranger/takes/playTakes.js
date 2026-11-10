/**
 * Recorded takes playing with the band: one more stream for the lookahead
 * scheduler (like an instrument's), with one "note" per take per pass: the
 * part of the take that falls in the pass (takeTiming.js), on its track's
 * mixer channel.
 */
import { sliceForPass } from './takeTiming.js';

/**
 * @typedef {import('./takeTiming.js').Placed & { trackId: string, buffer: AudioBuffer, soundFrom: number }} PlayableTake
 *   soundFrom: how far into the take its sound begins (takePickup.js)
 */

/**
 * @param {typeof import('tone')} Tone
 * @param {PlayableTake[]} takes
 * @param {{ regionStart: number, passLength: number, lead: number }} pass seconds;
 *   lead: how long before bar 1 playback starts (anything earlier is left out:
 *   the scheduler would drop a slice that starts before playback does)
 * @param {(id: string) => Promise<import('tone').ToneAudioNode>} channelInput
 */
export async function createTakePlayback(Tone, takes, pass, channelInput) {
	const slices = [];
	for (const take of takes) {
		const slice = trimmedToLead(sliceForPass(take, pass), pass.lead);
		if (!slice) continue;
		const buffer = new Tone.ToneAudioBuffer(take.buffer);
		slices.push({ ...slice, time: slice.at, buffer, output: await channelInput(take.trackId) });
	}
	slices.sort((a, b) => a.time - b.time);

	/** @type {Set<import('tone').Player>} */
	const players = new Set();

	return {
		stream: {
			notes: slices,
			period: pass.passLength,
			/** @param {(typeof slices)[number]} slice @param {number} _i @param {number} at */
			play(slice, _i, at) {
				const player = new Tone.Player({ url: slice.buffer, fadeIn: 0.005, fadeOut: 0.01 });
				player.connect(slice.output);
				player.onstop = () => {
					players.delete(player);
					player.dispose();
				};
				players.add(player);
				player.start(at, slice.offset, slice.duration);
			}
		},

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
		}
	};
}

/**
 * @param {import('./takeTiming.js').Slice | null} slice
 * @param {number} lead
 */
function trimmedToLead(slice, lead) {
	if (!slice || slice.at >= -lead) return slice;
	const cut = -lead - slice.at;
	if (cut >= slice.duration) return null;
	return { at: -lead, offset: slice.offset + cut, duration: slice.duration - cut };
}
