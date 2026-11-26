/**
 * The band's own bass line (instruments/bassline.js) written out as ABC,
 * so the piano roll can show it and an edit can start from it: one voice in
 * bass clef, concert pitch, the chart's bars in play order (no repeats, so
 * bar n is the chart's bar n), each bar with its chords as chord symbols.
 * The chord symbols are how a later chart change finds the bars it changed
 * (bassFollowsChart.js).
 *
 * A bass line written by hand from nothing (transcribed from a recording)
 * starts from a blank line instead (`blankBassAbc`), marked "as played" by
 * its first line: the chart's chords didn't write it, so a chart change never
 * rewrites its bars (state/bassFollowsChart.svelte.js).
 *
 * Pitches are written as bassline.js numbers them: the bass's open E is 40,
 * E,, in ABC. Like the guitar, it sounds an octave below.
 */
import { bandsBassLine } from './songBass.js';
import { barsInPlayOrder } from '../chart/chartBars.js';
import { scoreFromChart } from '../melody/roll/scoreFromChart.js';
import { newAbc } from '../melody/roll/scoreToAbc.js';
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';

/**
 * @typedef {{
 *   sections: import('../chart/timeline.js').Section[],
 *   songKey: import('../chart/key.js').Key | null,
 *   melodyKey: { spelling: import('../theory/musicInKey.js').Key, keyText: string }
 * }} BassSong what the bass line is written from (the melody's key is the concert key)
 */

/** The first line of a bass line written from nothing, by ear. */
const AS_PLAYED = '% bass as played';

/** @param {BassSong} song */
export function generatedBassAbc(song) {
	const { sections } = song;
	const notes = bandsBassLine(sections).map((note) => ({
		midi: note.pitch,
		start: Math.round(note.beat * TICKS_PER_QUARTER),
		length: Math.round(note.length * TICKS_PER_QUARTER)
	}));
	return bassAbcWith(song, notes);
}

/**
 * A bass line written by ear: the song's bars with nothing in them yet, or
 * with these notes (ticks from bar 1, as `generatedBassAbc` takes them).
 * @param {BassSong} song
 * @param {{ midi: number, start: number, length: number }[]} [notes]
 */
export function blankBassAbc(song, notes = []) {
	return `${AS_PLAYED}\n${bassAbcWith(song, notes)}`;
}

/**
 * Was this bass line written by ear from nothing (not from the band's own)?
 * @param {string} abc
 */
export function isAsPlayed(abc) {
	return abc.startsWith(AS_PLAYED);
}

/**
 * @param {BassSong} song
 * @param {import('../melody/roll/editNotes.js').DrawnNote[]} notes
 */
function bassAbcWith({ sections, songKey, melodyKey }, notes) {
	const { score, lineStarts } = scoreFromChart(
		barsInPlayOrder(sections),
		songKey,
		melodyKey.spelling
	);
	return newAbc(score, notes, {
		title: 'Bass',
		keyText: `${melodyKey.keyText} clef=bass`,
		lineStarts
	});
}
