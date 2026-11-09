/**
 * The song's key written into the chart as an abc-style field, `[K:G]`,
 * for when the first chord doesn't give it (a song that starts on the V).
 * It names the key of the guitar's shapes, before any capo, and holds for
 * the whole song. Written once, on the first section's line.
 */
import { parseKeyName } from './key.js';

const KEY_FIELD = /\[K:([^\]]*)\]/;

/** @param {string} token */
export function isKeyField(token) {
	return /^\[K:/i.test(token);
}

/**
 * @param {string} token e.g. "[K:G]", "[K:Em]"
 * @param {string} section for error messages
 * @returns {import('./key.js').Key}
 */
export function parseKeyField(token, section) {
	const key = parseKeyName(token.slice(3, -1));
	if (!key) throw new Error(`Can't read ${token} in ${section}: use a key like [K:G] or [K:Em]`);
	return key;
}

/**
 * The arrangement text naming this key (or none, to go back to the guess).
 * @param {string} text
 * @param {string | null} name e.g. "G", "Em"
 */
export function withKeyField(text, name) {
	const field = name ? `[K:${name}]` : '';
	if (KEY_FIELD.test(text)) return text.replace(/\s?\[K:[^\]]*\]/, field && ` ${field}`);
	if (!field) return text;
	return text.replace(/^(\s*"[^"]+")/m, `$1 ${field}`);
}
