/**
 * The Export dialog's MIDI choice: build the MIDI file and save it.
 */
import { arrangementToMidi } from './midi.js';
import { mixer } from '../mixer/mixer.svelte.js';
import { faderGain } from '../../audio/mixer/faderTaper.js';
import { downloadFile } from '$lib/utils/downloadFile.js';
import { slugify } from '$lib/utils/slugify.js';
import { channelsInUse } from '../melody/harmony/partChannels.js';

/**
 * @param {{
 *   sections: import('../chart/timeline.js').Section[],
 *   capo: number,
 *   transpose: number,
 *   bpm: number,
 *   melody: import('../melody/melody.js').Melody | null,
 *   bass?: import('../instruments/bassline.js').BassNote[] | null
 * }} arrangement bass: the edited bass line, or null for the band's own
 */
export function downloadArrangementMidi({ sections, capo, transpose, bpm, melody, bass = null }) {
	const bytes = arrangementToMidi(sections, {
		capo,
		transpose,
		bpm,
		melody,
		bass,
		tuneDb: Object.fromEntries([...channelsInUse(melody)].map((id) => [id, channelLevel(id)]))
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
