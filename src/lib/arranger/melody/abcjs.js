/**
 * The one place abcjs is loaded. It's large, so it's loaded on first use
 * rather than with the page.
 */
export async function loadAbcjs() {
	return (await import('abcjs')).default;
}

/**
 * A function that reads ABC text into abcjs's first tune (undefined when
 * there's no music), for code that reads other versions of a tune or bass
 * line than the open song's (which state has read already).
 * @param {any} abcjs
 * @returns {(abc: string) => import('abcjs').TuneObject | undefined}
 */
export function tuneReader(abcjs) {
	return (abc) => abcjs.parseOnly(abc)[0];
}
