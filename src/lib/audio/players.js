/**
 * Everything on the page that can play signs up here with a way to pause it,
 * so something that needs quiet (the tuner, listening through the mic) can
 * pause them all at once without knowing which page it's on.
 */

/** @type {Set<() => void>} */
const pausers = new Set();

/**
 * @param {() => void} pause stops or pauses this player (doing nothing if it isn't playing)
 * @returns {() => void} signs it off again
 */
export function registerPlayer(pause) {
	pausers.add(pause);
	return () => pausers.delete(pause);
}

export function pauseAllPlayers() {
	for (const pause of pausers) pause();
}
