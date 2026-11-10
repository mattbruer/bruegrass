/**
 * Play one melody note now, the way the band would play it (on the Melody
 * channel's instrument: the guitar samples fingered as melody.js fingers
 * the tune, or its synth), so a note drawn on the piano roll is heard straight away.
 */
import { finger } from '../melody/melody.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { sampleUrl } from '../instruments/guitar.js';
import { loadBuffer } from '../instruments/band.js';
import { getChannel } from './mixerGraph.svelte.js';
import { createUpright, uprightPitch } from '../instruments/upright.js';
import { BASS_VOICE } from '../bass/readBass.js';
import { channelInstrument, createTuneSynth } from '../instruments/tuneInstruments.js';
import { mixer } from './mixer.svelte.js';

/** Seconds a drawn note rings when heard on its own. */
const AUDITION_SECONDS = 0.7;
const FADE_OUT = 0.05;
const LEVEL_DB = -2;

/**
 * @param {number} midi written (concert) pitch
 * @param {number} shift semitones (the Key setting), as the band plays it
 * @param {string} [channelId] the tune channel to play it on (its instrument and strip)
 */
export async function auditionNote(midi, shift, channelId = MELODY_CHANNEL) {
	// iPhone: play through the silent switch, as playArrangement does (set before any await)
	const audioSession = /** @type {any} */ (globalThis.navigator)?.audioSession;
	if (audioSession) audioSession.type = 'playback';

	const Tone = await import('tone');
	await Tone.start();
	const note = { time: 0, length: 1, pitch: midi, volume: 0, channel: channelId };
	const [{ string, fret, rate }] = finger([note], shift);
	const { synth } = channelInstrument(mixer.channels, channelId);
	if (synth) {
		const voice = createTuneSynth(Tone, synth, await getChannel(channelId));
		voice.play(midi - 12 + shift, AUDITION_SECONDS, Tone.now(), LEVEL_DB);
		setTimeout(() => voice.stop(), (AUDITION_SECONDS + 1) * 1000);
		return;
	}
	const [buffer, output] = await Promise.all([
		loadBuffer(Tone, sampleUrl(string, fret)),
		getChannel(channelId)
	]);
	const player = new Tone.Player({
		url: buffer,
		volume: LEVEL_DB,
		fadeOut: FADE_OUT,
		playbackRate: rate
	});
	player.connect(output);
	player.onstop = () => player.dispose();
	const now = Tone.now();
	player.start(now).stop(now + AUDITION_SECONDS);
}

/**
 * Play one bass note now, on the upright through the Bass channel.
 * @param {number} midi written (concert) pitch, as the bass line's ABC writes it
 * @param {number} shift semitones (the Key setting)
 */
export async function auditionBassNote(midi, shift) {
	const audioSession = /** @type {any} */ (globalThis.navigator)?.audioSession;
	if (audioSession) audioSession.type = 'playback';

	const Tone = await import('tone');
	await Tone.start();
	const upright = createUpright(Tone, await getChannel(BASS_VOICE));
	const note = {
		time: 0,
		duration: AUDITION_SECONDS,
		pitch: uprightPitch(midi + shift),
		velocity: 0.9
	};
	upright.play(note, Tone.now());
	setTimeout(() => upright.stop(), (AUDITION_SECONDS + FADE_OUT) * 1000);
}
