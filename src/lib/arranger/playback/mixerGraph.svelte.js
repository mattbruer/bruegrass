/**
 * The mixer's audio: Tone.js nodes for every strip, kept in step with the
 * `mixer` settings. Built the first time an instrument asks for its channel
 * (audio needs the browser and a tap).
 *
 *   instrument parts ─▶ input trim ─▶ EQ ─▶ fader/pan/mute ─┬──────────────────────────────▶ mix bus
 *                                                           └─ send ─▶ reverb ─▶ EQ ─▶ aux fader ─▶ mix bus
 *   mix bus ─▶ master EQ ─▶ master fader ─▶ output stage (gain, true-peak limiter) ─▶ speakers
 *
 * Every bus after the channels (reverb aux, mix bus, master) is stereo: a
 * Tone Channel is mono unless told otherwise, and a mono master would fold
 * every pan back to the centre.
 */
import { mixer, anyChannelSoloed } from './mixer.svelte.js';
import { faderGain } from './faderTaper.js';
import { createReverb } from './reverb/createReverb.js';
import { createEq } from './eq/createEq.js';
import { createSpectrumTap, createStereoTap } from './analysis/taps.js';
import { createOutputStage } from './output/createOutputStage.js';
import { outputComparison } from './output/outputStage.svelte.js';

/** The name Tone uses to route channel sends to the reverb aux. */
const REVERB_SEND = 'reverb';
const STEREO = { channelCount: 2 };

/**
 * Gain staging: every channel's input is trimmed by this much before its
 * EQ and fader, like the input trim on a console. The instruments' samples
 * are recorded hot; without it, the mix clipped with every fader at unity.
 * With it, the loudest channel peaks around -8 dBFS at unity, so there's
 * room to push a fader well up before anything clips. One trim for all
 * keeps the instruments' balance as it is.
 */
const INPUT_TRIM_DB = -14;

/**
 * @typedef {ReturnType<typeof createEq>} Eq
 * @typedef {{
 *   input: import('tone').Volume,
 *   eq: Eq,
 *   channel: import('tone').Channel,
 *   send: import('tone').Gain<'decibels'>,
 *   parts: Map<string, import('tone').Volume>
 * }} Strip
 * @typedef {{
 *   master: import('tone').Channel,
 *   masterEq: Eq,
 *   reverbAux: import('tone').Channel,
 *   reverbEq: Eq,
 *   reverb: ReturnType<typeof createReverb>,
 *   output: Awaited<ReturnType<typeof createOutputStage>>,
 *   strips: Map<string, Strip>
 * }} Graph
 */

/** @type {Promise<Graph> | null} */
let graph = null;

/**
 * Listening points for the meters, the visualiser and the EQ analyser (see
 * analysis/taps.js). `current` is null until the audio is built (on the
 * first Play).
 * @typedef {{
 *   channels: Map<string, import('./analysis/taps.js').StereoTap>,
 *   reverb: import('./analysis/taps.js').StereoTap,
 *   master: import('./analysis/taps.js').StereoTap,
 *   spectrum: import('./analysis/taps.js').SpectrumTap,
 *   afterEq: Map<string, import('./analysis/taps.js').SpectrumTap>,
 *   output: { read: () => import('./output/createOutputStage.js').OutputReadings, resetLoudness: () => void }
 * }} AudioTaps
 *   master, spectrum: what reaches the speakers (after the output stage);
 *   afterEq: each strip's sound just after its EQ, by strip id ('reverb' and 'master' too);
 *   output: the output stage's loudness and limiter readings (read through a
 *     function, like every tap: this object is reactive state, and Svelte would
 *     otherwise keep a copy of the readings that the worklets never update)
 */
export const audioTaps = $state({ current: /** @type {AudioTaps | null} */ (null) });

/**
 * The node an instrument should connect its output to: its channel's input,
 * or one of the channel's parts when `part` is given.
 * @param {string} id channel id, e.g. 'guitar'
 * @param {string} [part] e.g. 'strum'
 * @returns {Promise<import('tone').ToneAudioNode>}
 */
export async function getChannel(id, part) {
	graph ??= buildGraph();
	const strip = (await graph).strips.get(id);
	if (!strip) throw new Error(`No mixer channel: ${id}`);
	if (part === undefined) return strip.input;

	const partNode = strip.parts.get(part);
	if (!partNode) throw new Error(`No ${part} part on mixer channel: ${id}`);
	return partNode;
}

async function buildGraph() {
	const Tone = await import('tone');

	// Master: the mix bus → master EQ → master fader → output stage → speakers
	const output = await createOutputStage(Tone, { gainDb: mixer.output.gain });
	Tone.connect(output.output, Tone.getDestination());
	const master = new Tone.Channel(STEREO);
	Tone.connect(master, output.input);
	const masterEq = createEq(Tone, $state.snapshot(mixer.master.eq));
	masterEq.output.connect(master);
	const mixBus = masterEq.input;

	// Reverb aux: everything sent to 'reverb' → the plugin → its EQ → the aux fader → mix bus
	const reverbAux = new Tone.Channel(STEREO).connect(mixBus);
	const reverbEq = createEq(Tone, $state.snapshot(mixer.reverb.eq));
	reverbEq.output.connect(reverbAux);
	const reverb = createReverb(Tone, $state.snapshot(mixer.reverb.plugin));
	reverb.output.connect(reverbEq.input);
	const reverbInput = new Tone.Channel(STEREO).connect(reverb.input);
	reverbInput.receive(REVERB_SEND);

	/** @type {Graph['strips']} */
	// Audio nodes, not UI state, so this map doesn't need to be reactive
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const strips = new Map();
	for (const settings of mixer.channels) {
		strips.set(settings.id, buildStrip(Tone, settings, mixBus));
	}

	const built = { master, masterEq, reverbAux, reverbEq, reverb, output, strips };
	followMixerSettings(built);
	audioTaps.current = createTaps(Tone, built);
	return built;
}

/**
 * One instrument's channel strip: parts → input trim → EQ → fader/pan → mix bus,
 * with a send to the reverb after the fader.
 * @param {typeof import('tone')} Tone
 * @param {import('./mixer.svelte.js').ChannelSettings} settings
 * @param {import('tone').ToneAudioNode} mixBus
 * @returns {Strip}
 */
function buildStrip(Tone, settings, mixBus) {
	const input = new Tone.Volume(INPUT_TRIM_DB);
	const eq = createEq(Tone, $state.snapshot(settings.eq));
	const channel = new Tone.Channel().connect(mixBus); // mono in, panned out to stereo
	input.connect(eq.input);
	eq.output.connect(channel);

	const send = channel.send(REVERB_SEND, faderGain(settings.send));
	const parts = new Map(
		settings.parts.map((part) => [part.id, new Tone.Volume(faderGain(part.volume)).connect(input)])
	);
	return { input, eq, channel, send, parts };
}

/**
 * Hang taps: levels after each strip's fader and pan, each strip's sound
 * just after its EQ, and the master's output (where the visualiser listens).
 * @param {typeof import('tone')} Tone
 * @param {Graph} graph
 * @returns {AudioTaps}
 */
function createTaps(Tone, { master, reverbAux, reverbEq, output, strips }) {
	// Audio nodes, not UI state, so these maps don't need to be reactive
	/** @type {AudioTaps['channels']} */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const channels = new Map();
	/** @type {AudioTaps['afterEq']} */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const afterEq = new Map();

	for (const [id, strip] of strips) {
		channels.set(id, createStereoTap(Tone, strip.channel));
		afterEq.set(id, createSpectrumTap(Tone, strip.eq.output));
	}
	afterEq.set('reverb', createSpectrumTap(Tone, reverbEq.output));
	afterEq.set('master', createSpectrumTap(Tone, master));

	// The master meter and the visualiser show what reaches the speakers
	return {
		channels,
		reverb: createStereoTap(Tone, reverbAux),
		master: createStereoTap(Tone, output.output),
		spectrum: createSpectrumTap(Tone, output.output),
		afterEq,
		output: { read: () => output.readings, resetLoudness: output.resetLoudness }
	};
}

/**
 * Push mixer settings onto the audio nodes whenever they change.
 * @param {Graph} graph
 */
function followMixerSettings({ master, masterEq, reverbAux, reverbEq, reverb, output, strips }) {
	$effect.root(() => {
		$effect(() => {
			const soloing = anyChannelSoloed();
			for (const settings of mixer.channels) {
				const strip = strips.get(settings.id);
				if (!strip) continue;
				strip.channel.volume.value = faderGain(settings.volume);
				strip.channel.pan.value = settings.pan;
				// Soloing silences every channel that isn't soloed (and its send)
				strip.channel.mute = settings.mute || (soloing && !settings.solo);
				strip.send.gain.value = faderGain(settings.send);
				for (const part of settings.parts) {
					const partNode = strip.parts.get(part.id);
					if (partNode) partNode.volume.value = faderGain(part.volume);
				}
			}
		});

		// Each EQ follows its own settings, so moving one band only touches that strip
		for (const settings of mixer.channels) {
			$effect(() => {
				strips.get(settings.id)?.eq.update($state.snapshot(settings.eq));
			});
		}
		$effect(() => reverbEq.update($state.snapshot(mixer.reverb.eq)));
		$effect(() => masterEq.update($state.snapshot(mixer.master.eq)));

		// The reverb aux is "solo-safe": soloing a channel keeps its reverb
		$effect(() => {
			reverbAux.volume.value = faderGain(mixer.reverb.volume);
			reverbAux.mute = mixer.reverb.mute;
			master.volume.value = faderGain(mixer.master.volume);
		});

		$effect(() => {
			reverb.update($state.snapshot(mixer.reverb.plugin));
		});

		$effect(() => output.setGain(mixer.output.gain));
		$effect(() => output.setComparison({ ...outputComparison }));
	});
}
