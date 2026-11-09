/**
 * After the melody changes, the harmony parts follow it only where it
 * changed: those bars of every part are written fresh from the melody
 * (writeHarmonies.js); every other bar keeps the part as it is, hand edits
 * included. A part is written from the melody's own text, so its bars line
 * up with the melody's one for one.
 */
import { withHarmonies, harmonyPartsIn } from '../harmony/writeHarmonies.js';
import { voiceChannels } from '../harmony/partChannels.js';
import { readScore } from './readScore.js';

/**
 * @param {string} abc the melody already changed, the parts not yet
 * @param {(abc: string) => any} parse abcjs parseOnly, first tune
 * @param {import('../harmony/writeHarmonies.js').ChordAt} chordAt
 * @param {Set<number>} bars the melody's changed bars
 */
export function withFreshHarmonyBars(abc, parse, chordAt, bars) {
	const parts = harmonyPartsIn(abc);
	if (parts.length === 0 || bars.size === 0) return abc;
	const tune = parse(abc);
	if (!tune) return abc;
	const fresh = withHarmonies(abc, tune, chordAt, parts).abc;
	return withPartBars(abc, fresh, parse, parts, bars);
}

/**
 * The ABC with some bars of some parts taken from another version of it
 * (the same melody, the parts written differently).
 * @param {string} abc
 * @param {string} source
 * @param {(abc: string) => any} parse
 * @param {string[]} partIds
 * @param {Set<number>} bars
 */
export function withPartBars(abc, source, parse, partIds, bars) {
	const tune = parse(abc);
	const sourceTune = parse(source);
	if (!tune || !sourceTune) return abc;

	const sourceVoices = voiceChannels(sourceTune);
	/** @type {{ from: number, to: number, text: string }[]} */
	const swaps = [];
	voiceChannels(tune).forEach((id, voice) => {
		const sourceVoice = sourceVoices.indexOf(id);
		if (voice === 0 || sourceVoice < 1 || !partIds.includes(id)) return;
		const oldBars = readScore(abc, tune, voice).score.bars;
		const newBars = readScore(source, sourceTune, sourceVoice).score.bars;
		if (oldBars.length !== newBars.length) return; // edited out of shape: leave it be
		for (const index of bars) {
			const old = oldBars[index];
			const neu = newBars[index];
			if (old?.from == null || old.to == null || neu?.from == null || neu.to == null) continue;
			swaps.push({ from: old.from, to: old.to, text: source.slice(neu.from, neu.to) });
		}
	});

	let text = abc;
	for (const swap of swaps.sort((a, b) => b.from - a.from)) {
		text = text.slice(0, swap.from) + swap.text + text.slice(swap.to);
	}
	return text;
}
