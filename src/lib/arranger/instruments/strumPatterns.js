/*
 * Strum patterns. The strumming hand keeps moving down and up; a pattern
 * says which of those strokes touch the strings. Each character is one
 * stroke: even ones are downstrokes, odd ones upstrokes. `steps` is strokes
 * per quarter note, and each pattern is written per beat group (2 =
 * boom-chuck, 3 = waltz boom-chuck-chuck, 1 = a lone beat).
 *
 *   B  bass note     x  strum     .  the hand misses
 *   X  every string  m  the hand mutes what's ringing
 *
 * A pattern without a group size falls back to boom-chuck's.
 */
export const STRUM_PATTERNS = {
	boomChuck: { steps: 2, groups: { 1: 'B.', 2: 'B.x.', 3: 'B.x.x.' } },
	// Bum (a quarter), ti-ty (two eighths, down-up); a waltz plays boom, chuck, chuck-a
	bumTitty: { steps: 2, groups: { 2: 'B.xx', 3: 'B.x.xx' } },
	// Hits (chart/hits.js): one strum, then the hand stops; it rings until the next chord, or is choked after a beat
	ring: { steps: 2, groups: { 1: 'X.', 2: 'X...', 3: 'X.....' } },
	choke: { steps: 2, groups: { 1: 'Xm', 2: 'X.m.', 3: 'X.m...' } }
};

/** How often each pattern is played. */
const STRUM_MIX = { boomChuck: 1, bumTitty: 0 };

const HITS = /** @type {const} */ ({ B: 'bass', x: 'strum', X: 'full', m: 'mute' });

/**
 * @typedef {'bass' | 'strum' | 'full' | 'mute'} Hit
 * @typedef {{ at: number, hit: Hit, direction: 'down' | 'up', steps: number }} Stroke
 *   at: quarters from the group's boom; steps: the hand's strokes per quarter
 */

/**
 * The pattern for the next beat group, from the mix.
 * @param {() => number} random floats in [0, 1)
 * @returns {keyof typeof STRUM_PATTERNS}
 */
export function pickPattern(random) {
	let roll = random();
	for (const [name, share] of Object.entries(STRUM_MIX)) {
		roll -= share;
		if (roll < 0) return /** @type {keyof typeof STRUM_PATTERNS} */ (name);
	}
	return 'boomChuck';
}

/**
 * The strokes that touch the strings in one beat group.
 * @param {keyof typeof STRUM_PATTERNS} name
 * @param {number} groupSize quarters
 * @returns {Stroke[]}
 */
export function patternStrokes(name, groupSize) {
	const own = STRUM_PATTERNS[name];
	const { steps, groups } = own.groups[groupSize] ? own : STRUM_PATTERNS.boomChuck;
	const text = /** @type {Record<number, string>} */ (groups)[groupSize];
	if (!text) throw new Error(`No strum pattern for a group of ${groupSize} beats`);

	return [...text].flatMap((char, step) => {
		const hit = HITS[/** @type {keyof typeof HITS} */ (char)];
		if (!hit) return [];
		return [{ at: step / steps, hit, direction: step % 2 === 0 ? 'down' : 'up', steps }];
	});
}

/**
 * How long a pattern lets its first stroke ring before the hand mutes it,
 * in quarters (null: it rings on). The bass chokes a hit with the guitar.
 * @param {keyof typeof STRUM_PATTERNS} name
 * @param {number} groupSize quarters
 */
export function mutedAfter(name, groupSize) {
	return patternStrokes(name, groupSize).find((stroke) => stroke.hit === 'mute')?.at ?? null;
}
