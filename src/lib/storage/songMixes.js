/**
 * Each song's mix (faders, pans, sends, reverb, EQs) as you last left it on
 * this device, so a refresh doesn't put it back to the default. The song
 * document keeps the mix too, but only when you press Save; this is the
 * everyday memory between saves.
 *
 * Keyed by the song's id. A song that hasn't been saved yet has no id, so it
 * shares one key (the page always opens on one such song).
 *
 * Pages only go through these functions. Today it's localStorage; when songs
 * move to a database this becomes a field on the song (or a per-user
 * document) with the same three calls.
 */
import { readStored, writeStored } from './localStore.js';

const MIXES_KEY = 'bruegrass.songMixes';
const UNSAVED_SONG = 'unsaved';

/** @param {string | null} songId */
const keyFor = (songId) => songId ?? UNSAVED_SONG;

/** @returns {Record<string, object>} */
function allMixes() {
	const stored = readStored(MIXES_KEY);
	return stored && typeof stored === 'object' ? stored : {};
}

/**
 * The mix remembered for a song, or null.
 * @param {string | null} songId null for the song that hasn't been saved
 * @returns {object | null}
 */
export function readSongMix(songId) {
	return allMixes()[keyFor(songId)] ?? null;
}

/**
 * @param {string | null} songId null for the song that hasn't been saved
 * @param {object} mix
 */
export function writeSongMix(songId, mix) {
	writeStored(MIXES_KEY, { ...allMixes(), [keyFor(songId)]: mix });
}

/** @param {string | null} songId null for the song that hasn't been saved */
export function forgetSongMix(songId) {
	const mixes = allMixes();
	delete mixes[keyFor(songId)];
	writeStored(MIXES_KEY, mixes);
}
