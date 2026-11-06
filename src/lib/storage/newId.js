/**
 * A new unique id for a saved document (a song, an EQ preset, a listening
 * setup). Random rather than counted, so documents made on different
 * devices never clash when they're brought together later.
 */
export function newId() {
	if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
