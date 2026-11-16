/**
 * A section line's content as the chart reads it: inline fields first (so
 * the | in [M:C|] isn't read as a barline), then barlines, then chord text.
 * @param {string} content
 */
export function chartTokens(content) {
	return content.match(/\[[^\]]*\]|\||[^|[]+/g) ?? [];
}

/**
 * Whether the text before a barline is a bar: it has chords, or it's empty
 * between two barlines (`|G| |`), where the chord before carries on, as in
 * written music. Text before the first barline (fields) isn't one.
 * @param {boolean} hasChords
 * @param {boolean} afterBarline
 */
export function isBar(hasChords, afterBarline) {
	return hasChords || afterBarline;
}
