/**
 * Export a session's kept takes as one .zip: the samples and manifest from
 * sampleSet.js, optionally with the raw takes too, for reprocessing.
 *
 * WAV for now: the compressed format the app will ship (Opus, AAC or MP3)
 * is still to be chosen by testing on the iPhone (see the handoff note).
 */
import { makeZip } from '$lib/arranger/export/zip.js';
import { downloadFile } from '$lib/utils/downloadFile.js';
import { slugify } from '$lib/utils/slugify.js';
import { readTakeAudio } from '$lib/storage/samplingSessions.js';
import { breathe, listKeptSamples, manifestFile, sampleFiles } from './sampleSet.js';

/**
 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
 * @param {{ includeRaw: boolean, onProgress?: (done: number, total: number) => void }} options
 * @returns {Promise<number>} how many samples went in
 */
export async function exportSamples(session, { includeRaw, onProgress }) {
	const { checklist, samples } = await listKeptSamples(session);

	/** @type {import('./sampleSet.js').SampleFile[]} */
	const files = [];
	/** @type {import('./sampleSet.js').KeptSample[]} */
	const written = [];
	for (const [done, sample] of samples.entries()) {
		onProgress?.(done, samples.length);
		const channels = await readTakeAudio(sample.record.id);
		if (!channels) continue;
		files.push(...sampleFiles(sample, channels, { includeRaw }));
		written.push(sample);
		await breathe();
	}
	onProgress?.(samples.length, samples.length);
	files.unshift(manifestFile(session, checklist, written));

	const date = new Date().toISOString().slice(0, 10);
	downloadFile(
		makeZip(files),
		`${slugify(session.name) || checklist.id}-samples-${date}.zip`,
		'application/zip'
	);
	return written.length;
}
