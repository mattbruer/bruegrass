/**
 * Plays a count-in (countIn.js says how many clicks) on the metronome's
 * channel, in its own sound, every click placed on the audio clock up front.
 */
import { clickBuffers } from './sounds.js';

/**
 * @param {typeof import('tone')} Tone
 * @param {{
 *   beats: number, beatsPerBar: number, beatSeconds: number,
 *   sound: import('./sounds.js').ClickSound,
 *   destination: import('tone').ToneAudioNode
 * }} run
 * @param {number} at the audio-clock time of the first click
 * @returns {() => void} stop (also safe once it has finished)
 */
export function playCountIn(Tone, { beats, beatsPerBar, beatSeconds, sound, destination }, at) {
	const context = Tone.getContext();
	const buffers = clickBuffers(context, sound);
	const sources = Array.from({ length: beats }, (_, beat) => {
		const source = context.createBufferSource();
		source.buffer = beat % beatsPerBar === 0 ? buffers.accent : buffers.beat;
		Tone.connect(source, destination);
		source.start(at + beat * beatSeconds);
		return source;
	});
	return () => {
		for (const source of sources) {
			source.stop();
			source.disconnect();
		}
	};
}
