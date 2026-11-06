/*
 * Strum patterns. The strumming hand keeps moving down and up; a pattern
 * says which of those strokes touch the strings. Each character is one
 * stroke: even ones are downstrokes, odd ones upstrokes. `steps` is strokes
 * per quarter note, and each pattern is written per beat group (2 =
 * boom-chuck, 3 = waltz boom-chuck-chuck, 1 = a lone beat).
 *
 *   B  bass note     x  strum     g  light graze     .  the hand misses
 *
 * A pattern without a group size falls back to boom-chuck's.
 */
export const STRUM_PATTERNS = {
	boomChuck: { label: 'Boom-chuck', steps: 2, groups: { 1: 'B.', 2: 'B.x.', 3: 'B.x.x.' } },
	bumTitty: { label: 'Bum-titty', steps: 2, groups: { 2: 'B.xg', 3: 'B.x.xg' } },
	boomChuckaChucka: {
		label: 'Boom-chuck-a-chuck-a',
		steps: 4,
		groups: { 2: 'B...xgxg', 3: 'B...x...xgxg' }
	}
};

/** How often each pattern is played: mostly boom-chuck, the others sprinkled in. */
const STRUM_MIX = { boomChuck: 0.75, bumTitty: 0.15, boomChuckaChucka: 0.1 };

const HITS = /** @type {const} */ ({ B: 'bass', x: 'strum', g: 'graze' });

/**
 * @typedef {'bass' | 'strum' | 'graze'} Hit
 * @typedef {{ at: number, hit: Hit, direction: 'down' | 'up', steps: number }} Stroke
 *   at: quarters from the group's boom; steps: the hand's strokes per quarter
 */

/**
 * @typedef {keyof typeof STRUM_PATTERNS} PatternName
 * @typedef {PatternName | 'mix'} StrumChoice 'mix': mostly boom-chuck, the others sprinkled in
 */

/**
 * The pattern for the next beat group.
 * @param {StrumChoice} choice
 * @param {() => number} random floats in [0, 1)
 * @returns {PatternName}
 */
export function nextPattern(choice, random) {
	return choice in STRUM_PATTERNS ? /** @type {PatternName} */ (choice) : pickPattern(random);
}

/**
 * A pattern from the mix.
 * @param {() => number} random floats in [0, 1)
 * @returns {keyof typeof STRUM_PATTERNS}
 */
function pickPattern(random) {
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
