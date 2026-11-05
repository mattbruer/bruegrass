/**
 * The "Download .mid" button's job: build the MIDI file and save it.
 */
import { arrangementToMidi } from './midi.js';
import { mixer, faderGain } from '../playback/mixer.svelte.js';
import { downloadFile } from '$lib/utils/downloadFile.js';
import { slugify } from '$lib/utils/slugify.js';

/**
 * @param {{
 *   sections: import('../chart/timeline.js').Section[],
 *   capo: number,
 *   transpose: number,
 *   bpm: number,
 *   melody: import('../melody/melody.js').Melody | null
 * }} arrangement
 */
export function downloadArrangementMidi({ sections, capo, transpose, bpm, melody }) {
	const bytes = arrangementToMidi(sections, {
		capo,
		transpose,
		bpm,
		// The file's velocities follow the mixer, so it sounds like what you hear
		bassDb: guitarPartLevel('bass'),
		strumDb: guitarPartLevel('strum'),
		melody,
		melodyDb: channelLevel('melody')
	});

	const name = slugify(sections[0]?.name ?? '') || 'arrangement';
	downloadFile(bytes, `${name}-${bpm}bpm.mid`, 'audio/midi');
}

/**
 * A channel's fader level in dB (-Infinity when pulled all the way down).
 * @param {string} channelId
 */
function channelLevel(channelId) {
	const channel = mixer.channels.find((each) => each.id === channelId);
	return faderGain(channel?.volume ?? 0);
}

/**
 * One of the guitar's two parts (bass notes or strums), in dB.
 * @param {'bass' | 'strum'} partId
 */
function guitarPartLevel(partId) {
	const guitar = mixer.channels.find((each) => each.id === 'guitar');
	const part = guitar?.parts.find((each) => each.id === partId);
	return faderGain(part?.volume ?? 0);
}
