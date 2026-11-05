/**
 * Following the sheet music: which drawn note the band is on.
 *
 * abcjs lists every note as played (repeats and endings played out) with
 * where it's drawn (TimingCallbacks' noteTimings), timed in milliseconds at
 * its own idea of the tempo. Those times are rescaled to quarter notes from
 * bar 1, the clock the melody plays on (melody.js), and looked up from the
 * band's audio clock, so the cursor can never drift from what you hear.
 */

/**
 * @typedef {{
 *   t: number, end: number, elements: Element[],
 *   left: number, endX: number, top: number, height: number, line: number
 * }} SheetEvent t/end: quarter notes from bar 1 (pickup notes are negative);
 *   left/endX/top/height: where it's drawn, in the SVG's units
 */

/**
 * The drawn notes on the melody's clock.
 * @param {import('abcjs').NoteTimingEvent[]} timings new TimingCallbacks(tune).noteTimings
 * @param {number} quarters the whole tune as played (repeats played out), in quarter notes
 * @param {number} pickup quarters before bar 1
 * @returns {SheetEvent[]}
 */
export function sheetEvents(timings, quarters, pickup) {
	const total = timings.at(-1)?.milliseconds ?? 0;
	if (total <= 0 || quarters <= 0) return [];
	const scale = quarters / total;

	/** @type {SheetEvent[]} */
	const events = [];
	timings.forEach((timing, i) => {
		if (timing.type !== 'event' || timing.left === undefined) return;
		const left = timing.left;
		events.push({
			t: timing.milliseconds * scale - pickup,
			end: (timings[i + 1]?.milliseconds ?? total) * scale - pickup,
			elements: (timing.elements ?? []).flat().filter(Boolean),
			left,
			endX: timing.endX ?? left + (timing.width ?? 0),
			top: timing.top ?? 0,
			height: timing.height ?? 0,
			line: timing.line ?? 0
		});
	});
	return events;
}

/**
 * The whole tune as played, in quarter notes: the longest voice of abcjs's
 * sequence (abcjs.synth.sequence), whose notes and rests run back to back.
 * @param {any[][]} voices
 */
export function playedQuarters(voices) {
	return Math.max(
		0,
		...voices.map((voice) =>
			voice.reduce(
				(sum, element) => sum + (element.el_type === 'note' ? element.duration * 4 : 0),
				0
			)
		)
	);
}

/**
 * Where the melody is, from the band's clock (see playArrangement's beats()).
 * Mirrors melody.js: bar 1 lines up with the arrangement's bar 1 (or the
 * loop region's first bar, `offset` quarters into the song), and a pickup
 * plays before the band and again at the end of each pass.
 * @param {{ elapsed: number, length: number }} clock quarters
 * @param {{ offset: number, pickup: number }} options pickup: 0 unless this pass starts at bar 1
 */
export function melodyTime({ elapsed, length }, { offset, pickup }) {
	// Before the band starts there's only the pickup, if this pass has one
	if (elapsed < 0) return pickup > 0 ? elapsed : NaN;
	const inPass = elapsed % length;
	if (pickup > 0 && inPass >= length - pickup) return inPass - length;
	return offset + inPass;
}

/**
 * The drawn note sounding at a time, if any.
 * @param {SheetEvent[]} events sorted by t
 * @param {number} time
 */
export function eventAt(events, time) {
	let low = 0;
	let high = events.length - 1;
	let found = -1;
	while (low <= high) {
		const mid = (low + high) >> 1;
		if (events[mid].t <= time + 1e-9) {
			found = mid;
			low = mid + 1;
		} else high = mid - 1;
	}
	return found >= 0 && time < events[found].end ? found : -1;
}
