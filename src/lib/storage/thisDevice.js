/**
 * Choices that belong to this device, not to you or your songs: which
 * listening setup this phone or laptop uses, and which audio input it
 * records from.
 *
 * Kept apart from everything else on purpose. When songs and setups sync
 * between devices through a database, this must not: the iPhone should keep
 * using "iPhone speaker" while the MacBook uses "MacBook speakers".
 */
import { readStored, writeStored } from './localStore.js';

const THIS_DEVICE_KEY = 'bruegrass.thisDevice';

/** @typedef {{ listeningSetupId: string | null, recordingInput: string | null }} DeviceChoices */

/** @returns {DeviceChoices} */
function readChoices() {
	const stored = readStored(THIS_DEVICE_KEY);
	/** @param {string} key */
	const text = (key) => (typeof stored?.[key] === 'string' ? stored[key] : null);
	return { listeningSetupId: text('listeningSetupId'), recordingInput: text('recordingInput') };
}

/** The listening setup this device uses, or null for none. */
export function thisDevicesListeningSetupId() {
	return readChoices().listeningSetupId;
}

/** @param {string | null} id the setup to use on this device, or null for none */
export function rememberThisDevicesListeningSetup(id) {
	writeStored(THIS_DEVICE_KEY, { ...readChoices(), listeningSetupId: id });
}

/**
 * The audio input this computer records from, by its name (e.g.
 * "UMC404HD 192k"): names survive a reboot and replugging better than the
 * browser's ids do. Null: the computer's default.
 */
export function thisDevicesRecordingInput() {
	return readChoices().recordingInput;
}

/** @param {string | null} label */
export function rememberThisDevicesRecordingInput(label) {
	writeStored(THIS_DEVICE_KEY, { ...readChoices(), recordingInput: label });
}
