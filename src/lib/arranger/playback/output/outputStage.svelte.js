/**
 * The output stage's controls that aren't saved with a song (the output
 * gain itself is in mixer.output, so it is): the level-matched comparison,
 * and matching the gain to the loudness target.
 */
import { mixer } from '../mixer.svelte.js';
import { MATCH_MIN_SECONDS, OUTPUT_GAIN_RANGE, TARGET_LUFS } from './outputSettings.js';

/** The A/B comparison (see setComparison in createOutputStage.js). Not saved: it's for listening. */
export const outputComparison = $state({
	comparing: false,
	/** While comparing: true = the original mix, false = through the output stage. */
	hearOriginal: false
});

/**
 * Set the output gain so the song plays at TARGET_LUFS, from the loudness
 * measured while it played. Gain changes are exact in loudness (the limiter
 * barely works at the target), so one step lands on it.
 * @param {import('./createOutputStage.js').OutputReadings | null} readings
 * @returns {{ ok: true, changeDb: number } | { ok: false, reason: string }}
 */
export function matchTargetLoudness(readings) {
	if (
		!readings ||
		readings.integratedSeconds < MATCH_MIN_SECONDS ||
		!isFinite(readings.integrated)
	) {
		return { ok: false, reason: `Play the song for at least ${MATCH_MIN_SECONDS} seconds first.` };
	}
	const wanted = mixer.output.gain + (TARGET_LUFS - readings.integrated);
	const gain = Math.round(clamp(wanted, OUTPUT_GAIN_RANGE.min, OUTPUT_GAIN_RANGE.max) * 10) / 10;
	const changeDb = gain - mixer.output.gain;
	mixer.output.gain = gain;
	return { ok: true, changeDb };
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
