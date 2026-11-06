/**
 * The mixer as audio nodes, built in whatever audio context Tone is using
 * right now: the live one (mixerGraph.svelte.js) or an offline one that
 * renders a song to a file (export/renderSong.js). Both build it here, so an
 * export sounds exactly like playback.
 *
 *   instrument parts ─▶ input trim ─▶ EQ ─▶ fader/pan/mute ─┬──────────────────────────────▶ mix bus
 *                                                           └─ send ─▶ reverb ─▶ EQ ─▶ aux fader ─▶ mix bus
 *   mix bus ─▶ master EQ ─▶ master fader ─▶ output stage (gain, true-peak limiter) ─▶ `output`
 *
 * Nothing here knows about Svelte or the page: it takes plain settings (a
 * snapshot of `mixer`) and applies new ones when asked. The caller connects
 * `output` to the speakers (or to a file).
 *
 * Every bus after the channels is stereo: a Tone Channel is mono unless told
 * otherwise, and a mono master would fold every pan back to the centre.
 */
import { faderGain } from '../faderTaper.js';
import { createReverb } from '../reverb/createReverb.js';
import { createEq } from '../eq/createEq.js';
import { createOutputStage } from '../output/createOutputStage.js';

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
 *   input: after the parts and the trim, before the EQ (a dry stem taps here)
 * @typedef {Awaited<ReturnType<typeof buildMixerGraph>>} MixerGraph
 */

/**
 * @param {typeof import('tone')} Tone
 * @param {ReturnType<typeof import('../mixer.svelte.js').mixSnapshot>} settings a plain copy of the mixer
 */
export async function buildMixerGraph(Tone, settings) {
	// Output stage first: everything else flows into it
	const output = await createOutputStage(Tone, { gainDb: settings.output.gain });

	// Master: the mix bus → master EQ → master fader → output stage
	const master = new Tone.Channel(STEREO);
	Tone.connect(master, output.input);
	const masterEq = createEq(Tone, settings.master.eq);
	masterEq.output.connect(master);
	const mixBus = masterEq.input;

	// Reverb aux: every channel's send → the plugin → its EQ → the aux fader → mix bus
	const reverbAux = new Tone.Channel(STEREO).connect(mixBus);
	const reverbEq = createEq(Tone, settings.reverb.eq);
	reverbEq.output.connect(reverbAux);
	const reverb = createReverb(Tone, settings.reverb.plugin);
	reverb.output.connect(reverbEq.input);
	const reverbInput = new Tone.Gain({ channelCount: 2 }).connect(reverb.input);

	/** @type {Map<string, Strip>} */
	// Audio nodes, not UI state (a plain .js file, so Svelte's reactive Map doesn't apply)
	const strips = new Map();
	for (const channel of settings.channels) {
		strips.set(channel.id, buildStrip(Tone, channel, mixBus, reverbInput));
	}

	const graph = {
		strips,
		master,
		masterEq,
		reverbAux,
		reverbEq,
		reverb,
		/** The output stage (gain and limiter); `output.output` is what goes to the speakers. */
		output,

		/**
		 * The node an instrument plays into: its channel's input, or one of the
		 * channel's parts when `part` is given.
		 * @param {string} id channel id, e.g. 'guitar'
		 * @param {string} [part] e.g. 'strum'
		 * @returns {import('tone').ToneAudioNode}
		 */
		channelInput(id, part) {
			const strip = strips.get(id);
			if (!strip) throw new Error(`No mixer channel: ${id}`);
			if (part === undefined) return strip.input;
			const partNode = strip.parts.get(part);
			if (!partNode) throw new Error(`No ${part} part on mixer channel: ${id}`);
			return partNode;
		},

		/**
		 * Levels, pans, mutes and sends on every channel. Soloing a channel mutes
		 * the others (and their sends); the reverb aux is solo-safe.
		 * @param {typeof settings['channels']} channels
		 * @param {boolean} soloing is any channel soloed?
		 */
		applyChannels(channels, soloing) {
			for (const channel of channels) {
				const strip = strips.get(channel.id);
				if (!strip) continue;
				strip.channel.volume.value = faderGain(channel.volume);
				strip.channel.pan.value = channel.pan;
				strip.channel.mute = channel.mute || (soloing && !(/** @type {any} */ (channel).solo));
				strip.send.gain.value = faderGain(channel.send);
				for (const part of channel.parts) {
					const partNode = strip.parts.get(part.id);
					if (partNode) partNode.volume.value = faderGain(part.volume);
				}
			}
		},

		/**
		 * The reverb aux's fader and mute, and the master fader.
		 * @param {{ volume: number, mute: boolean }} reverbSettings
		 * @param {number} masterVolume dB
		 */
		applyReverbAndMaster(reverbSettings, masterVolume) {
			reverbAux.volume.value = faderGain(reverbSettings.volume);
			reverbAux.mute = reverbSettings.mute;
			master.volume.value = faderGain(masterVolume);
		},

		/**
		 * Everything at once (an offline render applies the whole mix in one go;
		 * live playback applies each part as it changes).
		 * @param {typeof settings} mix
		 */
		applyAll(mix) {
			const soloing = mix.channels.some((channel) => /** @type {any} */ (channel).solo);
			graph.applyChannels(mix.channels, soloing);
			for (const channel of mix.channels) strips.get(channel.id)?.eq.update(channel.eq);
			reverbEq.update(mix.reverb.eq);
			masterEq.update(mix.master.eq);
			reverb.update(mix.reverb.plugin);
			graph.applyReverbAndMaster(mix.reverb, mix.master.volume);
			output.setGain(mix.output.gain);
		}
	};

	graph.applyAll(settings);
	return graph;
}

/**
 * One instrument's channel strip: parts → input trim → EQ → fader/pan → mix bus,
 * with a send to the reverb after the fader.
 * @param {typeof import('tone')} Tone
 * @param {import('../mixer.svelte.js').ChannelSettings} settings
 * @param {import('tone').InputNode} mixBus
 * @param {import('tone').InputNode} reverbInput
 * @returns {Strip}
 */
function buildStrip(Tone, settings, mixBus, reverbInput) {
	const input = new Tone.Volume(INPUT_TRIM_DB);
	const eq = createEq(Tone, settings.eq);
	const channel = new Tone.Channel().connect(mixBus); // mono in, panned out to stereo
	input.connect(eq.input);
	eq.output.connect(channel);

	/*
	 * The post-fader send, wired by hand rather than with Tone's send/receive:
	 * Tone keeps its named buses in one registry shared by every audio
	 * context, so an offline render would reach into the live mixer's bus.
	 */
	const send = new Tone.Gain({ gain: faderGain(settings.send), units: 'decibels' });
	channel.connect(send);
	send.connect(reverbInput);

	const parts = new Map(
		settings.parts.map((part) => [part.id, new Tone.Volume(faderGain(part.volume)).connect(input)])
	);
	return { input, eq, channel, send, parts };
}
