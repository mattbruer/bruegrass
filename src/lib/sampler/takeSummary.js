/**
 * The numbers shown under a take: how long it is and how loud it peaked
 * on each mic (to set the interface's gain: the loudest hit should peak a
 * little under 0 dB, around -6 dBFS, never at it).
 */
import { peakLevel, toDecibels } from '$lib/arranger/playback/analysis/levels.js';

/** @param {import('$lib/recording/takeRecorder.js').Take} take */
export function summariseTake(take) {
	const frames = take.channels[0]?.length ?? 0;
	return {
		seconds: frames / take.sampleRate,
		peaksDb: take.channels.map((channel) => toDecibels(peakLevel(channel)))
	};
}

/** @param {number} db */
export function formatDb(db) {
	return Number.isFinite(db) ? `${db.toFixed(1)} dB` : 'silent';
}
