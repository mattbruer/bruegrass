/**
 * Moving a song between the page and a saved document: which fields a
 * song is made of, reading them off the page, and putting a song onto it.
 */
import { applySongMix, songMixSnapshot } from '../mixer/listeningSetup.svelte.js';
import { validCapo } from '../chart/capo.js';
import { validSwing } from '../chart/swing.js';
import { validStyle } from '../styles/styles.js';
import { validTempoCurve } from '../chart/tempoCurve.js';
import { songTab, tabSnapshot } from '../tab/songTab.svelte.js';
import { validVideo } from '../video/songVideo.js';

/**
 * @typedef {Pick<import('$lib/storage/arrangements.js').Arrangement,
 *   'arrangement' | 'abc' | 'tune' | 'bass' | 'bassTune' | 'tab' | 'partNames' | 'laneOrder' | 'audioClips' | 'chops' | 'guitarChords' | 'video' | 'recording' | 'madeFrom' | 'tempo' | 'tempoCurve' | 'swing' | 'style' | 'capo' | 'transpose' | 'mix'>} SongFields
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
		tab: tabSnapshot(),
		partNames: arranger.song.partNames,
		laneOrder: arranger.song.laneOrder,
		audioClips: arranger.song.audioClips,
		chops: arranger.song.chops,
		guitarChords: arranger.song.guitarChords,
		video: arranger.song.video,
		reference: arranger.song.reference,
		madeFrom: arranger.song.madeFrom,
		tempo: arranger.arrangement.bpm,
		tempoCurve: arranger.arrangement.tempoCurve,
		swing: arranger.arrangement.swing,
		style: arranger.arrangement.style,
		capo: arranger.arrangement.capoFret,
		transpose: arranger.arrangement.transpose,
		mix: songMixSnapshot() // the song's own EQs, even while a listening setup is in use
	};
}

/**
 * Put a song on the page, replacing what's there: stop playing, show its
 * chart, melody and settings, use its mix (except the EQs, if this device
 * uses a listening setup), and loop the whole thing. Examples and the
 * starter song leave out the fields they don't use; those get their defaults.
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 * @param {SongFields} song
 */
export function loadSongIntoPage(arranger, song) {
	arranger.player.stop();
	arranger.player.toStart();

	arranger.songsLoaded += 1; // another song's chart: nothing to follow from the last one's
	arranger.arrangement.text = song.arrangement;
	arranger.arrangement.tempo = song.tempo;
	arranger.arrangement.swing = validSwing(song.swing);
	arranger.arrangement.style = validStyle(song.style);
	arranger.arrangement.tempoCurve = validTempoCurve(song.tempoCurve);
	arranger.arrangement.capo = validCapo(song.capo);
	arranger.arrangement.transpose = song.transpose;
	arranger.melody.load(song.abc, song.tune ?? null);
	arranger.bass.load(song.bass ?? '', song.bassTune ?? null);
	songTab.parts = song.tab ?? {};
	arranger.song.partNames = song.partNames ?? {};
	arranger.song.laneOrder = song.laneOrder ?? [];
	arranger.song.audioClips = song.audioClips ?? {};
	arranger.song.chops = song.chops ?? {};
	arranger.song.guitarChords = song.guitarChords ?? {};
	arranger.song.video = validVideo(song.video);
	arranger.history.clear(); // another song: nothing to undo
	arranger.song.reference = song.reference ?? null;
	arranger.song.madeFrom = song.madeFrom ?? null;

	applySongMix(song.mix); // keeps this device's listening setup on, if it has one

	arranger.loop.loopEverything();
	arranger.conversionReport = null;
}
