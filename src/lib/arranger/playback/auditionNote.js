/**
 * Play one written note now, the way its part sounds (partVoice.js), so a
 * note drawn on the piano roll is heard straight away.
 */
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { getChannel } from '../mixer/mixerGraph.svelte.js';
import { BASS_VOICE } from '../bass/readBass.js';
import { createPartVoice } from './partVoice.js';

/** Seconds a drawn note rings when heard on its own. */
const AUDITION_SECONDS = 0.7;
/** Seconds after it ends before the voice is let go (its release). */
const LET_GO_AFTER = 1;

/**
 * @param {number} midi written (concert) pitch
 * @param {number} shift semitones (the Key setting), as the band plays it
 * @param {string} [channelId] the tune channel to play it on (its instrument and strip)
 * @param {number} [at] when, on the audio clock (Tone time); now if left out or already past
 */
export async function auditionNote(midi, shift, channelId = MELODY_CHANNEL, at = 0) {
	// iPhone: play through the silent switch, as playArrangement does (set before any await)
	const audioSession = /** @type {any} */ (globalThis.navigator)?.audioSession;
	if (audioSession) audioSession.type = 'playback';

	const Tone = await import('tone');
	await Tone.start();
	const voice = createPartVoice(Tone, channelId, await getChannel(channelId), shift);
	await voice.prepare([midi]);
	const start = Math.max(at, Tone.now());
	voice.play(midi, start, AUDITION_SECONDS);
	setTimeout(() => voice.stop(), (start - Tone.now() + AUDITION_SECONDS + LET_GO_AFTER) * 1000);
}

/**
 * Play one bass note now, on the upright through the Bass channel.
 * @param {number} midi written (concert) pitch, as the bass line's ABC writes it
 * @param {number} shift semitones (the Key setting)
 */
export function auditionBassNote(midi, shift) {
	return auditionNote(midi, shift, BASS_VOICE);
}
