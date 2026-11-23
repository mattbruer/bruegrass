/**
 * Which of the arranger's pages show the band's controls (the player bar,
 * with the editor and mixer drawers above it). Every page shares the song,
 * but a page with its own controls, like Transcribe or Tracks, has no use
 * for the bar. A new page without them is one entry. A page with its own
 * controls can still have the drawers (the editor, the mixer; its own keys
 * open them): one entry too.
 */

const PAGES_WITHOUT_THE_BAND = Object.freeze([
	'/arranger/(band)/transcribe',
	'/arranger/(band)/tracks'
]);

const PAGES_WITH_ONLY_THE_DRAWERS = Object.freeze(['/arranger/(band)/tracks']);

/** @param {string | null | undefined} routeId */
export function showsTheDrawers(routeId) {
	return showsTheBand(routeId) || PAGES_WITH_ONLY_THE_DRAWERS.includes(routeId ?? '');
}

/** @param {string | null | undefined} routeId */
export function showsTheBand(routeId) {
	return !PAGES_WITHOUT_THE_BAND.includes(routeId ?? '');
}
