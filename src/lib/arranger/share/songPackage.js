/**
 * A song packed to travel to another device: the one shape both a share
 * link and a song file carry, so the app on the other end can put back
 * exactly what was sent. Plain data, no audio: a song file keeps each
 * take's audio beside it (songFile.js), named by `audio.file`.
 *
 * Raise PACKAGE_VERSION and convert in `readPackage` when the shape changes.
 */
import { ARRANGEMENT_VERSION } from '$lib/storage/arrangements.js';

export const PACKAGE_KIND = 'bluegrass-song';
export const PACKAGE_VERSION = 1;

/**
 * @typedef {import('./takeFormat.js').TakeAudio} TakeAudio
 * @typedef {Omit<import('$lib/storage/arrangements.js').Arrangement, 'id' | 'createdAt' | 'updatedAt'>
 *   & { id: string | null }} SharedSong
 *   id: the song's id on the sender's device (null: never saved), so sending it again updates the copy
 * @typedef {Omit<import('$lib/storage/songTakes.js').TakeDocument, 'songId'> & { audio: TakeAudio }} SharedTake
 * @typedef {{ name: string, frets: (number | null)[] }} SharedChord
 * @typedef {{
 *   kind: typeof PACKAGE_KIND,
 *   version: number,
 *   song: SharedSong,
 *   chords: SharedChord[],
 *   takes: SharedTake[]
 * }} SongPackage
 *   chords: the sender's own shapes (My chords) that the song uses, or it wouldn't play;
 *   takes: the takes in use, each with where its audio is in a song file
 */

/** A problem with what was received, worded for the person receiving it. */
export class ShareProblem extends Error {}

/**
 * @param {SharedSong} song
 * @param {SharedChord[]} chords
 * @param {SharedTake[]} takes
 * @returns {SongPackage}
 */
export function makePackage(song, chords, takes) {
	return { kind: PACKAGE_KIND, version: PACKAGE_VERSION, song, chords, takes };
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
	if (value.version > PACKAGE_VERSION || value.song.version > ARRANGEMENT_VERSION) {
		throw new ShareProblem(
			'This song was sent from a newer version of the app. Reload the page to update, then try again.'
		);
	}
	return {
		...value,
		chords: Array.isArray(value.chords) ? value.chords : [],
		takes: Array.isArray(value.takes) ? value.takes : []
	};
}
