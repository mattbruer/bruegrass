/**
 * Keep the arrangement saved: put back the saved work when the page opens,
 * then save changes as you go (after a pause in typing, and on leaving the
 * page or closing the tab, so a last-second edit isn't lost).
 *
 * Saving goes through $lib/storage, which decides where it's kept.
 */
import { onMount } from 'svelte';
import {
	createArrangement,
	currentArrangement,
	saveArrangement
} from '$lib/storage/arrangements.js';
import { applyMix, mixSnapshot } from '../playback/mixer.svelte.js';
import { validCapo } from '../chart/capo.js';

/** Wait this long after the last change before saving. */
const SAVE_DELAY_MS = 400;

/**
 * Call once while the arranger page is being set up.
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 */
export function keepArrangementSaved(arranger) {
	/** The saved document this page is editing (it keeps its id and creation date). */
	let savedDocument = createArrangement();
	/** Restored work is back on the page (until then, nothing is saved over it). */
	let restored = $state(false);
	/** The last fields saved, to skip saving when nothing changed. */
	let lastSaved = '';
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let saveTimer;
	/** @type {(() => void) | null} */
	let saveWaiting = null;

	function saveNow() {
		clearTimeout(saveTimer);
		saveWaiting?.();
	}

	onMount(() => {
		const saved = currentArrangement();
		if (saved) {
			putBack(arranger, saved);
			savedDocument = saved;
		}
		restored = true;

		window.addEventListener('pagehide', saveNow); // closing the tab
		return () => {
			saveNow(); // going to another page in the app
			window.removeEventListener('pagehide', saveNow);
		};
	});

	$effect(() => {
		if (!restored) return;

		const fields = fieldsToSave(arranger);
		const fieldsText = JSON.stringify(fields);

		const firstLook = lastSaved === ''; // just what was restored: nothing new to save
		if (firstLook) lastSaved = fieldsText;
		if (fieldsText === lastSaved) return;

		saveWaiting = () => {
			savedDocument = saveArrangement({ ...savedDocument, ...fields });
			lastSaved = fieldsText;
			saveWaiting = null;
		};
		clearTimeout(saveTimer);
		saveTimer = setTimeout(saveNow, SAVE_DELAY_MS);
	});
}

/**
 * What's saved: the arrangement's document fields (see $lib/storage/arrangements.js).
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 */
function fieldsToSave(arranger) {
	return {
		title: arranger.title,
		arrangement: arranger.arrangement.text,
		abc: arranger.melody.notation,
		tempo: arranger.arrangement.bpm,
		capo: arranger.arrangement.capoFret,
		transpose: arranger.arrangement.transpose,
		mix: mixSnapshot()
	};
}

/**
 * Put saved work back on the page.
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 * @param {import('$lib/storage/arrangements.js').Arrangement} saved
 */
function putBack(arranger, saved) {
	arranger.arrangement.text = saved.arrangement;
	arranger.arrangement.tempo = saved.tempo;
	arranger.arrangement.capo = validCapo(saved.capo);
	arranger.arrangement.transpose = saved.transpose;
	arranger.melody.notation = saved.abc;
	applyMix(saved.mix);
}
