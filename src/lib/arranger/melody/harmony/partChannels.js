/**
 * Which mixer channel each voice of the tune plays through: the melody on
 * Melody, each extra part (yours or generated) on its own (channel id = part id).
 * A voice is known by the name its V: line gives it (V:part-1 name="P1"),
 * the only thing abcjs keeps; a voice with any other name plays on Melody.
 */
import { EXTRA_PARTS } from '../extraParts.js';

export const MELODY_CHANNEL = 'melody';

/** Every voice after the melody: the extra parts. */
const OTHER_VOICES = EXTRA_PARTS;

/**
 * @param {import('abcjs').TuneObject} tune
 * @returns {string[]} one channel id per voice, in order (as setUpAudio's tracks)
 */
export function voiceChannels(tune) {
	const staves = tune.lines.find((line) => line.staff)?.staff ?? [];
	return staves.map((staff, index) => {
		const name = /** @type {any} */ (staff).title?.[0];
		const part = index > 0 ? OTHER_VOICES.find((each) => each.label === name) : null;
		return part?.id ?? MELODY_CHANNEL;
	});
}

/**
 * Is this one of the channels the tune plays on (Melody or an extra part)?
 * @param {string} channelId
 */
export function isTuneChannel(channelId) {
	return channelId === MELODY_CHANNEL || OTHER_VOICES.some((part) => part.id === channelId);
}

/**
 * The channels a tune's notes actually use.
 * @param {{ notes: { channel: string }[] } | null} melody
 * @returns {Set<string>}
 */
export function channelsInUse(melody) {
	return new Set(melody?.notes.map((note) => note.channel) ?? []);
}
