/**
 * Upright bass for browser playback: the bassline.js part played on a
 * Tone.js synth shaped like a plucked upright. A stand-in until there are
 * bass samples; only this file should need to change when they arrive.
 */
import { bassLine } from './bassline.js';

/*
 * bassline.js pitches use the MIDI export's numbering, where 40 is the bass's
 * open E. Sounding pitch is an octave lower: the upright's low E (E1, ~41 Hz)
 * sits an octave under the guitar's.
 */
const SOUNDING_OFFSET = -12;

/* Synth voice: warm, woody partials with no buzz */
const PARTIALS = [1, 0.5, 0.33, 0.18, 0.1, 0.05];
/* Plucked: the note dies away even while held; the gate decides when it's muted */
const AMP_ENVELOPE = { attack: 0.005, decay: 0.6, sustain: 0.2, release: 0.08 };
/* Finger "thump": a bright attack that quickly darkens */
const FILTER = {
	type: /** @type {const} */ ('lowpass'),
	Q: 1,
	rolloff: /** @type {const} */ (-24)
};
const FILTER_ENVELOPE = {
	attack: 0.002,
	decay: 0.15,
	sustain: 0.2,
	release: 0.1,
	baseFrequency: 150,
	octaves: 3.5
};
const VOLUME_DB = -4;

/**
 * @typedef {{ time: number, duration: number, pitch: number, velocity: number }} UprightNote
 */

/**
 * Two passes of the bass line in seconds. Two passes so the second time
 * through varies and the end of the first leads back into the top.
 * @param {{ name?: string, measures: string[][] }[]} sections
 * @param {{ capo?: number, bpm?: number }} options
 * @returns {{ notes: UprightNote[], passes: number }}
 */
export function bassEvents(sections, { capo = 0, bpm = 120 } = {}) {
	const quarter = 60 / bpm;
	const notes = bassLine([...sections, ...sections], { capo }).map((note) => ({
		time: note.beat * quarter,
		duration: note.length * note.gate * quarter,
		pitch: note.pitch + SOUNDING_OFFSET,
		velocity: note.velocity / 127
	}));
	notes.sort((a, b) => a.time - b.time);
	return { notes, passes: 2 };
}

/**
 * @param {typeof import('tone')} Tone
 * @param {import('tone').InputNode} destination
 */
export function createUpright(Tone, destination) {
	const synth = new Tone.MonoSynth({
		oscillator: { type: 'custom', partials: PARTIALS },
		envelope: AMP_ENVELOPE,
		filter: FILTER,
		filterEnvelope: FILTER_ENVELOPE,
		volume: VOLUME_DB
	}).connect(destination);

	return {
		/**
		 * Play one note at an audio-clock time. Call in time order (it's a mono synth).
		 * @param {UprightNote} note
		 * @param {number} time
		 */
		play(note, time) {
			synth.triggerAttackRelease(
				Tone.Frequency(note.pitch, 'midi').toFrequency(),
				note.duration,
				time,
				note.velocity
			);
		},
		/** Fade out quickly and release the synth (cancels anything scheduled). */
		stop() {
			synth.volume.rampTo(-Infinity, 0.03);
			setTimeout(() => synth.dispose(), 200);
		}
	};
}
