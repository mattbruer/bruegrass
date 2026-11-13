/**
 * The reverb plugin, as audio nodes:
 *
 *   input ─┬─▶ dry ───────────────────────────────────────────────────┬─▶ output
 *          └─▶ pre-delay ─▶ convolver ─▶ low cut ─▶ high cut ─▶ wet ──┘
 *
 * The convolver plays the impulse response (impulseResponse.js); changing
 * decay, damping or width builds a new one. Everything else changes at once.
 * Bypassed, the input goes straight to the output.
 */
import { impulseResponse } from './impulseResponse.js';

/** Longest pre-delay the delay line is built for, in seconds. */
const MAX_PRE_DELAY_SECONDS = 0.5;
/** Rebuild the room this long after the last decay/damping/width change (it's the slow part). */
const REBUILD_DELAY_MS = 150;
/** Level changes glide over this long, so they don't click. */
const GLIDE_SECONDS = 0.05;

/**
 * @param {typeof import('tone')} Tone
 * @param {import('./reverbSettings.js').ReverbSettings} settings
 */
export function createReverb(Tone, settings) {
	const input = new Tone.Gain({ channelCount: 2 });
	const output = new Tone.Gain({ channelCount: 2 });

	const dry = new Tone.Gain(0);
	const preDelay = new Tone.Delay({ delayTime: 0, maxDelay: MAX_PRE_DELAY_SECONDS });
	const convolver = new Tone.Convolver();
	const lowCut = new Tone.Filter({ type: 'highpass', frequency: settings.lowCut, rolloff: -12 });
	const highCut = new Tone.Filter({ type: 'lowpass', frequency: settings.highCut, rolloff: -12 });
	const wet = new Tone.Gain(0);

	input.connect(dry);
	dry.connect(output);
	input.chain(preDelay, convolver, lowCut, highCut, wet, output);

	/** What the current room was built from, to know when to rebuild it. */
	let builtRoom = '';
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let rebuildTimer;

	/** @param {import('./reverbSettings.js').ReverbSettings} next */
	function rebuildRoom(next) {
		const { left, right } = impulseResponse({
			sampleRate: Tone.getContext().sampleRate,
			decay: next.decay,
			damping: next.damping,
			width: next.width
		});
		convolver.buffer = Tone.ToneAudioBuffer.fromArray([left, right]);
	}

	/**
	 * Follow new settings.
	 * @param {import('./reverbSettings.js').ReverbSettings} next
	 */
	function update(next) {
		const wetLevel = next.enabled ? next.wet / 100 : 0;
		const dryLevel = next.enabled ? next.dry / 100 : 1; // bypassed: straight through
		// The first settings are set outright (gliding in from the defaults
		// would colour the first moments of sound); later changes glide
		const firstBuild = builtRoom === '';
		/** @param {{ value: number, rampTo: (value: number, time: number) => unknown }} param @param {number} value */
		const set = (param, value) => {
			if (firstBuild) param.value = value;
			else param.rampTo(value, GLIDE_SECONDS);
		};
		set(wet.gain, wetLevel);
		set(dry.gain, dryLevel);
		set(preDelay.delayTime, next.preDelay / 1000);
		set(lowCut.frequency, next.lowCut);
		set(highCut.frequency, next.highCut);

		const room = `${next.decay}|${next.damping}|${next.width}`;
		if (room === builtRoom) return;
		builtRoom = room;
		clearTimeout(rebuildTimer);
		if (firstBuild) rebuildRoom(next);
		else rebuildTimer = setTimeout(() => rebuildRoom(next), REBUILD_DELAY_MS);
	}

	update(settings);

	return { input, output, update };
}
