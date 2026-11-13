/**
 * The one place abcjs is loaded. It's large, so it's loaded on first use
 * rather than with the page.
 */
export async function loadAbcjs() {
	return (await import('abcjs')).default;
}

/**
 * A function that reads ABC text into abcjs's first tune (undefined when
 * there's no music), for code that parses many versions of a tune.
 * @returns {Promise<(abc: string) => import('abcjs').TuneObject | undefined>}
 */
export async function loadTuneReader() {
	const abcjs = await loadAbcjs();
	return (abc) => abcjs.parseOnly(abc)[0];
}
