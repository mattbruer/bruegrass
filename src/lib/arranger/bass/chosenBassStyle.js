/**
 * The bass style chosen in Settings (instruments/bassStyles.js). The band's
 * own line is written in two places, bassPart (playback, export, MIDI,
 * tracks) and generatedBassAbc (the piano roll), and both ask here.
 * Read inside an effect or $derived, a change of style rewrites the line.
 */
import { settings } from '$lib/settings/settings.svelte.js';
import { bassStyle } from '../instruments/bassStyles.js';

export function chosenBassStyle() {
	return bassStyle(settings.bassStyle);
}
