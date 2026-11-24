/**
 * A hit: the band strikes a chord once and stops strumming, the way a song
 * ends (or a stop mid-song). Written right after the chord: `|D7,G~|` rings
 * the G from beat 3, `|G!|` chokes it. The band stays quiet until the next
 * chord written in the chart; empty bars after a hit let it ring on.
 *
 * This is the one place the chart's hit marks are read. How each part plays
 * a hit is its own (guitar: strumPatterns.js; mandolin; bass: songBass.js).
 */
import { slotPositions } from './timeline.js';

/** @typedef {'ring' | 'choke'} Hit */

/** The mark typed after a chord, for each kind of hit. */
const HIT_MARKS = /** @type {const} */ ({ '~': 'ring', '!': 'choke' });

/**
 * @param {string} text a chord as typed: "G", "G~", "G!"
 * @returns {{ chord: string, hit: Hit | null }}
 */
export function splitHit(text) {
	const trimmed = text.trim();
	const hit = HIT_MARKS[/** @type {keyof typeof HIT_MARKS} */ (trimmed.slice(-1))];
	if (!hit) return { chord: trimmed, hit: null };
	return { chord: trimmed.slice(0, -1).trim(), hit };
}

/**
 * @param {string} chord
 * @param {Hit | null} hit
 */
export function withHit(chord, hit) {
	const mark = Object.keys(HIT_MARKS).find(
		(key) => HIT_MARKS[/** @type {keyof typeof HIT_MARKS} */ (key)] === hit
	);
	return mark ? `${chord}${mark}` : chord;
}

/**
 * Where each hit sounds in one pass, in quarters from bar 1: from the hit
 * to the next chord written in the chart (or the end).
 * @param {import('./timeline.js').Section[]} sections
 * @returns {{ start: number, end: number, hit: Hit }[]}
 */
export function hitSpans(sections) {
	const slots = slotPositions(sections);
	const last = slots.at(-1);
	const passEnd = last ? last.barStart + (last.meter.beats * 4) / last.meter.unit : 0;
	/** @param {import('./timeline.js').SlotPosition} slot */
	const isWritten = (slot) => !sections[slot.section].held?.[slot.measure];

	return slots.flatMap((slot, k) => {
		const { hit } = slot;
		if (!hit) return [];
		const next = slots.slice(k + 1).find(isWritten);
		return [{ start: slot.start, end: next ? next.start : passEnd, hit }];
	});
}

/**
 * The hit a time falls in, if any.
 * @param {number} quarters from bar 1, within the pass
 * @param {{ start: number, end: number, hit: Hit }[]} spans from hitSpans()
 */
export function hitAt(quarters, spans) {
	return spans.find((span) => quarters >= span.start - 1e-6 && quarters < span.end - 1e-6);
}
