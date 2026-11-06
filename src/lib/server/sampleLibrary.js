/**
 * The sample masters, kept as files in the project: samples-source/ at the
 * project root, one folder per sampling session. The /sampler page writes
 * here as each take is kept, so the recordings are safe on disk even if the
 * browser clears its storage.
 *
 * Not static/: these are full-quality masters (24-bit WAV, one channel per
 * mic), far too big to ship. The files the app plays will be made from them
 * later, once the mic blend and the compressed format are chosen. Kept out
 * of git (.gitignore); back the folder up yourself (iCloud, Drive…).
 *
 * Server-only, and only reached through the dev-only /sampler/files route.
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The masters' folder, at the project root. */
export const SAMPLES_SOURCE = 'samples-source';

const ROOT = fileURLToPath(new URL(`../../../${SAMPLES_SOURCE}/`, import.meta.url));

/** A folder or file name we write: letters, digits, dots, dashes, underscores. */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** The deepest a file sits inside a session's folder (raw/note/x.wav). */
const MAX_DEPTH = 3;

/**
 * Where a file goes, refusing anything that could escape the folder.
 * @param {string} folder a session's folder name
 * @param {string} [file] a path inside it, with / between parts
 */
function placeOf(folder, file = '') {
	const parts = file ? file.split('/') : [];
	if (!SAFE_NAME.test(folder) || parts.length > MAX_DEPTH || !parts.every((p) => SAFE_NAME.test(p)))
		throw new Error(`Not a sample path: ${folder}/${file}`);
	const place = resolve(ROOT, folder, ...parts);
	if (!place.startsWith(ROOT)) throw new Error(`Not a sample path: ${folder}/${file}`);
	return place;
}

/**
 * Write (or overwrite) one file in a session's folder.
 * @param {string} folder
 * @param {string} file
 * @param {Uint8Array} bytes
 */
export async function writeSampleFile(folder, file, bytes) {
	const place = placeOf(folder, file);
	await mkdir(dirname(place), { recursive: true });
	await writeFile(place, bytes);
}

/**
 * Remove the WAVs in a session's folder that aren't in `keep` (left over
 * when the checklist changed). Only .wav files: anything else you put in
 * the folder stays.
 * @param {string} folder
 * @param {string[]} keep paths inside the folder, with /
 * @returns {Promise<string[]>} what was removed
 */
export async function pruneSampleFiles(folder, keep) {
	const base = placeOf(folder);
	const wanted = new Set(keep);
	/** @type {string[]} */
	const removed = [];
	let entries;
	try {
		entries = await readdir(base, { recursive: true, withFileTypes: true });
	} catch {
		return removed; // nothing saved yet
	}
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith('.wav')) continue;
		const place = join(entry.parentPath, entry.name);
		const file = relative(base, place).split(sep).join('/');
		if (wanted.has(file)) continue;
		await rm(place);
		removed.push(file);
	}
	return removed;
}
