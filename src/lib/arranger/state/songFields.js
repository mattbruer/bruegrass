/**
 * Moving a song between the page and a saved document: which fields a
 * song is made of, reading them off the page, and putting a song onto it.
 */
import { applyMix, mixSnapshot, resetMix } from '../playback/mixer.svelte.js';
import { validCapo } from '../chart/capo.js';

/**
 * @typedef {Pick<import('$lib/storage/arrangements.js').Arrangement,
 *   'arrangement' | 'abc' | 'tempo' | 'capo' | 'transpose' | 'mix'>} SongFields
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
		tempo: arranger.arrangement.bpm,
		capo: arranger.arrangement.capoFret,
		transpose: arranger.arrangement.transpose,
		mix: mixSnapshot()
	};
}

/**
 * Put a song on the page, replacing what's there: stop playing, show its
 * chart, melody and settings, use its mix, and loop the whole thing.
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

	if (song.mix) applyMix(song.mix);
	else resetMix();

	arranger.loop.loopEverything();
	arranger.chordReport = null;
}
