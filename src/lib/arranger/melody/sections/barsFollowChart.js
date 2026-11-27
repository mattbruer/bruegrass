/**
 * A tune kept by section follows bars added to or removed from a section in
 * the chart: the section's tune loses the bars that went and gets rests (with
 * the chart's chords) where bars came, in every voice. Old and new bars are
 * matched in order like a text diff (bass/matchBars.js), so every other bar
 * keeps its notes. A section that kept its number of bars has had chords or
 * a time signature changed, not bars added: each bar keeps its notes, unless
 * its time signature changed. A section whose tune has repeats or endings,
 * or whose bars don't line up with its chart bars one for one, is left as it is.
 */
import { matchBars } from '../../bass/matchBars.js';
import { barLines } from './sectionRests.js';
import { MELODY_VOICE } from './tuneBySection.js';

/** Repeats and endings: their bars can't be matched one for one with the chart's. */
const REPEATS = /:\||\|:|\[\d|\|\d/;
/** A chord symbol, dropped from the rests a harmony part gets. */
const CHORD_SYMBOL = /"[^"]*"/g;

/**
 * What each bar of each section is, by the name of the section that owns it
 * (a section played `as` another has no bars of its own).
 * @param {{ name: string, measures: string[][], meters: unknown[] }[]} sections parsed, in play order
 * @param {import('./tuneBySection.js').SectionInstance[]} instances the same, as instances
 * @returns {Record<string, string[]>}
 */
export function sectionBarKeys(sections, instances) {
	/** @type {Record<string, string[]>} */
	const keys = {};
	instances.forEach((instance, index) => {
		const section = sections[index];
		if (!section || instance.name !== instance.source || instance.source in keys) return;
		keys[instance.source] = section.measures.map(
			(chords, bar) => `${JSON.stringify(section.meters[bar])}${METER_END}${chords.join(',')}`
		);
	});
	return keys;
}

/** Where a bar's key (sectionBarKeys) moves from its time signature to its chords. */
const METER_END = ' ';

/** @param {string} key a bar's key (sectionBarKeys) */
function meterOf(key) {
	return key.slice(0, key.indexOf(METER_END));
}

/**
 * Which old bar each new bar is. The same number of bars: each bar is
 * itself (a chord changed is still the same bar), unless its time
 * signature changed. Otherwise bars came or went, found like a text diff.
 * @param {string[]} old
 * @param {string[]} now
 * @returns {Map<number, number>} new bar index → old bar index
 */
function sameBars(old, now) {
	if (old.length !== now.length) return matchBars(old, now);
	const kept = now.flatMap((key, index) => (meterOf(key) === meterOf(old[index]) ? [index] : []));
	return new Map(kept.map((index) => [index, index]));
}

/**
 * The sections' tunes after the chart's bars changed (null: nothing to change).
 * @param {import('./tuneBySection.js').TuneBySection['parts']} parts
 * @param {Record<string, string[]>} before each section's bars before the edit
 * @param {Record<string, string[]>} after and after it
 * @param {(section: string) => string} emptyBars what a section plays with nothing written, now
 */
export function partsFollowingBars(parts, before, after, emptyBars) {
	let changed = false;
	const followed = { ...parts };
	for (const [section, voices] of Object.entries(parts)) {
		const old = before[section];
		const now = after[section];
		if (!old || !now || old.join('|') === now.join('|')) continue;
		const matched = sameBars(old, now);
		if (old.length === now.length && matched.size === now.length) continue;
		const empty = splitBars(emptyBars(section));
		/** @type {Record<string, string>} */
		const moved = {};
		for (const [voice, body] of Object.entries(voices)) {
			const bars = splitBars(body);
			if (REPEATS.test(body) || bars.length !== old.length) {
				moved[voice] = body;
				continue;
			}
			const rest = (/** @type {number} */ index) => {
				const bar = empty[index] ?? '';
				return voice === MELODY_VOICE ? bar : bar.replace(CHORD_SYMBOL, '');
			};
			moved[voice] = barLines(barsAfter(bars, now.length, matched, rest));
		}
		followed[section] = moved;
		changed = true;
	}
	return changed ? followed : null;
}

/**
 * @param {string[]} bars the old bars
 * @param {number} count how many bars there are now
 * @param {Map<number, number>} matched new bar → old bar
 * @param {(index: number) => string} rest a new bar's rest
 */
function barsAfter(bars, count, matched, rest) {
	return Array.from({ length: count }, (_, index) => {
		const old = matched.get(index);
		if (old === undefined) return rest(index);
		// A tie into a bar that's no longer next is let go (the last bar's ties into the next section)
		const last = index === count - 1;
		const tiedOn = last ? old === bars.length - 1 : matched.get(index + 1) === old + 1;
		return tiedOn ? bars[old] : bars[old].replace(/-\s*$/, '');
	});
}

/**
 * A section's tune as bars (the text between bar lines).
 * @param {string} body
 */
export function splitBars(body) {
	return body
		.split('|')
		.map((bar) => bar.trim())
		.filter((bar) => bar !== '' && bar !== ']');
}
