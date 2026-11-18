/**
 * Moving a song between the page and a saved document: which fields a
 * song is made of, reading them off the page, and putting a song onto it.
 */
import { applySongMix, songMixSnapshot } from '../mixer/listeningSetup.svelte.js';
import { validCapo } from '../chart/capo.js';
import { validSwing } from '../chart/swing.js';
import { validTempoCurve } from '../chart/tempoCurve.js';
import { songBassStyle } from '../bass/songBassStyle.svelte.js';
import { DEFAULT_BASS_STYLE } from '../instruments/bassStyles.js';
import { songTab, tabSnapshot } from '../tab/songTab.svelte.js';

/**
 * @typedef {Pick<import('$lib/storage/arrangements.js').Arrangement,
 *   'arrangement' | 'abc' | 'tune' | 'bass' | 'bassTune' | 'bassStyle' | 'tab' | 'recording' | 'madeFrom' | 'tempo' | 'tempoCurve' | 'swing' | 'capo' | 'transpose' | 'mix'>} SongFields
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
		tune: arranger.melody.bySection,
		bass: arranger.bass.notation,
		bassTune: arranger.bass.bySection,
		bassStyle: songBassStyle.id,
		tab: tabSnapshot(),
		recording: arranger.song.recording,
		madeFrom: arranger.song.madeFrom,
		tempo: arranger.arrangement.bpm,
		tempoCurve: arranger.arrangement.tempoCurve,
		swing: arranger.arrangement.swing,
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

	arranger.songsLoaded += 1; // another song's chart: nothing to follow from the last one's
	arranger.arrangement.text = song.arrangement;
	arranger.arrangement.tempo = song.tempo;
	arranger.arrangement.swing = validSwing(song.swing); // examples, and drafts from before
	arranger.arrangement.tempoCurve = validTempoCurve(song.tempoCurve);
	arranger.arrangement.capo = validCapo(song.capo);
	arranger.arrangement.transpose = song.transpose;
	arranger.melody.load(song.abc, song.tune ?? null); // songs from before the tune could be kept by section
	arranger.bass.load(song.bass ?? '', song.bassTune ?? null); // drafts from before the bass could be edited, or kept by section
	songBassStyle.id = song.bassStyle ?? DEFAULT_BASS_STYLE; // examples, and drafts from before
	songTab.parts = song.tab ?? {};
	arranger.song.recording = song.recording ?? null; // examples, and songs from before
	arranger.song.madeFrom = song.madeFrom ?? null;

	applySongMix(song.mix); // keeps this device's listening setup on, if it has one

	arranger.loop.loopEverything();
	arranger.conversionReport = null;
}
