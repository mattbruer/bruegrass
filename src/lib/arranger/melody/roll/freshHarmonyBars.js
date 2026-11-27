/**
 * After a lead (the melody, or a part you added) changes, the lines
 * generated from it follow only where it changed: those bars are written
 * fresh (harmony/generatedParts.js), unless you've locked them; every other
 * bar stays as it is. A generated line is written from its lead's own text,
 * so its bars line up with the lead's one for one.
 */
import { generatedParts, withPartsWritten } from '../harmony/generatedParts.js';
import { voiceChannels } from '../harmony/partChannels.js';
import { readScore } from './readScore.js';
import { keptBars, withBarsKept } from '../harmony/keptBars.js';

/**
 * @param {string} abc the lead already changed, its lines not yet
 * @param {(abc: string) => any} parse abcjs parseOnly, first tune
 * @param {import('../harmony/writeHarmonies.js').ChordAt} chordAt
 * @param {string} lead the voice that changed
 * @param {Iterable<number>} bars the lead's changed bars
 */
export function withFreshHarmonyBars(abc, parse, chordAt, lead, bars) {
	const parts = generatedParts(abc).filter((part) => part.lead === lead);
	const changed = new Set(bars);
	if (parts.length === 0 || changed.size === 0) return abc;
	const tune = parse(abc);
	if (!tune) return abc;
	const fresh = withPartsWritten(abc, tune, chordAt, parts);
	return withPartBars(
		abc,
		fresh,
		parse,
		parts.map((part) => part.id),
		changed
	);
}

/**
 * Lines written again whole (a style tried, Rewrite), with the bars you'd
 * locked put back as they were, still locked.
 * @param {string} fresh the ABC with the lines rewritten
 * @param {string} old the ABC before
 * @param {(abc: string) => any} parse
 * @param {string[]} partIds the lines rewritten
 */
export function withKeptBarsFrom(fresh, old, parse, partIds) {
	const oldTune = parse(old);
	if (!oldTune) return fresh;
	const channels = voiceChannels(oldTune);
	return partIds.reduce((text, id) => {
		const voice = channels.indexOf(id);
		if (voice < 1) return text;
		const kept = keptBars(old, readScore(old, oldTune, voice).score.bars);
		if (kept.size === 0) return text;
		const withNotes = withPartBars(text, old, parse, [id], kept);
		const tune = parse(withNotes);
		const at = tune ? voiceChannels(tune).indexOf(id) : -1;
		if (at < 1) return withNotes;
		return withBarsKept(withNotes, readScore(withNotes, tune, at).score.bars, kept, true);
	}, fresh);
}

/**
 * The ABC with some bars of some parts taken from another version of it
 * (the same leads, the parts written differently); bars you've locked
 * (harmony/keptBars.js) stay as they are.
 * @param {string} abc
 * @param {string} source
 * @param {(abc: string) => any} parse
 * @param {string[]} partIds
 * @param {Iterable<number>} bars
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
		if (oldBars.length !== newBars.length) return; // out of shape: leave it be
		const kept = keptBars(abc, oldBars);
		for (const index of bars) {
			if (kept.has(index)) continue;
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
