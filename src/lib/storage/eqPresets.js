/**
 * Saved EQ presets: one strip's EQ under a name ("Guitar – bright",
 * "Bass – less boom"), to put back on that strip, or any other, later.
 *
 * For the EQ of every strip at once, tuned for a speaker or pair of
 * headphones, see listeningSetups.js.
 */
import { savedCollection } from './collection.js';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   stripId: string,
 *   eq: import('$lib/audio/eq/eqBands.js').EqSettings,
 *   createdAt: string,
 *   updatedAt: string
 * }} EqPreset
 *   stripId: the strip it was saved from (a channel id, 'reverb' or
 *   'master'), so that strip can list it first; dates are ISO strings
 */

const presets = savedCollection('bruegrass.eqPresets');

export const listEqPresets = presets.list;
export const deleteEqPreset = presets.delete;

/**
 * Save a strip's EQ as a new preset.
 * @param {{ name: string, stripId: string, eq: EqPreset['eq'] }} fields
 * @returns {EqPreset}
 */
export function saveEqPreset(fields) {
	return presets.save(fields);
}
