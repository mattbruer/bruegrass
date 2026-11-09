/**
 * The looks the player card can wear, offered in Settings → Appearance.
 * Each id has its own block in hardware.css; a new look is one entry here
 * plus one block there.
 * @typedef {'walnut' | 'tapeDeck'} HardwareLook
 */

/** @type {readonly { id: HardwareLook, name: string }[]} */
export const HARDWARE_LOOKS = Object.freeze([
	{ id: 'walnut', name: 'Walnut receiver' },
	{ id: 'tapeDeck', name: 'Tape deck' }
]);

export const DEFAULT_HARDWARE_LOOK = /** @type {HardwareLook} */ ('walnut');
