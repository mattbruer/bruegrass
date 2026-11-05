/**
 * Draw ABC notation as sheet music with abcjs, and collect what the rest of
 * the arranger needs from the drawn tune.
 *
 * abcjs only works in the browser, so it's loaded on first use.
 */

/**
 * @typedef {{
 *   tune: import('abcjs').TuneObject | null,
 *   sequence: any[][] | null,
 *   timings: import('abcjs').NoteTimingEvent[] | null,
 *   warnings: string[]
 * }} DrawnTune
 *   tune: the parsed tune (melody notes, title)
 *   sequence: the tune as played, repeats played out (for its chord symbols)
 *   timings: every drawn note as played, with where it's drawn (for the cursor)
 *   warnings: problems abcjs found in the notation, as plain text
 */

/** A tune with nothing in it. */
export const NOTHING_DRAWN = Object.freeze({
	tune: null,
	sequence: null,
	timings: null,
	warnings: []
});

/**
 * @param {HTMLElement} target where the music is drawn (its contents are replaced)
 * @param {string} notation ABC notation
 * @returns {Promise<DrawnTune>}
 */
export async function drawSheetMusic(target, notation) {
	const { default: abcjs } = await import('abcjs');

	const [tune] = abcjs.renderAbc(target, notation, { responsive: 'resize', add_classes: true });
	if (!tune) return NOTHING_DRAWN;

	return {
		tune,
		sequence: tryOrNull(() => abcjs.synth.sequence(tune, {})),
		timings: tryOrNull(() => new abcjs.TimingCallbacks(tune, {}).noteTimings),
		warnings: (tune.warnings ?? []).map(withoutHtml)
	};
}

/** abcjs warnings come as HTML snippets; show them as plain text. */
function withoutHtml(/** @type {string} */ warning) {
	return warning.replace(/<[^>]*>/g, '');
}

/**
 * @template T
 * @param {() => T} read
 * @returns {T | null}
 */
function tryOrNull(read) {
	try {
		return read();
	} catch {
		return null; // unusual notation abcjs can draw but not play
	}
}
