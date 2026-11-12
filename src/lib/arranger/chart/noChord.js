/**
 * "N.C.", no chord: a bar (or part of one) where the band doesn't play. A
 * chart writes it like a chord (`|N.C.|`, `|G,N.C.|`): a stop, or a bar
 * whose chord hasn't been written yet (a song being transcribed). It names
 * no key and plays nothing.
 *
 * This is the one place the band learns it: its instruments work out their
 * parts from real chords (shapes, roots, fifths), so a no-chord slot is
 * first filled with the chord before it (`sectionsToPlay`), and then every
 * note that starts in one is left out (`withoutStops`).
 */
import { slotPositions } from './timeline.js';

export const NO_CHORD = 'N.C.';

/** @param {string} name */
export function isNoChord(name) {
	return /^n\.?\s*c\.?$/i.test(name.trim());
}

/**
 * The same sections with each no-chord slot holding the chord before it
 * (or after it, before the first chord). Unchanged if there are none.
 * @template {{ measures: string[][] }} S
 * @param {S[]} sections
 * @returns {S[]}
 */
export function sectionsToPlay(sections) {
	const all = sections.flatMap((section) => section.measures.flat());
	if (!all.some(isNoChord)) return sections;
	let last = all.find((name) => !isNoChord(name)) ?? 'C';
	return sections.map((section) => ({
		...section,
		measures: section.measures.map((measure) =>
			measure.map((name) => {
				if (isNoChord(name)) return last;
				last = name;
				return name;
			})
		)
	}));
}

/**
 * Where the band stops in one pass (quarters from bar 1).
 * @param {import('./timeline.js').Section[]} sections
 * @returns {{ start: number, end: number }[]}
 */
export function stops(sections) {
	return slotPositions(sections)
		.filter((slot) => isNoChord(slot.name))
		.map((slot) => ({ start: slot.start, end: slot.start + slot.length }));
}

/**
 * The notes that don't start in a stop. Times can run over several passes.
 * @template T
 * @param {T[]} notes
 * @param {{ start: number, end: number }[]} spans quarters, from stops()
 * @param {(note: T) => number} quartersOf where a note starts, in quarters from bar 1
 * @param {number} passQuarters one pass's length
 * @returns {T[]}
 */
export function withoutStops(notes, spans, quartersOf, passQuarters) {
	if (spans.length === 0) return notes;
	return notes.filter((note) => {
		const at = ((quartersOf(note) % passQuarters) + passQuarters) % passQuarters;
		return !spans.some((span) => at >= span.start - 1e-6 && at < span.end - 1e-6);
	});
}

/**
 * Where a note that rings from `start` to `end` must stop: at the first stop
 * it would ring into (all in quarters from bar 1, possibly past one pass).
 * @param {number} start
 * @param {number} end
 * @param {{ start: number, end: number }[]} spans from stops()
 * @param {number} passQuarters
 */
export function endBeforeStops(start, end, spans, passQuarters) {
	let cut = end;
	const pass = Math.floor(start / passQuarters) * passQuarters;
	for (const offset of [pass, pass + passQuarters]) {
		for (const span of spans) {
			const at = offset + span.start;
			if (at > start + 1e-6 && at < cut) cut = at;
		}
	}
	return cut;
}
