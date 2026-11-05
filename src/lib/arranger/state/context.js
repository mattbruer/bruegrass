/**
 * Sharing the page's Arranger with its components.
 *
 *   In the page:       const arranger = provideArranger();
 *   In any component:  const arranger = useArranger();
 */
import { getContext, setContext } from 'svelte';
import { Arranger } from './Arranger.svelte.js';

const ARRANGER_KEY = Symbol('arranger');

/** Create the page's Arranger and make it available to every component inside the page. */
export function provideArranger() {
	return setContext(ARRANGER_KEY, new Arranger());
}

/** The page's Arranger (call during component setup). */
export function useArranger() {
	const arranger = /** @type {Arranger | undefined} */ (getContext(ARRANGER_KEY));
	if (!arranger) throw new Error('useArranger() must be used inside the arranger page');
	return arranger;
}
