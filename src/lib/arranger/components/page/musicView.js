/**
 * What the arranger page shows: the chords scrolling past, or the sheet
 * music. Never both, since the sheet music has the chords on it too.
 */

/** @typedef {'chords' | 'sheet'} MusicView */

export const MUSIC_VIEWS = /** @type {const} */ ([
	{ id: 'chords', name: 'Chords' },
	{ id: 'sheet', name: 'Sheet music' }
]);

/**
 * The chosen view, or the chords when there's no tune to show.
 * @param {MusicView} chosen
 * @param {boolean} hasTune
 * @returns {MusicView}
 */
export function shownMusicView(chosen, hasTune) {
	return hasTune ? chosen : 'chords';
}
