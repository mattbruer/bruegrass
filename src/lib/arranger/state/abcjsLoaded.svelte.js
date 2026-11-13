/**
 * abcjs for the song's state to read ABC with. It's large, so it loads
 * after the page; until then the tune and the bass read as empty, and
 * they're read again by themselves the moment it arrives.
 */
import { loadAbcjs } from '../melody/abcjs.js';

/** @typedef {Awaited<ReturnType<typeof loadAbcjs>>} Abcjs */

let loaded = $state.raw(/** @type {Abcjs | null} */ (null));
/** @type {Promise<Abcjs> | null} */
let loading = null;

/** Wait for abcjs. After this, the tune and bass in state are read. */
export function abcjsReady() {
	loading ??= loadAbcjs().then((abcjs) => (loaded = abcjs));
	return loading;
}

/** abcjs, or null while it's still loading (only in the browser). */
export function abcjsIfLoaded() {
	if (typeof window !== 'undefined') abcjsReady();
	return loaded;
}
