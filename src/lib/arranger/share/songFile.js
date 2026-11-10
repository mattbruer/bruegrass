/**
 * A song file: one file to send someone, with everything a song needs on
 * another device, takes included. Inside it's a zip: `song.json` (the
 * package, songPackage.js) and each take's audio, named in the package.
 * Its own extension tells people to open it in the app (an iPhone's Files
 * app would unpack a .zip on a tap).
 */
import { makeZip, readZip } from '../export/zip.js';
import { readPackage, ShareProblem } from './songPackage.js';

export const SONG_FILE_EXTENSION = 'bluegrass';
export const SONG_FILE_TYPE = 'application/zip';
const PACKAGE_FILE = 'song.json';

/**
 * @param {import('./songPackage.js').SongPackage} songPackage
 * @param {{ name: string, bytes: Uint8Array }[]} audioFiles
 */
export function songFileBytes(songPackage, audioFiles) {
	const json = new TextEncoder().encode(JSON.stringify(songPackage));
	return makeZip([{ name: PACKAGE_FILE, bytes: json }, ...audioFiles]);
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<{ songPackage: import('./songPackage.js').SongPackage, files: Map<string, Uint8Array> }>}
 */
export async function readSongFile(bytes) {
	/** @type {Map<string, Uint8Array>} */
	let files;
	try {
		files = await readZip(bytes);
	} catch {
		throw new ShareProblem('This isn’t a song file from this app.');
	}
	const json = files.get(PACKAGE_FILE);
	if (!json) throw new ShareProblem('This isn’t a song file from this app.');
	const songPackage = readPackage(JSON.parse(new TextDecoder().decode(json)));
	const missing = songPackage.takes.filter((take) => !files.has(take.audio.file));
	if (missing.length > 0) throw new ShareProblem('This song file is missing some of its takes.');
	return { songPackage, files };
}
