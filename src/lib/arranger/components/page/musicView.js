/**
 * What the arranger page shows: the chords scrolling past (the usual), the
 * tune on a piano roll to draw and edit, or the sheet music. One at a time,
 * since the roll and the sheet music have the chords on them too.
 */

/** @typedef {'chords' | 'roll' | 'sheet'} MusicView */

export const MUSIC_VIEWS = /** @type {const} */ ([
	{ id: 'chords', name: 'Chords' },
	{ id: 'roll', name: 'Piano roll' },
	{ id: 'sheet', name: 'Sheet music', needsTune: true }
]);

/**
 * The views there's something to show in (no sheet music without a tune).
 * @param {boolean} hasTune
 */
export function musicViewsFor(hasTune) {
	return MUSIC_VIEWS.filter((view) => hasTune || !('needsTune' in view));
}

/**
 * The chosen view, or the chords when it has nothing to show.
 * @param {MusicView} chosen
 * @param {boolean} hasTune
 * @returns {MusicView}
 */
export function shownMusicView(chosen, hasTune) {
	return musicViewsFor(hasTune).some((view) => view.id === chosen) ? chosen : 'chords';
}
