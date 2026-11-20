/**
 * How a written part sounds when it's played on its own: a note tapped on
 * the piano roll, and the parts heard with a recording in Transcribe. The
 * bass is the upright; the tune's channels play their mixer instrument
 * (instruments/tuneVoice.js).
 * Both uses go through here, so a tapped note and the part playing are one sound.
 */
import { createUpright, uprightPitch } from '../instruments/upright.js';
import { BASS_VOICE } from '../bass/readBass.js';
import { channelInstrument } from '../instruments/tuneInstruments.js';
import { createTuneVoice } from '../instruments/tuneVoice.js';
import { mixer } from '../mixer/mixer.svelte.js';

const LEVEL_DB = -2;
const BASS_VELOCITY = 0.9;

/**
 * @typedef {{
 *   prepare: (pitches: number[]) => Promise<void>,
 *   play: (midi: number, at: number, seconds: number) => void,
 *   stop: () => void
 * }} PartVoice
 *   prepare: load what it needs before it's played (the instrument's samples);
 *   play: a written (concert) pitch at an audio-clock time, for this long
 */

/**
 * @param {typeof import('tone')} Tone
 * @param {string} channelId the mixer channel whose instrument it is (Bass: the upright)
 * @param {import('tone').InputNode} output
 * @param {number} shift semitones (the Key setting), as the band plays it
 * @returns {PartVoice}
 */
export function createPartVoice(Tone, channelId, output, shift) {
	if (channelId === BASS_VOICE) return uprightVoice(Tone, output, shift);
	const voice = createTuneVoice(Tone, channelInstrument(mixer.channels, channelId), output);
	return {
		prepare: async () => {
			await voice.ready;
		},
		play: (midi, at, seconds) => voice.play(midi - 12 + shift, seconds, at, LEVEL_DB),
		stop: () => voice.stop()
	};
}

/**
 * @param {typeof import('tone')} Tone
 * @param {import('tone').InputNode} output
 * @param {number} shift
 * @returns {PartVoice}
 */
function uprightVoice(Tone, output, shift) {
	const upright = createUpright(Tone, output);
	return {
		prepare: async () => {},
		play(midi, at, seconds) {
			const note = {
				time: 0,
				duration: seconds,
				pitch: uprightPitch(midi + shift),
				velocity: BASS_VELOCITY
			};
			upright.play(note, at);
		},
		stop: () => upright.stop()
	};
}
