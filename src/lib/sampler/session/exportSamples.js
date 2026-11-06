/**
 * Export a session's kept takes as one .zip: each sample cut to its trim as
 * a 24-bit WAV (every mic, one channel each), plus manifest.json listing
 * them. Optionally the raw takes too, uncut, for reprocessing.
 *
 * WAV for now: the compressed format the app will ship (Opus, AAC or MP3)
 * is still to be chosen by testing on the iPhone (see the handoff note).
 */
import { encodeWav } from '$lib/arranger/export/wav.js';
import { makeZip } from '$lib/arranger/export/zip.js';
import { downloadFile } from '$lib/utils/downloadFile.js';
import { slugify } from '$lib/utils/slugify.js';
import { listTakes, readTakeAudio } from '$lib/storage/samplingSessions.js';
import { findChecklist, listTargets } from '../checklists/targets.js';
import { cutSample } from './cutSample.js';
import { MANIFEST_FORMAT, MANIFEST_VERSION, manifestEntry, sampleFileName } from './sampleFiles.js';

/**
 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
 * @param {{ includeRaw: boolean, onProgress?: (done: number, total: number) => void }} options
 * @returns {Promise<number>} how many samples went in
 */
export async function exportSamples(session, { includeRaw, onProgress }) {
	const checklist = findChecklist(session.checklistId);
	if (!checklist) throw new Error(`No checklist called “${session.checklistId}”`);
	const keptByTarget = new Map(
		(await listTakes(session.id)).filter((take) => take.kept).map((take) => [take.targetId, take])
	);
	const targets = listTargets(checklist).filter((target) => keptByTarget.has(target.id));

	/** @type {{ name: string, bytes: Uint8Array }[]} */
	const files = [];
	const samples = [];
	let sampleRate = 0;

	for (const [done, target] of targets.entries()) {
		onProgress?.(done, targets.length);
		const record = /** @type {import('$lib/storage/samplingSessions.js').TakeRecord} */ (
			keptByTarget.get(target.id)
		);
		const channels = await readTakeAudio(record.id);
		if (!channels) continue;
		sampleRate = record.sampleRate;

		const sample = cutSample(channels, record.analysis.trim, record.sampleRate);
		const name = sampleFileName(target);
		files.push({ name, bytes: encodeWav(sample, record.sampleRate) });
		if (includeRaw)
			files.push({ name: `raw/${name}`, bytes: encodeWav(channels, record.sampleRate) });
		samples.push(manifestEntry(target, record, sample[0]?.length ?? 0));
		// Let the page draw the progress between samples
		await new Promise((resolve) => setTimeout(resolve));
	}
	onProgress?.(targets.length, targets.length);

	const manifest = {
		format: MANIFEST_FORMAT,
		version: MANIFEST_VERSION,
		instrument: checklist.id,
		session: session.name,
		exportedAt: new Date().toISOString(),
		sampleRate,
		samples
	};
	files.unshift({
		name: 'manifest.json',
		bytes: new TextEncoder().encode(JSON.stringify(manifest, null, '\t'))
	});

	const date = new Date().toISOString().slice(0, 10);
	downloadFile(
		makeZip(files),
		`${slugify(session.name) || checklist.id}-samples-${date}.zip`,
		'application/zip'
	);
	return samples.length;
}
