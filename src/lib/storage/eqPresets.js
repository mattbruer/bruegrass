/**
 * Saved EQ presets: one strip's EQ under a name ("Guitar – bright",
 * "Bass – less boom"), to put back on that strip, or any other, later.
 *
 * For the EQ of every strip at once, tuned for a speaker or pair of
 * headphones, see listeningSetups.js.
 */
import { savedCollection } from './collection.js';

/** Bump when the document's shape changes, and migrate older ones in `upgrade`. */
export const EQ_PRESET_VERSION = 1;

/**
 * @typedef {{
 *   id: string,
 *   version: number,
 *   name: string,
 *   stripId: string,
 *   eq: import('$lib/arranger/playback/eq/eqBands.js').EqSettings,
 *   createdAt: string,
 *   updatedAt: string
 * }} EqPreset
 *   stripId: the strip it was saved from (a channel id, 'reverb' or
 *   'master'), so that strip can list it first; dates are ISO strings
 */

const presets = savedCollection('bruegrass.eqPresets', upgrade);

export const listEqPresets = presets.list;
export const deleteEqPreset = presets.delete;

/**
 * Save a strip's EQ as a new preset.
 * @param {{ name: string, stripId: string, eq: EqPreset['eq'] }} fields
 * @returns {EqPreset}
 */
export function saveEqPreset(fields) {
	return presets.save({ ...fields, version: EQ_PRESET_VERSION });
}

/**
 * @param {any} stored
 * @returns {EqPreset | null}
 */
function upgrade(stored) {
	if (!stored?.eq || typeof stored.eq !== 'object') return null;
	return {
		...stored,
		name: typeof stored.name === 'string' && stored.name ? stored.name : 'Untitled preset',
		stripId: typeof stored.stripId === 'string' ? stored.stripId : '',
		version: EQ_PRESET_VERSION
	};
}
