/**
 * The band's styles, as plain data. A song has one (`style`); everything that
 * differs between styles looks it up here, so a new style is one entry plus
 * what it plays. The timing engine and the sample sets are shared by every
 * style.
 *
 * times: the time signatures the style offers (the chart can hold any);
 * voicing: the style's own generator, a chord name to the guitar's shape.
 */
import { bluegrassShape } from './bluegrass/bluegrassVoicing.js';
import { celticShape } from './celtic/celticVoicing.js';

/**
 * @typedef {(number | null)[]} Shape six frets, low E to high e, null = muted
 * @typedef {{
 *   id: string, name: string, about: string, times: string[],
 *   voicing: (chord: string) => Shape | null
 * }} BandStyle
 */

/** @type {BandStyle[]} */
export const STYLES = [
	{
		id: 'bluegrass',
		name: 'Bluegrass',
		about: 'Boom-chuck guitar, mandolin chop, upright bass.',
		times: ['4/4', '3/4', '2/4', '2/2', '5/4', '6/4'],
		voicing: bluegrassShape
	},
	{
		id: 'celtic',
		name: 'Celtic',
		about: 'Irish and Scottish tunes and songs.',
		times: ['4/4', '3/4', '2/4', '6/8', '9/8', '12/8'],
		voicing: celticShape
	}
];

export const DEFAULT_STYLE = 'bluegrass';

/**
 * A style by id (the default for one that doesn't exist).
 * @param {unknown} id
 */
export function styleOf(id) {
	return STYLES.find((style) => style.id === id) ?? STYLES[0];
}

/**
 * Whatever was saved or chosen, as a style that exists.
 * @param {unknown} id
 */
export function validStyle(id) {
	return styleOf(id).id;
}
