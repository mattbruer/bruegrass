/**
 * Where each voice of a tune is in its ABC: its `V:` line, and its music up
 * to the next voice. The melody is the music after the header (and its
 * `V:1` line, which abcjs needs to play voices together).
 */
import { MELODY_CHANNEL } from './partChannels.js';

const VOICE_LINE = /^V:\s*(\S+).*$/gm;
const LEAD_VOICE = /^V:1[ \t]*(\n|$)/;

/**
 * @typedef {{ id: string, line: string, from: number, to: number, music: number }} VoiceBlock
 *   id: its V: id ('1' for the melody); line: its V: line; from: where that
 *   line starts; music: where its music starts; to: where the next voice starts
 */

/**
 * Every voice written with a V: line, in order.
 * @param {string} abc
 * @returns {VoiceBlock[]}
 */
export function voiceBlocks(abc) {
	const lines = [...abc.matchAll(VOICE_LINE)];
	return lines.map((match, index) => {
		const from = match.index ?? 0;
		const lineEnd = from + match[0].length;
		return {
			id: match[1],
			line: match[0],
			from,
			music: Math.min(lineEnd + 1, abc.length),
			to: lines[index + 1]?.index ?? abc.length
		};
	});
}

/**
 * Where a voice's music is: the melody's (MELODY_CHANNEL) or a part's (its V: id).
 * @param {string} abc
 * @param {string} id
 * @returns {{ from: number, to: number } | null}
 */
export function voiceMusic(abc, id) {
	if (id === MELODY_CHANNEL) {
		const start = melodyStart(abc);
		const next = voiceBlocks(abc).find((block) => block.from >= start && block.id !== '1');
		return { from: start, to: next?.from ?? abc.length };
	}
	const block = voiceBlocks(abc).find((each) => each.id === id);
	return block ? { from: block.music, to: block.to } : null;
}

/**
 * Where the melody's music starts: after the header (to the K: line) and its V:1 line.
 * @param {string} abc
 */
function melodyStart(abc) {
	const keyLine = /^K:.*$/m.exec(abc);
	const headerEnd = keyLine ? keyLine.index + keyLine[0].length + 1 : 0;
	const lead = LEAD_VOICE.exec(abc.slice(headerEnd));
	return headerEnd + (lead ? lead[0].length : 0);
}
