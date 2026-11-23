/**
 * Which of the arranger's pages show the band's controls (the player bar,
 * with the editor and mixer drawers above it). Every page shares the song,
 * but a page with its own controls, like Transcribe or Tracks, has no use
 * for the bar. A new page without them is one entry. A page with its own
 * controls can still have the mixer drawer (its own button opens it): one
 * entry too.
 */

const PAGES_WITHOUT_THE_BAND = Object.freeze([
	'/arranger/(band)/transcribe',
	'/arranger/(band)/tracks'
]);

const PAGES_WITH_ONLY_THE_MIXER = Object.freeze(['/arranger/(band)/tracks']);

/** @param {string | null | undefined} routeId */
export function showsTheMixer(routeId) {
	return showsTheBand(routeId) || PAGES_WITH_ONLY_THE_MIXER.includes(routeId ?? '');
}

/** @param {string | null | undefined} routeId */
export function showsTheBand(routeId) {
	return !PAGES_WITHOUT_THE_BAND.includes(routeId ?? '');
}
