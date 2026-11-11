/**
 * The stretcher's sound choices, named for what you hear. Each is a frame
 * length: short frames keep fast picking crisp, long ones keep held notes
 * and the bass smooth. A new choice is one entry.
 */
export const SOUNDS = Object.freeze([
	{ id: 'crisp', name: 'Crisp', frameSeconds: 0.023 },
	{ id: 'balanced', name: 'Balanced', frameSeconds: 0.046 },
	{ id: 'smooth', name: 'Smooth', frameSeconds: 0.093 }
]);

export const DEFAULT_SOUND = 'balanced';

/**
 * The sound with this id, or the default for an unknown one (an old saved setting).
 * @param {string} id
 */
export function soundById(id) {
	return SOUNDS.find((sound) => sound.id === id) ?? SOUNDS.find((s) => s.id === DEFAULT_SOUND);
}
