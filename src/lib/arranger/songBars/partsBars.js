/**
 * The tune (or the bass line) kept by section, with the same bars taken
 * out of or put into a section as the chart: every voice, bar for bar.
 * Explicit, where melody/sections/barsFollowChart.js has to guess from the
 * chords which bars went. A voice written with repeats, or not lined up
 * bar for bar with its section, can't follow, so the edit is refused.
 *
 * @typedef {import('../melody/sections/tuneBySection.js').TuneBySection['parts']} Parts
 */
import { REPEATS, splitBars } from '../melody/sections/barsFollowChart.js';
import { barLines } from '../melody/sections/sectionRests.js';
import { MELODY_VOICE } from '../melody/sections/tuneBySection.js';

/** A chord symbol, kept out of the rests a part other than the melody gets. */
const CHORD_SYMBOL = /"[^"]*"/g;
/** A tie at the end of a bar. */
const TIE_ON = /-\s*$/;

/**
 * @param {Parts} parts
 * @param {import('./pickedBars.js').SectionBars[]} sections the bars going
 * @param {(name: string) => number} barCount how many bars the section had in the chart before
 * @param {string} what "the tune", "the bass line", for the problem
 * @returns {{ parts: Parts | null, problem: string }}
 */
export function partsWithoutBars(parts, sections, barCount, what) {
	const edited = { ...parts };
	for (const { name, bars } of sections) {
		const voices = parts[name];
		if (!voices) continue;
		if (bars.length === barCount(name)) {
			delete edited[name];
			continue;
		}
		/** @type {Record<string, string>} */
		const kept = {};
		for (const [voice, body] of Object.entries(voices)) {
			const all = splitBars(body);
			if (!linesUp(body, all, barCount(name))) return refused(what, name);
			kept[voice] = barLines(withoutBars(all, bars));
		}
		edited[name] = kept;
	}
	return { parts: edited, problem: '' };
}

/**
 * @param {Parts} parts
 * @param {string} name the section
 * @param {number} at the bar the new ones go before
 * @param {string[]} rests the new bars' music in the melody (with its chord symbols)
 * @param {number} barCount the section's bars before
 * @param {string} what
 */
export function partsWithBars(parts, name, at, rests, barCount, what) {
	const voices = parts[name];
	if (!voices) return { parts, problem: '' };
	/** @type {Record<string, string>} */
	const grown = {};
	for (const [voice, body] of Object.entries(voices)) {
		const all = splitBars(body);
		if (!linesUp(body, all, barCount)) return refused(what, name);
		const added =
			voice === MELODY_VOICE ? rests : rests.map((bar) => bar.replace(CHORD_SYMBOL, ''));
		// A tie into the bar that's no longer next is let go
		const before = all.slice(0, at).map((bar, index) => (index === at - 1 ? untied(bar) : bar));
		grown[voice] = barLines([...before, ...added, ...all.slice(at)]);
	}
	return { parts: { ...parts, [name]: grown }, problem: '' };
}

/**
 * The bars left, a tie into a bar that went let go.
 * @param {string[]} bars
 * @param {number[]} going
 */
function withoutBars(bars, going) {
	return bars.flatMap((bar, index) => {
		if (going.includes(index)) return [];
		return going.includes(index + 1) ? [untied(bar)] : [bar];
	});
}

/** @param {string} bar */
function untied(bar) {
	return bar.replace(TIE_ON, '');
}

/**
 * @param {string} body
 * @param {string[]} bars
 * @param {number} count
 */
function linesUp(body, bars, count) {
	return !REPEATS.test(body) && bars.length === count;
}

/**
 * @param {string} what
 * @param {string} name
 */
function refused(what, name) {
	return {
		parts: null,
		problem: `${what} in “${name}” isn’t written bar for bar with the chart (a repeat?), so it can’t follow: change it in the ABC.`
	};
}
