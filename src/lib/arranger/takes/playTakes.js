/**
 * The audio lanes' clips playing with the band: one more stream for the
 * lookahead scheduler (like an instrument's), with one "note" per clip per
 * pass: the part of the clip that falls in the pass (takeTiming.js), on its
 * track's mixer channel. Each plays through a native buffer source (or, for
 * a take at another tempo than it was recorded at, a stretched source that
 * keeps its pitch) and a gain that carries its level and fades.
 */
import { sliceForPass } from './takeTiming.js';
import { prepareStretchSources, startStretchSource } from '$lib/audio/stretch/stretchSource.js';
import { nativeContextOf, nativeNodeOf } from '$lib/audio/nativeContext.js';
import { EDGE_FADE } from './clips.js';
import { dbToGain } from './clipLevel.js';

/**
 * @typedef {{
 *   trackId: string, takeId: string, buffer: AudioBuffer, start: number, from: number,
 *   seconds: number, speed: number, gain: number, fadeIn: number, fadeOut: number,
 *   soundFrom: number
 * }} PlayableClip
 *   Song times at the tempo now (takeTempo.js): start: seconds from bar 1; seconds: how long;
 *   fades; soundFrom: how far into the clip its sound begins (takePickup.js).
 *   from: where in its take's audio it starts (the take's own seconds); speed: how fast the
 *   take plays (1: as recorded, 0.5: at half its tempo); gain: dB
 * @typedef {{ time: number, value: number }} GainPoint seconds from the slice's start
 */

/**
 * @param {typeof import('tone')} Tone
 * @param {PlayableClip[]} clips
 * @param {{ regionStart: number, passLength: number, lead: number }} pass seconds;
 *   lead: how long before bar 1 playback starts (anything earlier is left out:
 *   the scheduler would drop a slice that starts before playback does)
 * @param {(id: string) => Promise<import('tone').ToneAudioNode>} channelInput
 */
export async function createTakePlayback(Tone, clips, pass, channelInput) {
	const slices = [];
	for (const clip of clips) {
		const slice = trimmedToLead(sliceForPass(clip, pass), pass.lead);
		if (!slice) continue;
		const output = await channelInput(clip.trackId);
		slices.push({ ...slice, time: slice.at, clip, envelope: gainEnvelope(clip, slice), output });
	}
	slices.sort((a, b) => a.time - b.time);

	const audio = /** @type {BaseAudioContext} */ (
		/** @type {unknown} */ (Tone.getContext().rawContext)
	);
	// Stretched sources are worklets with imports: they run in the native context underneath
	const native = nativeContextOf(Tone);
	if (slices.some(({ clip }) => isStretched(clip))) await prepareStretchSources(native);
	/** @type {Set<() => void>} how to stop each source playing */
	const sources = new Set();

	return {
		stream: {
			notes: slices,
			period: pass.passLength,
			/** @param {(typeof slices)[number]} slice @param {number} _i @param {number} at */
			play(slice, _i, at) {
				const level = audio.createGain();
				level.gain.setValueAtTime(0, at);
				for (const point of slice.envelope) {
					level.gain.linearRampToValueAtTime(point.value, at + point.time);
				}
				Tone.connect(level, slice.output);
				const stop = startSource(slice, at, level);
				sources.add(stop);
				setTimeout(
					() => {
						sources.delete(stop);
						level.disconnect();
					},
					(at - audio.currentTime + slice.duration + LET_GO_AFTER) * 1000
				);
			}
		},

		stop() {
			for (const stop of sources) stop();
			sources.clear();
		}
	};

	/**
	 * Start a slice's sound into `level`.
	 * @param {(typeof slices)[number]} slice
	 * @param {number} at audio-clock time
	 * @param {GainNode} level
	 * @returns {() => void} stops it
	 */
	function startSource({ clip, offset, duration }, at, level) {
		const from = clip.from + offset * clip.speed; // offset is song time; the take's own is scaled
		if (isStretched(clip)) {
			const source = startStretchSource(native, {
				key: clip.takeId,
				buffer: clip.buffer,
				from,
				speed: clip.speed,
				at,
				duration
			});
			source.node.connect(nativeNodeOf(level));
			return source.stop;
		}
		const source = audio.createBufferSource();
		source.buffer = clip.buffer;
		source.connect(level);
		source.start(at, from, duration);
		return () => {
			try {
				source.stop();
			} catch {
				// already stopped
			}
		};
	}
}

/** Seconds after a slice ends before its nodes are let go of. */
const LET_GO_AFTER = 0.5;

/** @param {{ speed: number }} clip a take at another tempo than it was recorded at */
function isStretched(clip) {
	return Math.abs(clip.speed - 1) > 1e-6;
}

/**
 * How loud a slice of a clip is over time: up from silence and down again,
 * by the clip's fades where the slice holds the clip's own ends, and by a
 * short edge fade where the pass cuts it, at the clip's level between.
 * @param {{ seconds: number, gain: number, fadeIn: number, fadeOut: number }} clip
 * @param {import('./takeTiming.js').Slice} slice
 * @returns {GainPoint[]}
 */
export function gainEnvelope(clip, { offset, duration }) {
	const level = dbToGain(clip.gain);
	const holdsStart = offset <= 0;
	const holdsEnd = offset + duration >= clip.seconds - 1e-6;
	const fadeIn = Math.max(EDGE_FADE, holdsStart ? clip.fadeIn : 0);
	const fadeOut = Math.max(EDGE_FADE, holdsEnd ? clip.fadeOut : 0);
	const upBy = Math.min(fadeIn, duration);
	const downFrom = Math.max(upBy, duration - fadeOut);
	return [
		{ time: upBy, value: level },
		{ time: downFrom, value: level },
		{ time: duration, value: 0 }
	];
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
