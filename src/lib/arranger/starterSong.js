/**
 * The song a brand-new arrangement starts with, so the page has something
 * to play straight away. It's what the arranger shows when you open it,
 * and what New starts from; your own songs open from the song bar.
 *
 * To change it, replace both: the chord chart (see chart/parseArrangement.js
 * for the format; the words under it are for the lyric chart) and the
 * melody in ABC notation. They should line up bar for bar; the "Write the
 * arrangement from these chords" button can make the chart from the ABC's
 * chord symbols.
 *
 * Amazing Grace: a traditional American melody ("New Britain", 1829) with
 * John Newton's 1779 words, both public domain. This transcription was
 * written for this app. The words under the melody were written from the
 * chart's words by the "Add the chart's words" button
 * (melody/words/abcWithWords.js).
 */

import { TEMPO_DEFAULT } from './chart/tempo.js';

export const STARTER_ARRANGEMENT = `
"Verse"[M:3/4]|G|G|C|G|G|G|D|D|G|G|C|G|G|D|G|G|
A-|ma-zing |grace, how |sweet the |sound that
|saved a |wretch like |me | I
|once was |lost, but |now am |found, was
|blind, but |now I |see | |
`;

export const STARTER_MELODY = `X:1
T:Amazing Grace
C:Traditional
R:waltz
M:3/4
L:1/4
K:G
D|"G"G2 B/G/|B2 A|"C"G2 E|"G"D2 D|G2 B/G/|B2 A|"D"d3-|d2 B/d/|
w: A-ma-zing _ grace, how sweet the sound that saved a _ wretch like me _ I _
"G"d2 B/G/|B2 A|"C"G2 E|"G"D2 D|G2 B/G/|"D"B2 A|"G"G3-|G2|]
w: once was _ lost, but now am found, was blind, but _ now I see _
`;

/**
 * Every field of the starter song, as a song document holds them (see
 * $lib/storage/arrangements.js). `mix: null` means the default mix.
 */
export const STARTER_SONG = Object.freeze({
	arrangement: STARTER_ARRANGEMENT,
	abc: STARTER_MELODY,
	tempo: TEMPO_DEFAULT,
	capo: 0,
	transpose: 0,
	mix: null
});
