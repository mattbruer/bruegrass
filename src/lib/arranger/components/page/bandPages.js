/**
 * Which of the arranger's pages show the band's controls (the player bar,
 * with the editor and mixer drawers above it). Every page shares the song,
 * but a page with its own controls, like Transcribe or Tracks, has no use
 * for the bar; it can still have drawers, opened by its own keys. A new
 * page with its own controls is one entry, listing its drawers.
 */

/** @typedef {import('../../state/PageLayoutState.svelte.js').DrawerId} DrawerId */

/** @type {readonly DrawerId[]} */
const ALL_DRAWERS = Object.freeze(['edit', 'mixer']);

/** @type {Readonly<Record<string, readonly DrawerId[]>>} page → the drawers its own keys open */
const PAGES_WITH_THEIR_OWN_CONTROLS = Object.freeze({
	'/arranger/(band)/transcribe': ['edit'],
	'/arranger/(band)/tracks': ['edit', 'mixer']
});

/** @param {string | null | undefined} routeId */
export function showsTheBand(routeId) {
	return !Object.hasOwn(PAGES_WITH_THEIR_OWN_CONTROLS, routeId ?? '');
}

/**
 * @param {string | null | undefined} routeId
 * @returns {readonly DrawerId[]}
 */
export function drawersOn(routeId) {
	return showsTheBand(routeId) ? ALL_DRAWERS : PAGES_WITH_THEIR_OWN_CONTROLS[routeId ?? ''];
}
