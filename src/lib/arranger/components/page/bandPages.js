/**
 * Which of the arranger's pages show the band's controls (the player bar,
 * with the editor and mixer drawers above it). Every page shares the song,
 * but a page with its own player, like Transcribe, has no use for the
 * band's. A new page without them is one entry.
 */

const PAGES_WITHOUT_THE_BAND = Object.freeze(['/arranger/(band)/transcribe']);

/** @param {string | null | undefined} routeId */
export function showsTheBand(routeId) {
	return !PAGES_WITHOUT_THE_BAND.includes(routeId ?? '');
}
