/**
 * A bar's chords, one slot per beat: the chord that starts on that beat,
 * or null where the chord before carries on. So "G on beat 1, C on beat 3"
 * is ['G', null, 'C', null]. The chart writes chords evenly split over a
 * bar (`G,C` is half and half, the odd beat going to the earlier chords),
 * so a bar's slots are written in the fewest chords that say the same
 * thing (`chartCell`).
 */

/** @typedef {(string | null)[]} Slots */

/**
 * How the chart shares a bar's beats among n chords.
 * @param {number} beats
 * @param {number} n
 */
export function shares(beats, n) {
	const base = Math.floor(beats / n);
	return Array.from({ length: n }, (_, i) => base + (i < beats % n ? 1 : 0));
}

/**
 * Chords typed into a bar at once ("G C" or "G,C"), spread over its beats as the chart would.
 * @param {string} typed
 * @param {number} beats
 * @returns {Slots}
 */
export function slotsFromTyped(typed, beats) {
	const names = typed
		.split(/[\s,|]+/)
		.filter(Boolean)
		.slice(0, beats);
	/** @type {Slots} */
	const slots = Array(beats).fill(null);
	let at = 0;
	shares(beats, names.length).forEach((length, i) => {
		slots[at] = names[i];
		at += length;
	});
	return slots;
}

/**
 * A bar's slots as stored (an older draft kept the typed text), fitted to its beats.
 * @param {Slots | string | undefined} stored
 * @param {number} beats
 * @returns {Slots}
 */
export function slotsOf(stored, beats) {
	if (typeof stored === 'string') return slotsFromTyped(stored, beats);
	const slots = (stored ?? []).slice(0, beats);
	return [...slots, ...Array(beats - slots.length).fill(null)];
}

/** @param {Slots} slots */
export function isEmptyBar(slots) {
	return slots.every((slot) => !slot);
}

/**
 * A bar left empty in the chart (`|G| |`): it holds the chord before.
 * Stored as slots with no chord in any; a bar with no chord (N.C.) has
 * nothing stored.
 * @param {Slots | string | undefined} stored
 */
export function isHeld(stored) {
	return Array.isArray(stored) && isEmptyBar(stored);
}

/**
 * The bar as the chart writes it ("G", "G,C", "G,C,C,C"). A bar starting
 * with no chord carries on `carried` (the last chord before it).
 * @param {Slots} slots
 * @param {string} carried
 * @returns {string}
 */
export function chartCell(slots, carried) {
	let last = carried;
	const perBeat = slots.map((slot) => (last = slot || last));
	for (let n = 1; n <= perBeat.length; n++) {
		const lengths = shares(perBeat.length, n);
		const names = [];
		let at = 0;
		for (const length of lengths) {
			names.push(perBeat[at]);
			at += length;
		}
		const spread = lengths.flatMap((length, i) => Array(length).fill(names[i]));
		if (spread.every((name, i) => name === perBeat[i])) return names.join(',');
	}
	return perBeat.join(',');
}

/**
 * Each change in a bar, for drawing: which beat it starts on and how many beats it lasts.
 * @param {Slots} slots
 * @returns {{ name: string, beat: number, beats: number }[]}
 */
export function changesIn(slots) {
	const starts = slots.flatMap((slot, beat) => (slot ? [{ name: slot, beat }] : []));
	return starts.map((change, i) => ({
		...change,
		beats: (starts[i + 1]?.beat ?? slots.length) - change.beat
	}));
}
