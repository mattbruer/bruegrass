/**
 * Saved listening setups: the EQ of every strip at once, tuned for one
 * thing you listen on ("iPhone speaker", "AirPods", "MacBook speakers").
 *
 * Every speaker and pair of headphones sounds different, so a mix that's
 * right on one is thin or boomy on another. A setup is how you fix that
 * once and keep it. Each device remembers which setup it uses (see
 * thisDevice.js), and that setup's EQs go on every song you open there.
 */
import { savedCollection } from './collection.js';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   eqs: Record<string, import('$lib/audio/eq/eqBands.js').EqSettings>,
 *   createdAt: string,
 *   updatedAt: string
 * }} ListeningSetup
 *   eqs: each strip's EQ, by strip id (channel ids, 'reverb', 'master'); a
 *   strip that's missing (added after the setup was saved) stays as it is;
 *   dates are ISO strings
 */

const setups = savedCollection('bruegrass.listeningSetups');

export const listListeningSetups = setups.list;
export const getListeningSetup = setups.get;
export const deleteListeningSetup = setups.delete;

/**
 * Save a setup: a new one (no id) or changes to an existing one.
 * @param {{ id?: string, name: string, eqs: ListeningSetup['eqs'], createdAt?: string }} fields
 * @returns {ListeningSetup}
 */
export function saveListeningSetup(fields) {
	return setups.save(fields);
}
