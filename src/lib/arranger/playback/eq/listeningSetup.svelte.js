/**
 * The listening setup this device uses: the EQ of every strip, tuned for
 * the speaker or headphones you're listening on, kept across every song.
 *
 * Why: every speaker and pair of headphones sounds different, so a mix that
 * sounds right on a MacBook is thin on an iPhone speaker and boomy in
 * AirPods. Rather than re-EQ every song on every device, you tune once for
 * what you're listening on, save it as a setup, and this device remembers it.
 *
 * While a setup is in use, the EQs belong to the setup, not to the song:
 *   - Opening a song (or New) leaves the EQs as they are; the song's own
 *     EQs are put aside, and saved back with the song unchanged.
 *   - Changing an EQ changes the setup. It's only kept when you save the
 *     setup (like songs, nothing saves by itself), and leaving the page asks
 *     first if there are changes.
 *   - Stopping the setup ("Each song's own EQ") puts the song's EQs back.
 * With no setup in use, EQs are saved with each song, as before.
 */
import {
	applyEq,
	applyEqs,
	applyMix,
	eqsSnapshot,
	mixSnapshot,
	resetMix
} from '../mixer.svelte.js';
import {
	deleteListeningSetup,
	getListeningSetup,
	listListeningSetups,
	saveListeningSetup
} from '$lib/storage/listeningSetups.js';
import {
	rememberThisDevicesListeningSetup,
	thisDevicesListeningSetupId
} from '$lib/storage/thisDevice.js';

/** Names offered when saving a new setup, so it's obvious what a setup is for. */
const SUGGESTED_SETUP_NAMES = Object.freeze([
	'iPhone speaker',
	'iPad speakers',
	'MacBook speakers',
	'AirPods',
	'Headphones',
	'Studio monitors',
	'Car'
]);

/**
 * The names to offer for a new setup: this device's own speaker first (a
 * good guess at what you're listening on), then the rest, leaving out names
 * already used.
 */
export function suggestedSetupNames() {
	const ownSpeaker = thisDevicesSpeaker();
	const ordered = ownSpeaker
		? [ownSpeaker, ...SUGGESTED_SETUP_NAMES.filter((name) => name !== ownSpeaker)]
		: [...SUGGESTED_SETUP_NAMES];
	return ordered.filter((name) => !listening.setups.some((setup) => setup.name === name));
}

export const listening = $state({
	/** The setup in use on this device, or null for each song's own EQ. */
	setup: /** @type {import('$lib/storage/listeningSetups.js').ListeningSetup | null} */ (null),
	/** Every saved setup (refresh with refreshSetups). */
	setups: /** @type {import('$lib/storage/listeningSetups.js').ListeningSetup[]} */ ([]),
	/** The open song's own EQs, put aside while a setup is in use. */
	songEqs: /** @type {Record<string, any> | null} */ (null)
});

/** Have the EQs changed since the setup in use was last saved? */
export function setupHasUnsavedChanges() {
	if (!listening.setup) return false;
	// Compare against the setup as it lands on the strips, so a setup saved
	// before a band or strip existed doesn't look changed
	return JSON.stringify(eqsSnapshot()) !== JSON.stringify(eqsAfterApplying(listening.setup.eqs));
}

/**
 * This device's own speaker, as a setup name, or null if we can't tell.
 * An iPad's Safari claims to be a Mac ("Macintosh" in its user agent), but
 * unlike a Mac it has a touch screen, which tells them apart.
 */
function thisDevicesSpeaker() {
	const agent = globalThis.navigator?.userAgent ?? '';
	const touchPoints = globalThis.navigator?.maxTouchPoints ?? 0;
	if (/iPhone/.test(agent)) return 'iPhone speaker';
	if (/iPad/.test(agent) || (/Macintosh/.test(agent) && touchPoints > 1)) return 'iPad speakers';
	if (/Macintosh/.test(agent)) return 'MacBook speakers';
	return null;
}

/** The question to ask before the setup's unsaved EQ changes are lost. */
export function setupDiscardQuestion() {
	return `Your EQ changes for “${listening.setup?.name}” haven’t been saved. Discard them?`;
}

/** Once the page is running in the browser: put this device's setup on, if it has one. */
export function startThisDevicesSetup() {
	refreshSetups();
	const id = thisDevicesListeningSetupId();
	const setup = id ? getListeningSetup(id) : null;
	if (setup) useSetup(setup);
	else if (id) rememberThisDevicesListeningSetup(null); // it was deleted on this device
}

/**
 * Use a saved setup on this device, from now on.
 * @param {string} id
 */
export function chooseSetup(id) {
	const setup = getListeningSetup(id);
	if (setup) useSetup(setup);
}

/** Stop using a setup on this device: each song's own EQs again. */
export function useEachSongsOwnEq() {
	if (listening.songEqs) applyEqs(listening.songEqs);
	listening.songEqs = null;
	listening.setup = null;
	rememberThisDevicesListeningSetup(null);
}

/**
 * Save the EQs as they are now as a new setup, and use it on this device.
 * @param {string} name
 */
export function saveAsNewSetup(name) {
	const saved = saveListeningSetup({ name: name.trim() || 'My setup', eqs: eqsSnapshot() });
	refreshSetups();
	useSetup(saved);
}

/** Save the EQs as they are now into the setup in use. */
export function saveSetupChanges() {
	if (!listening.setup) return;
	listening.setup = saveListeningSetup({ ...listening.setup, eqs: eqsSnapshot() });
	refreshSetups();
}

/**
 * Delete a saved setup. If it's the one in use, the EQs stay as they are,
 * now as the song's own.
 * @param {string} id
 */
export function deleteSetup(id) {
	deleteListeningSetup(id);
	if (listening.setup?.id === id) {
		listening.songEqs = null; // what you hear now becomes the song's EQ
		listening.setup = null;
		rememberThisDevicesListeningSetup(null);
	}
	refreshSetups();
}

export function refreshSetups() {
	listening.setups = listListeningSetups();
}

/**
 * Put a song's mix on the mixer, keeping the setup's EQs if one is in use.
 * Every way a song reaches the page (New, Open) goes through this.
 * @param {unknown} mix the song's saved mix, or null for the default mix
 */
export function applySongMix(mix) {
	const eqsInUse = listening.setup ? eqsSnapshot() : null;

	if (mix) applyMix(mix);
	else resetMix();

	if (eqsInUse) {
		listening.songEqs = eqsSnapshot();
		applyEqs(eqsInUse); // keep what you're hearing, unsaved tweaks included
	}
}

/**
 * The mix to save with the song: what's on the mixer, but with the song's
 * own EQs while a setup is in use (so the setup never leaks into songs,
 * and choosing a setup doesn't count as changing the song).
 */
export function songMixSnapshot() {
	const mix = mixSnapshot();
	if (!listening.songEqs) return mix;
	const songEqs = listening.songEqs;
	for (const channel of mix.channels) channel.eq = songEqs[channel.id] ?? channel.eq;
	mix.reverb.eq = songEqs.reverb ?? mix.reverb.eq;
	mix.master.eq = songEqs.master ?? mix.master.eq;
	return mix;
}

/** @param {import('$lib/storage/listeningSetups.js').ListeningSetup} setup */
function useSetup(setup) {
	if (!listening.setup) listening.songEqs = eqsSnapshot(); // put the song's EQs aside
	listening.setup = setup;
	applyEqs(setup.eqs);
	rememberThisDevicesListeningSetup(setup.id);
}

/**
 * What the strips' EQs would be with these saved EQs put on them, worked
 * out on plain copies (so nothing on the mixer changes).
 * @param {Record<string, unknown>} saved
 */
function eqsAfterApplying(saved) {
	const result = eqsSnapshot();
	for (const [stripId, eq] of Object.entries(result)) {
		if (saved[stripId]) applyEq(eq, saved[stripId]);
	}
	return result;
}
