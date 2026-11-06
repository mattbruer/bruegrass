/**
 * Saving samples into the project, in samples-source/<folder>/ (the dev
 * server writes them: routes/sampler/files and $lib/server/sampleLibrary.js).
 * The same files as the zip export, always with the raw takes, because this
 * is the backup of the recordings, not just the cut samples.
 */
import { slugify } from '$lib/utils/slugify.js';
import { readTakeAudio } from '$lib/storage/samplingSessions.js';
import { breathe, listKeptSamples, manifestFile, sampleFiles } from './sampleSet.js';
import { sampleFileName } from './sampleFiles.js';

const ENDPOINT = '/sampler/files';

/** Shown to the user; matches SAMPLES_SOURCE in $lib/server/sampleLibrary.js. */
export const PROJECT_FOLDER_ROOT = 'samples-source';

/**
 * A session's folder: its name plus the start of its id, so two sessions
 * with the same name never share a folder.
 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
 */
export function projectFolder(session) {
	return `${slugify(session.name) || 'session'}-${session.id.slice(0, 6)}`;
}

/**
 * Save one kept take's files (cut and raw).
 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
 * @param {import('./sampleSet.js').KeptSample} sample
 */
export async function saveSampleToProject(session, sample) {
	const channels = await readTakeAudio(sample.record.id);
	if (!channels) throw new Error('the take’s audio is missing');
	for (const file of sampleFiles(sample, channels, { includeRaw: true }))
		await put(projectFolder(session), file);
}

/**
 * Save the manifest for every kept take.
 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
 * @param {import('../checklists/guitar.js').Checklist} checklist
 * @param {import('./sampleSet.js').KeptSample[]} samples
 */
export async function saveManifestToProject(session, checklist, samples) {
	await put(projectFolder(session), manifestFile(session, checklist, samples));
}

/**
 * Save everything again (for takes kept before this existed, or after a
 * failed save), and remove WAVs no longer in the checklist.
 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
 * @param {(done: number, total: number) => void} [onProgress]
 */
export async function saveAllToProject(session, onProgress) {
	const { checklist, samples } = await listKeptSamples(session);
	/** @type {string[]} */
	const keep = [];
	for (const [done, sample] of samples.entries()) {
		onProgress?.(done, samples.length);
		await saveSampleToProject(session, sample);
		const name = sampleFileName(sample.target);
		keep.push(name, `raw/${name}`);
		await breathe();
	}
	onProgress?.(samples.length, samples.length);
	await saveManifestToProject(session, checklist, samples);
	await prune(projectFolder(session), keep);
	return samples.length;
}

/**
 * @param {string} folder
 * @param {import('./sampleSet.js').SampleFile} file
 */
async function put(folder, { name, bytes }) {
	const query = new URLSearchParams({ folder, file: name, size: String(bytes.length) });
	const form = new FormData();
	form.append('bytes', new Blob([/** @type {BlobPart} */ (bytes)]));
	const response = await fetch(`${ENDPOINT}?${query}`, { method: 'PUT', body: form });
	if (!response.ok) {
		const { message } = await response.json().catch(() => ({ message: response.status }));
		throw new Error(`couldn’t write ${name}: ${message}`);
	}
}

/**
 * @param {string} folder
 * @param {string[]} keep
 */
async function prune(folder, keep) {
	const response = await fetch(`${ENDPOINT}?${new URLSearchParams({ folder })}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ keep })
	});
	if (!response.ok) throw new Error(`couldn’t tidy the folder (${response.status})`);
}
