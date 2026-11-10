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

const PAGE_MARGIN = 15;

/** Notes keep about their printed size, so a wider page fits more bars on a line instead of bigger notes. */
const NARROWEST_STAFF = 480;
const STAFF_WIDTH_PER_BAR = 220;

/** @param {number} width the page's width in pixels */
function staffLayout(width) {
	const staffwidth = Math.max(NARROWEST_STAFF, width - 2 * PAGE_MARGIN);
	const barsPerLine = Math.max(2, Math.round(staffwidth / STAFF_WIDTH_PER_BAR));
	return {
		staffwidth,
		wrap: { minSpacing: 1.8, maxSpacing: 2.7, preferredMeasuresPerLine: barsPerLine }
	};
}

/**
 * Voice names (the harmony parts') push the staves right by the width of
 * their label, which abcjs doesn't count in the drawing's width, so the staff
 * ran past the edge. Widen the drawing to take them in; it scales down to fit.
 * @param {HTMLElement} target
 */
function widenToFitStaves(target) {
	const svg = target.querySelector('svg');
	const box = svg?.viewBox.baseVal;
	if (!svg || !box?.width) return;
	const shown = svg.getBoundingClientRect();
	if (!shown.width) return; // drawn out of sight, only to be read
	const staffRight = Math.max(
		0,
		...[...svg.querySelectorAll('.abcjs-staff path')].map(
			(line) => line.getBoundingClientRect().right
		)
	);
	const needed = ((staffRight - shown.left) * box.width) / shown.width + PAGE_MARGIN;
	if (needed <= box.width) return;

	const heightPerWidth = box.height / needed;
	svg.setAttribute('viewBox', `${box.x} ${box.y} ${needed} ${box.height}`);
	if (svg.parentElement) svg.parentElement.style.paddingBottom = `${heightPerWidth * 100}%`;
}

/**
 * @param {HTMLElement} target where the music is drawn (its contents are replaced)
 * @param {string} notation ABC notation
 * @param {{ transpose?: number }} [options] semitones to move the drawing by
 *   (display only: the notes played and the chords read stay as written)
 * @returns {Promise<DrawnTune>}
 */
export async function drawSheetMusic(target, notation, { transpose = 0 } = {}) {
	const { default: abcjs } = await import('abcjs');

	const [tune] = abcjs.renderAbc(target, notation, {
		responsive: 'resize',
		...staffLayout(target.clientWidth),
		add_classes: true,
		visualTranspose: transpose
	});
	widenToFitStaves(target);
	if (!tune) return NOTHING_DRAWN;

	// A moved drawing moves its chord symbols too, so chords are read from the tune as written
	const asWritten = transpose === 0 ? tune : abcjs.parseOnly(notation)[0];

	return {
		tune,
		sequence: tryOrNull(() => abcjs.synth.sequence(asWritten, {})),
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
