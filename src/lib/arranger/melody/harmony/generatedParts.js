/**
 * Generated parts: lines written for you from another lane of the tune
 * (the lead: the melody, or a part you added) and the band's chords, each
 * singing a harmony part (harmonyParts.js) in a style (harmonyStyles.js).
 *
 * Each is an added part (extraParts.js: a voice of the tune's ABC with its
 * own lane and mixer channel) whose V: line says what it's written from, so
 * the ABC is the one place that's kept, by section too:
 *
 *   V:part-3 name="P3" % harmony from=melody sings=tenor style=stack
 *
 * A generated part follows its lead and the chords (written again in the
 * bars they change: freshHarmonyBars.js, harmonyFollowsChords.js), so it
 * isn't edited by hand; copied to a lane of its own, it's yours to change.
 * Later, the same line could carry what you've shaped by hand, for the app
 * to write around (the user's aim: a writing partner, never a fight).
 */
import { EXTRA_PARTS, isExtraPart, withLeadVoice, withoutExtraPart } from '../extraParts.js';
import { harmonyMusic } from './writeHarmonies.js';
import { voiceBlocks } from './voiceText.js';

const MARK = /%\s*harmony\s+from=(\S+)\s+sings=(\S+)\s+style=(\S+)/;
/** A new line's style, until you pick another. */
export const FIRST_STYLE = 'stack';

/**
 * @typedef {import('./writeHarmonies.js').HarmonyOf & { id: string }} Generated
 *   id: its voice and channel (an added part's)
 * @typedef {import('./writeHarmonies.js').ChordAt} ChordAt
 */

/**
 * The tune's generated parts, in order.
 * @param {string} abc
 * @returns {Generated[]}
 */
export function generatedParts(abc) {
	/** @type {Generated[]} */
	const found = [];
	for (const block of voiceBlocks(abc)) {
		const mark = MARK.exec(block.line);
		if (!mark || !isExtraPart(block.id) || found.some((each) => each.id === block.id)) continue;
		found.push({ id: block.id, lead: mark[1], sings: mark[2], style: mark[3] });
	}
	return found;
}

/**
 * Have exactly these harmony parts written from one lead: one it has
 * already stays as it is (or, `fresh`, is written again in its style), a new
 * one goes in the next free added part, one not asked for goes.
 * @param {string} abc
 * @param {import('abcjs').TuneObject} tune parsed from this ABC
 * @param {ChordAt} chordAt
 * @param {string} lead
 * @param {string[]} sings harmony part ids
 * @param {{ fresh?: boolean }} [options]
 * @returns {{ abc: string, added: Generated[], removed: string[], problem: string }}
 */
export function withLeadHarmonies(abc, tune, chordAt, lead, sings, { fresh = false } = {}) {
	const all = generatedParts(abc);
	const own = all.filter((part) => part.lead === lead);
	const removed = own.filter((part) => !sings.includes(part.sings)).map((part) => part.id);
	const kept = own.filter((part) => sings.includes(part.sings));
	const free = EXTRA_PARTS.filter(
		(part) => !voiceBlocks(abc).some((block) => block.id === part.id)
	);
	const wanted = sings.filter((each) => !kept.some((part) => part.sings === each));
	if (wanted.length > free.length) {
		return { abc, added: [], removed: [], problem: 'There’s no room for more lanes.' };
	}
	/** @type {Generated[]} */
	const added = wanted.map((each, i) => ({
		id: free[i].id,
		lead,
		sings: each,
		style: FIRST_STYLE
	}));
	const music = new Map(
		[...(fresh ? kept : []), ...added].map((part) => [
			part.id,
			harmonyMusic(abc, tune, chordAt, part)
		])
	);
	if ([...music.values()].some((each) => each === null)) {
		return { abc, added: [], removed: [], problem: 'That lane has no notes to harmonise yet.' };
	}

	let text = withParts(abc, fresh ? kept : [], music);
	for (const id of removed) text = withoutExtraPart(text, id);
	if (added.length > 0) {
		const blocks = added.map((part) => `${generatedLine(part)}\n${music.get(part.id)}`);
		text = `${withLeadVoice(text).trimEnd()}\n${blocks.join('\n')}\n`;
	}
	return { abc: text, added, removed, problem: '' };
}

/**
 * The ABC with these generated parts written again whole, from their leads
 * as they are now (`style` given: in that style from now on).
 * @param {string} abc
 * @param {import('abcjs').TuneObject} tune parsed from this ABC
 * @param {ChordAt} chordAt
 * @param {Generated[]} parts
 */
export function withPartsWritten(abc, tune, chordAt, parts) {
	const music = new Map(parts.map((part) => [part.id, harmonyMusic(abc, tune, chordAt, part)]));
	return withParts(abc, parts, music);
}

/**
 * The ABC without the parts generated from a lead (a lane that's going).
 * @param {string} abc
 * @param {string} lead
 */
export function withoutPartsFrom(abc, lead) {
	return generatedParts(abc)
		.filter((part) => part.lead === lead)
		.reduce((text, part) => withoutExtraPart(text, part.id), abc);
}

/**
 * Is this voice a generated part?
 * @param {Generated[]} generated generatedParts of the tune
 * @param {string} id
 */
export function isGenerated(generated, id) {
	return generated.some((part) => part.id === id);
}

/**
 * The ABC with these parts' V: lines and music replaced (music worked out
 * beforehand, all from the same ABC, so writing one doesn't move another's lead).
 * @param {string} abc
 * @param {Generated[]} parts
 * @param {Map<string, string | null>} music
 */
function withParts(abc, parts, music) {
	const blocks = voiceBlocks(abc);
	const edits = parts.flatMap((part) => {
		const block = blocks.find((each) => each.id === part.id);
		const written = music.get(part.id);
		return block && written != null
			? [{ from: block.from, to: block.to, text: `${generatedLine(part)}\n${written}\n` }]
			: [];
	});
	let text = abc;
	for (const edit of edits.sort((a, b) => b.from - a.from)) {
		text = text.slice(0, edit.from) + edit.text + text.slice(edit.to);
	}
	return text;
}

/** @param {Generated} part */
function generatedLine({ id, lead, sings, style }) {
	const label = EXTRA_PARTS.find((part) => part.id === id)?.label ?? id;
	return `V:${id} name="${label}" % harmony from=${lead} sings=${sings} style=${style}`;
}
