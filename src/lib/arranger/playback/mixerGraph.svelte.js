/**
 * The live mixer: the audio graph (graph/buildMixerGraph.js) in the page's
 * audio context, wired to the speakers, kept in step with the `mixer`
 * settings, with taps for the meters. Built the first time an instrument
 * asks for its channel (audio needs the browser and a tap).
 *
 * The graph itself is built the same way for an offline render
 * (export/renderSong.js), so an exported file sounds like playback.
 */
import { mixer, anyChannelSoloed, mixSnapshot } from './mixer.svelte.js';
import { buildMixerGraph } from './graph/buildMixerGraph.js';
import { createSpectrumTap, createStereoTap } from './analysis/taps.js';
import { outputComparison } from './output/outputStage.svelte.js';

/** @type {Promise<import('./graph/buildMixerGraph.js').MixerGraph> | null} */
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
	graph ??= buildLiveGraph();
	return (await graph).channelInput(id, part);
}

/**
 * The node the metronome's clicks play into (see graph.metronome).
 * @returns {Promise<import('tone').ToneAudioNode>}
 */
export async function getMetronomeInput() {
	graph ??= buildLiveGraph();
	return (await graph).metronome;
}

async function buildLiveGraph() {
	const Tone = await import('tone');
	const built = await buildMixerGraph(Tone, mixSnapshot());
	Tone.connect(built.output.output, Tone.getDestination());
	followMixerSettings(built);
	audioTaps.current = createTaps(Tone, built);
	return built;
}

/**
 * Hang taps: levels after each strip's fader and pan, each strip's sound
 * just after its EQ, and what reaches the speakers (where the visualiser listens).
 * @param {typeof import('tone')} Tone
 * @param {import('./graph/buildMixerGraph.js').MixerGraph} graph
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
 * Push mixer settings onto the audio nodes whenever they change. Each part
 * follows only its own settings, so moving one EQ band only touches that strip.
 * @param {import('./graph/buildMixerGraph.js').MixerGraph} graph
 */
function followMixerSettings(graph) {
	const { strips, reverbEq, masterEq, reverb, output } = graph;
	// Never torn down, on purpose: the live graph is built once and lasts as
	// long as the page, so its settings watchers do too (they're made once)
	$effect.root(() => {
		$effect(() => graph.applyChannels($state.snapshot(mixer.channels), anyChannelSoloed()));

		for (const settings of mixer.channels) {
			$effect(() => {
				strips.get(settings.id)?.eq.update($state.snapshot(settings.eq));
			});
		}
		$effect(() => reverbEq.update($state.snapshot(mixer.reverb.eq)));
		$effect(() => masterEq.update($state.snapshot(mixer.master.eq)));
		$effect(() => reverb.update($state.snapshot(mixer.reverb.plugin)));
		$effect(() => graph.applyReverbAndMaster($state.snapshot(mixer.reverb), mixer.master.volume));

		$effect(() => output.setGain(mixer.output.gain));
		$effect(() => output.setComparison({ ...outputComparison }));
	});
}
