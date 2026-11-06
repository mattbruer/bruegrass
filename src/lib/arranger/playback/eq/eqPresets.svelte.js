/**
 * EQ presets: one strip's EQ saved under a name, to load onto that strip,
 * or any other, later. (For every strip at once, tuned for a speaker or
 * headphones, see listeningSetup.svelte.js.)
 *
 * A preset can go on any strip: a bright guitar EQ might suit the mandolin
 * too. Each strip lists the presets saved from it first.
 */
import { applyEq, stripWithEq } from '../mixer.svelte.js';
import { deleteEqPreset, listEqPresets, saveEqPreset } from '$lib/storage/eqPresets.js';

export const eqPresets = $state({
	/** Every saved preset, by name (refresh with refreshEqPresets). */
	all: /** @type {import('$lib/storage/eqPresets.js').EqPreset[]} */ ([])
});

export function refreshEqPresets() {
	eqPresets.all = listEqPresets();
}

/**
 * The presets to offer on a strip: the ones saved from it, then the rest.
 * @param {string} stripId
 */
export function presetsForStrip(stripId) {
	return {
		own: eqPresets.all.filter((preset) => preset.stripId === stripId),
		others: eqPresets.all.filter((preset) => preset.stripId !== stripId)
	};
}

/**
 * Save a strip's EQ as it is now, as a new preset.
 * @param {string} stripId
 * @param {string} name
 * @returns {string} the new preset's id
 */
export function saveStripAsPreset(stripId, name) {
	const saved = saveEqPreset({
		name: name.trim() || `${stripWithEq(stripId).name} EQ`,
		stripId,
		eq: $state.snapshot(stripWithEq(stripId).eq)
	});
	refreshEqPresets();
	return saved.id;
}

/**
 * Put a preset onto a strip's EQ.
 * @param {string} stripId
 * @param {string} presetId
 */
export function loadPresetOntoStrip(stripId, presetId) {
	const preset = eqPresets.all.find((each) => each.id === presetId);
	if (preset) applyEq(stripWithEq(stripId).eq, preset.eq);
}

/** @param {string} presetId */
export function deletePreset(presetId) {
	deleteEqPreset(presetId);
	refreshEqPresets();
}
