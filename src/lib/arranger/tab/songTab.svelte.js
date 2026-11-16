/**
 * The open song's TAB: for each part (voice id), the instrument it's
 * written for and the strings you chose for its notes. Part of the song,
 * saved and shared with it (state/songFields.js). A note you haven't
 * chosen a string for is placed by fingering.js.
 *
 * @typedef {{ instrument: string, strings: Record<string, number> }} PartTab
 *   strings: note key (fingering.js noteKey) → string index on the instrument
 */

export const songTab = $state({ /** @type {Record<string, PartTab>} */ parts: {} });

/** A plain copy, to save with the song. */
export function tabSnapshot() {
	return $state.snapshot(songTab.parts);
}

/**
 * Write a part's TAB for this instrument (null: no TAB). Choosing another
 * instrument starts its strings afresh: string numbers mean other strings there.
 * @param {string} voice
 * @param {string | null} instrument
 */
export function setTabInstrument(voice, instrument) {
	const { [voice]: old, ...others } = songTab.parts;
	if (instrument === null) songTab.parts = others;
	else if (old?.instrument !== instrument)
		songTab.parts = { ...others, [voice]: { instrument, strings: {} } };
}

/**
 * Play this note on this string from now on.
 * @param {string} voice
 * @param {string} key the note's key
 * @param {number} string
 * @param {string[]} keysNow the part's notes now (choices for notes that are gone are dropped)
 */
export function chooseString(voice, key, string, keysNow) {
	const part = songTab.parts[voice];
	if (!part) return;
	const kept = Object.fromEntries(
		Object.entries(part.strings).filter(([each]) => keysNow.includes(each))
	);
	songTab.parts = { ...songTab.parts, [voice]: { ...part, strings: { ...kept, [key]: string } } };
}
