/**
 * Upright bass for browser playback: the bass part (bass/songBass.js) played on a
 * Tone.js synth shaped like a plucked upright. A stand-in until there are
 * bass samples; only this file should need to change when they arrive.
 */

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
 * The bass part in seconds, at the upright's sounding pitch.
 * @param {{ notes: import('./bassline.js').BassNote[], passes: number }} part from bassPart()
 * @param {{ bpm?: number }} options
 * @returns {{ notes: UprightNote[], passes: number }} passes: how many passes the notes span
 */
export function bassEvents({ notes, passes }, { bpm = 120 } = {}) {
	const quarter = 60 / bpm;
	const timed = notes.map((note) => ({
		time: note.beat * quarter,
		duration: note.length * note.gate * quarter,
		pitch: uprightPitch(note.pitch),
		velocity: note.velocity / 127
	}));
	timed.sort((a, b) => a.time - b.time);
	return { notes: timed, passes };
}

/**
 * Where a bass note sounds on the upright, from its written (file) number.
 * @param {number} pitch
 */
export function uprightPitch(pitch) {
	return pitch + SOUNDING_OFFSET;
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
