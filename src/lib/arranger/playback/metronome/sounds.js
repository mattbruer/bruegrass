/**
 * The metronome's sounds, made in code (no samples). Each is a few sine
 * partials and a short noise tick, dying away. A new sound is one entry.
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   hz: number,
 *   accentRatio: number,
 *   partials: [number, number][],
 *   decay: number,
 *   seconds: number,
 *   tick: number
 * }} ClickSound
 *   hz: the beat's pitch; accentRatio: the bar's first beat, pitched by this;
 *   partials: [frequency ratio to hz, level] pairs; decay: seconds for the
 *   tone to fall to 1/e; seconds: the length; tick: level of a noise burst at the start
 */

export const CLICK_SOUNDS = Object.freeze([
	{
		id: 'woodblock',
		name: 'Woodblock',
		hz: 900,
		accentRatio: 1.5,
		partials: [
			[1, 0.6],
			[2.7, 0.3]
		],
		decay: 0.012,
		seconds: 0.1,
		tick: 0.4
	},
	{
		id: 'cowbell',
		name: 'Cowbell',
		hz: 560,
		accentRatio: 1.25,
		partials: [
			[1, 0.5],
			[1.5, 0.5]
		],
		decay: 0.07,
		seconds: 0.35,
		tick: 0
	},
	{
		id: 'beep',
		name: 'Beep',
		hz: 1000,
		accentRatio: 1.6,
		partials: [[1, 0.6]],
		decay: 0.025,
		seconds: 0.12,
		tick: 0
	},
	{
		id: 'tick',
		name: 'Tick',
		hz: 3000,
		accentRatio: 1.3,
		partials: [[1, 0.1]],
		decay: 0.004,
		seconds: 0.03,
		tick: 0.8
	}
]);

export const DEFAULT_CLICK_SOUND = 'woodblock';

/** @param {string} id @returns {ClickSound} */
export function clickSoundById(id) {
	return CLICK_SOUNDS.find((sound) => sound.id === id) ?? CLICK_SOUNDS[0];
}

/** Peak level of every click, before the metronome's level. */
const CLICK_LEVEL = 0.5;
/** A short fade at the end so a cut-off tail never clicks. */
const END_FADE_SECONDS = 0.002;

/**
 * The accent and the beat, as audio buffers in this context.
 * @param {BaseAudioContext} context
 * @param {ClickSound} sound
 * @returns {{ accent: AudioBuffer, beat: AudioBuffer }}
 */
export function clickBuffers(context, sound) {
	return {
		accent: renderClick(context, sound, sound.accentRatio),
		beat: renderClick(context, sound, 1)
	};
}

/**
 * @param {BaseAudioContext} context
 * @param {ClickSound} sound
 * @param {number} pitch multiplies the sound's pitch
 */
function renderClick(context, sound, pitch) {
	const { sampleRate } = context;
	const frames = Math.round(sound.seconds * sampleRate);
	const buffer = context.createBuffer(1, frames, sampleRate);
	const samples = buffer.getChannelData(0);
	const fadeFrames = END_FADE_SECONDS * sampleRate;

	for (let i = 0; i < frames; i++) {
		const t = i / sampleRate;
		let tone = 0;
		for (const [ratio, level] of sound.partials) {
			tone += level * Math.sin(2 * Math.PI * sound.hz * pitch * ratio * t);
		}
		const body = tone * Math.exp(-t / sound.decay);
		const tick = sound.tick * (Math.random() * 2 - 1) * Math.exp(-t / 0.002);
		const endFade = Math.min(1, (frames - i) / fadeFrames);
		samples[i] = CLICK_LEVEL * endFade * (body + tick);
	}
	return buffer;
}
