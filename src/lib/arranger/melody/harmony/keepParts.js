/**
 * Harmony parts as blocks of the ABC (a `V:tenor …` line and the music
 * under it, up to the next part), so a part can be kept as it is (hand
 * edits and all) when the others are written fresh.
 */
import { HARMONY_PARTS } from './harmonyParts.js';

const PART_IDS = HARMONY_PARTS.map((part) => part.id);
/** Any voice's line: a part's block ends at the next voice, whichever it is (an extra part, say). */
const VOICE_LINE = /^V:\s*(\S+)/gm;

/**
 * The fresh ABC, with these parts put back as they were in the old one.
 * @param {string} fresh
 * @param {string} old
 * @param {string[]} keep part ids
 */
export function withPartsKept(fresh, old, keep) {
	const oldBlocks = new Map(
		partBlocks(old).map((block) => [block.id, old.slice(block.from, block.to)])
	);
	let text = fresh;
	for (const block of partBlocks(fresh).reverse()) {
		const kept = keep.includes(block.id) ? oldBlocks.get(block.id) : undefined;
		if (kept !== undefined) text = text.slice(0, block.from) + kept + text.slice(block.to);
	}
	return text;
}

/**
 * @param {string} abc
 * @returns {{ id: string, from: number, to: number }[]}
 */
function partBlocks(abc) {
	const starts = [...abc.matchAll(VOICE_LINE)].map((match) => ({
		id: match[1],
		from: match.index
	}));
	return starts
		.map((start, i) => ({ ...start, to: starts[i + 1]?.from ?? abc.length }))
		.filter((block) => PART_IDS.includes(block.id));
}

/**
 * The ABC with one part's whole line taken from another version of it.
 * @param {string} abc
 * @param {string} source an ABC with the same melody and that part
 * @param {string} id the part
 */
export function withPartFrom(abc, source, id) {
	const block = partBlocks(source).find((each) => each.id === id);
	const target = partBlocks(abc).find((each) => each.id === id);
	if (!block || !target) return abc;
	return abc.slice(0, target.from) + source.slice(block.from, block.to) + abc.slice(target.to);
}

/**
 * One part's text (its V: line and music), or '' if the ABC hasn't that part.
 * @param {string} abc
 * @param {string} id
 */
export function partBlockText(abc, id) {
	const block = partBlocks(abc).find((each) => each.id === id);
	return block ? abc.slice(block.from, block.to).trim() : '';
}

/**
 * All the harmony parts' text (their V: lines and music), to put back later.
 * @param {string} abc
 */
export function harmonyPartsText(abc) {
	return partBlocks(abc)
		.map((block) => abc.slice(block.from, block.to))
		.join('');
}

/**
 * The ABC with its harmony parts as they were in `text` (harmonyPartsText);
 * a part the ABC no longer has stays out.
 * @param {string} abc
 * @param {string} text
 */
export function withHarmonyPartsText(abc, text) {
	return partBlocks(text).reduce((result, block) => withPartFrom(result, text, block.id), abc);
}
