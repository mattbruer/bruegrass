/**
 * The band's styles, as plain data. A song has one (`style`); everything that
 * differs between styles (voicings, strum patterns, bass) will look its
 * style up here, so a new style is one entry plus what it plays. The timing
 * engine and the sample sets are shared by every style.
 */

/** @typedef {{ id: string, name: string, about: string }} BandStyle */

/** @type {BandStyle[]} */
export const STYLES = [
	{ id: 'bluegrass', name: 'Bluegrass', about: 'Boom-chuck guitar, mandolin chop, upright bass.' },
	{ id: 'celtic', name: 'Celtic', about: 'Irish and Scottish tunes and songs.' }
];

export const DEFAULT_STYLE = 'bluegrass';

/**
 * Whatever was saved or chosen, as a style that exists.
 * @param {unknown} id
 */
export function validStyle(id) {
	return STYLES.some((style) => style.id === id) ? String(id) : DEFAULT_STYLE;
}
