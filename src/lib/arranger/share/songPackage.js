/**
 * A song packed to travel to another device: the one shape both a share
 * link and a song file carry, so the app on the other end can put back
 * exactly what was sent. Plain data, no audio: a song file keeps each
 * take's audio beside it (songFile.js), named by `audio.file`.
 */

export const PACKAGE_KIND = 'bluegrass-song';

/**
 * @typedef {import('./takeFormat.js').TakeAudio} TakeAudio
 * @typedef {Omit<import('$lib/storage/arrangements.js').Arrangement, 'id' | 'createdAt' | 'updatedAt'>
 *   & { id: string | null }} SharedSong
 *   id: the song's id on the sender's device (null: never saved), so sending it again updates the copy
 * @typedef {Omit<import('$lib/storage/songTakes.js').TakeDocument, 'songId'> & { audio: TakeAudio }} SharedTake
 * @typedef {{
 *   kind: typeof PACKAGE_KIND,
 *   song: SharedSong,
 *   takes: SharedTake[]
 * }} SongPackage
 *   takes: every take (the one in use on each track says so), each with where its audio is in a song file
 */

/** A problem with what was received, worded for the person receiving it. */
export class ShareProblem extends Error {}

/**
 * @param {SharedSong} song
 * @param {SharedTake[]} takes
 * @returns {SongPackage}
 */
export function makePackage(song, takes) {
	return { kind: PACKAGE_KIND, song, takes };
}

/**
 * Check something received is a song this app can open.
 * @param {any} value parsed JSON
 * @returns {SongPackage}
 */
export function readPackage(value) {
	if (value?.kind !== PACKAGE_KIND || typeof value.song?.arrangement !== 'string') {
		throw new ShareProblem('This isn’t a song from this app.');
	}
	return value;
}
