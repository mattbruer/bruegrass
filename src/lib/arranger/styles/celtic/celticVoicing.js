/**
 * Celtic's guitar shapes for a chord. Its own generator, because Celtic
 * accompaniment doesn't think about harmony the way bluegrass does. For now
 * it hands the chord to the bluegrass generator so the band still plays;
 * replace the body, and nothing else changes.
 */
import { bluegrassShape } from '../bluegrass/bluegrassVoicing.js';

/**
 * @param {string} chord a plain chord name, no slash bass or variant
 * @returns {import('../styles.js').Shape | null}
 */
export function celticShape(chord) {
	return bluegrassShape(chord);
}
