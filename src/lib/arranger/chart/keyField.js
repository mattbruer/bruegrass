/**
 * Keys written into the chart as abc-style fields, `[K:G]`. Anywhere in
 * the chart one names the key from that bar on (a B part in minor, a
 * modulation). The one before the first bar, on the first section's line,
 * names the song's key, for when the first chord doesn't give it (a song
 * that starts on the V). The key is the song's own, as it sounds before any Key change.
 */
import { parseKeyName } from './key.js';

/** A section line's leading fields, up to its first `[K:]` (the song's key, on the first section line). */
const LEADING_KEY = /^(\s*"[^"]+"[ \t]*(?:\[(?!K:)[^\]]*\][ \t]*)*)\[K:([^\]]*)\][ \t]?/;

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
 * The arrangement text naming this song key (or none, to go back to the
 * guess). Only the song's key changes; keys named later in the song stay.
 * @param {string} text
 * @param {string | null} name e.g. "G", "Em"
 */
export function withKeyField(text, name) {
	const line = firstSectionLine(text);
	if (!line) return text;
	const field = name ? `[K:${name}]` : '';
	const named = LEADING_KEY.test(line.text)
		? line.text.replace(LEADING_KEY, (_, lead) => (field ? `${lead}${field} ` : lead))
		: field
			? line.text.replace(/^(\s*"[^"]+")/, `$1 ${field}`)
			: line.text;
	return text.slice(0, line.at) + named + text.slice(line.at + line.text.length);
}

/**
 * The song's key as the chart names it ("G", "Em"), or null when it names none.
 * @param {string} text
 */
export function keyFieldName(text) {
	const line = firstSectionLine(text);
	return (line && LEADING_KEY.exec(line.text)?.[2].trim()) || null;
}

/** @param {string} text */
function firstSectionLine(text) {
	const match = /^\s*"[^"]+".*$/m.exec(text);
	return match ? { at: match.index, text: match[0] } : null;
}
