/**
 * Keys in a tune kept by section. A section's bars say the key they're
 * written in: a section in another key than the tune's own (its K: line)
 * starts with that `[K:]`, so it stays with the section wherever it plays,
 * and a change of key in the chart never changes its notes' pitches.
 *
 * Put together (the tune as played, the ABC view), a section in the tune's
 * own key that follows one in another key needs the tune's key named again
 * (`withKeyResets`); written back, that reset is taken off (`withoutReset`).
 */

const KEY_FIELD = /\[K:([^\]]*)\]/g;
const LEADING_KEY = /^\s*\[K:([^\]]*)\][ \t]*/;

/**
 * The tune's own key, from its header's K: line ("Em" from `K:Em clef=bass`).
 * @param {string} header
 */
export function tuneKeyText(header) {
	return header.match(/^K:\s*(\S+)/m)?.[1] ?? 'C';
}

/**
 * Each section's bars, in the order they're put together, with the tune's
 * key named again where one follows a section that ended in another key.
 * @param {string[]} bodies
 * @param {string} tuneKey
 */
export function withKeyResets(bodies, tuneKey) {
	let key = tuneKey;
	return bodies.map((body) => {
		const leading = body.match(LEADING_KEY)?.[1].trim();
		const reset = !leading && key !== tuneKey && body.trim() !== '';
		const text = reset ? `[K:${tuneKey}] ${body}` : body;
		key = lastKey(body) ?? leading ?? (body.trim() ? tuneKey : key);
		return text;
	});
}

/**
 * A section's bars as kept: without a leading `[K:]` naming the tune's own
 * key (a reset put there when the sections were put together).
 * @param {string} body
 * @param {string} tuneKey
 */
export function withoutReset(body, tuneKey) {
	const leading = body.match(LEADING_KEY);
	return leading && leading[1].trim() === tuneKey ? body.slice(leading[0].length) : body;
}

/**
 * A section's bars as written, each under a `[K:]` where its key changes
 * (the first where it isn't the tune's own).
 * @param {{ keyText?: string }[]} bars each bar's key (none: the tune's)
 * @param {string[]} written each bar's music
 * @param {string} tuneKey
 */
export function withKeyFields(bars, written, tuneKey) {
	let key = tuneKey;
	return written.map((music, i) => {
		const barKey = bars[i].keyText ?? tuneKey;
		const field = barKey !== key ? `[K:${barKey}] ` : '';
		key = barKey;
		return field + music;
	});
}

/** @param {string} body */
function lastKey(body) {
	return [...body.matchAll(KEY_FIELD)].at(-1)?.[1].trim() ?? null;
}
