/**
 * Choices that belong to this device, not to you or your songs: which
 * listening setup this phone or laptop uses.
 *
 * Kept apart from everything else on purpose. When songs and setups sync
 * between devices through a database, this must not: the iPhone should keep
 * using "iPhone speaker" while the MacBook uses "MacBook speakers".
 */
import { readStored, writeStored } from './localStore.js';

const THIS_DEVICE_KEY = 'bruegrass.thisDevice';

/** @typedef {{ listeningSetupId: string | null }} DeviceChoices */

/** @returns {DeviceChoices} */
function readChoices() {
	const stored = readStored(THIS_DEVICE_KEY);
	return {
		listeningSetupId: typeof stored?.listeningSetupId === 'string' ? stored.listeningSetupId : null
	};
}

/** The listening setup this device uses, or null for none. */
export function thisDevicesListeningSetupId() {
	return readChoices().listeningSetupId;
}

/** @param {string | null} id the setup to use on this device, or null for none */
export function rememberThisDevicesListeningSetup(id) {
	writeStored(THIS_DEVICE_KEY, { ...readChoices(), listeningSetupId: id });
}
