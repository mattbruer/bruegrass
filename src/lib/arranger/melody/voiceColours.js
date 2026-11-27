/**
 * Each part's colour, the same wherever it's drawn (the piano roll, the
 * Tracks lanes): a step round the colour wheel from the accent, which
 * theme/ui.css `voice-colour` turns into a colour. The melody is the accent,
 * the bass opposite it, each part you add its own; a generated line takes
 * its lead's, so a lead and the lines written from it read as one family.
 */
import { EXTRA_PARTS } from './extraParts.js';
import { BASS_VOICE } from '../bass/readBass.js';

/** The wheel turns this much per step (theme/ui.css `voice-colour`). */
const DEGREES_PER_STEP = 75;
/** The bass sits opposite the melody (0°) on the wheel. */
const BASS_HUE = 180;
/** Each added part's hue, by slot: clear of the melody's and the bass's, neighbours far apart. */
const PART_HUES = [75, 150, 255, 300, 30, 120, 210, 330, 60, 240, 105];

/**
 * @param {string} id a part (lane id)
 * @param {{ id: string, lead: string }[]} [generated] the tune's generated lines
 * @returns {number} steps round the wheel (`--voice`)
 */
export function voiceColour(id, generated = []) {
	const family = generated.find((part) => part.id === id)?.lead ?? id;
	return hueOf(family) / DEGREES_PER_STEP;
}

/** @param {string} id */
function hueOf(id) {
	if (id === BASS_VOICE) return BASS_HUE;
	const slot = EXTRA_PARTS.findIndex((part) => part.id === id);
	return slot >= 0 ? PART_HUES[slot % PART_HUES.length] : 0;
}
