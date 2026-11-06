/**
 * What the exported samples are called, and the manifest that lists them.
 * The app's sampler will read that same manifest, so this one file
 * describes the library: what each sample is, and which devices load it.
 *
 *   note/D-f05-hard-t2.wav     a string, fret, intensity and take
 *   dead/down-hard-t3.wav      a strum direction, intensity and take
 */

/** The manifest's format name and version: raise the version when its shape changes. */
export const MANIFEST_FORMAT = 'bruegrass-samples';
export const MANIFEST_VERSION = 1;

/**
 * Takes up to this number load everywhere; later takes only on a computer
 * (the iPhone's memory is the limit: see HANDOFF-sampling-session.md). The
 * one place that decides tiers.
 */
const TAKES_FOR_EVERY_DEVICE = 2;

/** @param {import('../checklists/targets.js').Target} target */
export function sampleFileName(target) {
	const take = `t${target.take}`;
	if (target.stringId !== null) {
		const fret = `f${String(target.fret ?? 0).padStart(2, '0')}`;
		return `${target.groupId}/${target.stringId}-${fret}-${target.intensity}-${take}.wav`;
	}
	return `${target.groupId}/${target.direction}-${target.intensity}-${take}.wav`;
}

/**
 * Which devices load a sample: 'all', or 'desktop' for the extra takes.
 * @param {import('../checklists/targets.js').Target} target
 */
export function sampleTier(target) {
	return target.take <= TAKES_FOR_EVERY_DEVICE ? 'all' : 'desktop';
}

/**
 * One manifest entry.
 * @param {import('../checklists/targets.js').Target} target
 * @param {import('$lib/storage/samplingSessions.js').TakeRecord} record
 * @param {number} frames the exported sample's length
 */
export function manifestEntry(target, record, frames) {
	const { analysis } = record;
	return {
		file: sampleFileName(target),
		group: target.groupId,
		string: target.stringId,
		fret: target.fret,
		midi: target.midi,
		direction: target.direction,
		intensity: target.intensity,
		take: target.take,
		tier: sampleTier(target),
		seconds: round(frames / record.sampleRate, 3),
		peakDb: round(analysis.peakDb, 1),
		cents: analysis.cents === null ? null : round(analysis.cents, 1)
	};
}

/**
 * @param {number} value
 * @param {number} places
 */
function round(value, places) {
	const scale = 10 ** places;
	return Math.round(value * scale) / scale;
}
