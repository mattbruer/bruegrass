/**
 * Moving a song between the page and a saved document: which fields a
 * song is made of, reading them off the page, and putting a song onto it.
 */
import { applySongMix, songMixSnapshot } from '../playback/eq/listeningSetup.svelte.js';
import { validCapo } from '../chart/capo.js';
import { songBassStyle } from '../bass/songBassStyle.svelte.js';
import { DEFAULT_BASS_STYLE } from '../instruments/bassStyles.js';

/**
 * @typedef {Pick<import('$lib/storage/arrangements.js').Arrangement,
 *   'arrangement' | 'abc' | 'bass' | 'bassStyle' | 'tempo' | 'capo' | 'transpose' | 'mix'>} SongFields
 *   what a song is made of (its name is kept separately)
 */

/**
 * The song as it is on the page now.
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 * @returns {SongFields}
 */
export function readSongFields(arranger) {
	return {
		arrangement: arranger.arrangement.text,
		abc: arranger.melody.notation,
		bass: arranger.bass.notation,
		bassStyle: songBassStyle.id,
		tempo: arranger.arrangement.bpm,
		capo: arranger.arrangement.capoFret,
		transpose: arranger.arrangement.transpose,
		mix: songMixSnapshot() // the song's own EQs, even while a listening setup is in use
	};
}

/**
 * Put a song on the page, replacing what's there: stop playing, show its
 * chart, melody and settings, use its mix (except the EQs, if this device
 * uses a listening setup), and loop the whole thing.
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 * @param {SongFields} song
 */
export function loadSongIntoPage(arranger, song) {
	arranger.player.stop();

	arranger.arrangement.text = song.arrangement;
	arranger.arrangement.tempo = song.tempo;
	arranger.arrangement.capo = validCapo(song.capo);
	arranger.arrangement.transpose = song.transpose;
	arranger.melody.notation = song.abc;
	arranger.bass.notation = song.bass ?? ''; // drafts from before the bass could be edited
	songBassStyle.id = song.bassStyle ?? DEFAULT_BASS_STYLE; // examples, and drafts from before

	applySongMix(song.mix); // keeps this device's listening setup on, if it has one

	arranger.loop.loopEverything();
	arranger.conversionReport = null;
}
