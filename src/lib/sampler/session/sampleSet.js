/**
 * A session's kept samples as files: each take cut to its trim as a 24-bit
 * WAV (every mic, one channel each), optionally the raw take too, and the
 * manifest that lists them. The one place that turns takes into files, used
 * by both the zip export and the project folder (samples-source/).
 */
import { encodeWav } from '$lib/arranger/export/wav.js';
import { listTakes } from '$lib/storage/samplingSessions.js';
import { findChecklist, listTargets } from '../checklists/targets.js';
import { cutSample } from './cutSample.js';
import { MANIFEST_FORMAT, MANIFEST_VERSION, manifestEntry, sampleFileName } from './sampleFiles.js';

/**
 * @typedef {import('$lib/storage/samplingSessions.js').TakeRecord} TakeRecord
 * @typedef {import('../checklists/targets.js').Target} Target
 * @typedef {{ target: Target, record: TakeRecord }} KeptSample
 * @typedef {{ name: string, bytes: Uint8Array }} SampleFile
 */

/**
 * Every kept take in a session, in checklist order.
 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
 */
export async function listKeptSamples(session) {
	const checklist = findChecklist(session.checklistId);
	if (!checklist) throw new Error(`No checklist called “${session.checklistId}”`);
	const keptByTarget = new Map(
		(await listTakes(session.id)).filter((take) => take.kept).map((take) => [take.targetId, take])
	);
	/** @type {KeptSample[]} */
	const samples = listTargets(checklist).flatMap((target) => {
		const record = keptByTarget.get(target.id);
		return record ? [{ target, record }] : [];
	});
	return { checklist, samples };
}

/**
 * One take's files: the cut sample, and the uncut take under raw/ if asked.
 * @param {KeptSample} sample
 * @param {Float32Array[]} channels the take's audio
 * @param {{ includeRaw: boolean }} options
 * @returns {SampleFile[]}
 */
export function sampleFiles({ target, record }, channels, { includeRaw }) {
	const name = sampleFileName(target);
	const cut = cutSample(channels, record.analysis.trim, record.sampleRate);
	const files = [{ name, bytes: encodeWav(cut, record.sampleRate) }];
	if (includeRaw)
		files.push({ name: `raw/${name}`, bytes: encodeWav(channels, record.sampleRate) });
	return files;
}

/**
 * manifest.json for a set of samples.
 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
 * @param {import('../checklists/guitar.js').Checklist} checklist
 * @param {KeptSample[]} samples
 * @returns {SampleFile}
 */
export function manifestFile(session, checklist, samples) {
	const manifest = {
		format: MANIFEST_FORMAT,
		version: MANIFEST_VERSION,
		instrument: checklist.id,
		session: session.name,
		exportedAt: new Date().toISOString(),
		sampleRate: samples[0]?.record.sampleRate ?? 0,
		samples: samples.map(({ target, record }) =>
			manifestEntry(target, record, record.analysis.trim.end - record.analysis.trim.start)
		)
	};
	return {
		name: 'manifest.json',
		bytes: new TextEncoder().encode(JSON.stringify(manifest, null, '\t'))
	};
}

/** Let the page draw (progress, buttons) between samples. */
export const breathe = () => new Promise((resolve) => setTimeout(resolve));
