/**
 * The piano roll's way in and out of the tune's ABC: the melody and each
 * added part, every one a voice the roll shows. The open tune is read in
 * MelodyState; these take what it read.
 *
 * Writing a voice rewrites the drawn bars, then brings the rest along:
 * under the melody, its words are placed again on the new notes (when the
 * chart has the words), and the lines generated from the voice are written
 * fresh in the changed bars only. A generated line's changed bars are locked.
 */
import { tuneReader } from '../abcjs.js';
import { readScore } from './readScore.js';
import { changedBars, newAbc, rewriteAbc, withKeySignature } from './scoreToAbc.js';
import { withFreshHarmonyBars } from './freshHarmonyBars.js';
import { generatedParts, isGenerated } from '../harmony/generatedParts.js';
import { withBarsKept } from '../harmony/keptBars.js';
import { withChartWordsAgain } from '../words/wordsAgain.js';
import { MELODY_CHANNEL, voiceChannels } from '../harmony/partChannels.js';
import { ownName } from '../partNames.js';
import { concertChordAt } from '../../chart/concertChords.js';
import { transposed } from './octaves.js';

/**
 * @typedef {import('./readScore.js').Score} Score
 * @typedef {import('./editNotes.js').DrawnNote} DrawnNote
 * @typedef {{ id: string, name: string, score: Score, problem: string }} DrawnVoice
 *   id: its channel (MELODY_CHANNEL, a harmony part's or an extra part's id)
 * @typedef {{
 *   sections: import('../../chart/timeline.js').Section[],
 *   lyrics: import('../../chart/sectionLyrics.js').SectionLyrics[]
 * }} Song what the words and harmony parts are written from
 */

/**
 * @param {string} abc
 * @param {import('abcjs').TuneObject} tune abcjs's parse of this ABC
 * @returns {DrawnVoice[] | null} the melody first; null when the ABC has no music yet
 */
export function readVoices(abc, tune) {
	const voices = voiceChannels(tune).map((id, index) => ({
		id,
		name: ownName(id),
		...readScore(abc, tune, index)
	}));
	return voices[0] && voices[0].score.bars.length > 0 ? voices : null;
}

/**
 * The ABC with one voice's notes as drawn.
 * @param {{
 *   abc: string, voice: string, score: Score, notes: DrawnNote[], song: Song,
 *   newTune?: { title: string, keyText: string, lineStarts: Map<number, string> } | null,
 *   abcjs?: any
 * }} change voice: which one was drawn; newTune: write a whole tune (the
 *   score came from the chart); abcjs: to bring words and harmony along
 *   (not needed for a new tune)
 */
export function writeDrawnMelody({ abc, voice, score, notes, song, newTune = null, abcjs }) {
	if (newTune) return newAbc(score, notes, newTune);
	const written = rewriteAbc(abc, score, notes);
	if (!abcjs) return written;

	const parse = readingEachOnce(tuneReader(abcjs));
	// Your change to a generated line locks its bars, so the line never writes over it
	if (isGenerated(generatedParts(written), voice)) {
		return withVoiceBarsKept(written, parse, voice, changedBars(score, notes));
	}
	let text = voice === MELODY_CHANNEL ? withChartWordsAgain(written, song, abcjs, parse) : written;
	if (song.sections.length > 0) {
		const chordAt = concertChordAt(song.sections);
		text = withFreshHarmonyBars(text, parse, chordAt, voice, changedBars(score, notes));
	}
	return text;
}

/**
 * The ABC with some bars of one voice locked (harmony/keptBars.js).
 * @param {string} abc
 * @param {(abc: string) => any} parse
 * @param {string} voice
 * @param {Iterable<number>} bars
 */
export function withVoiceBarsKept(abc, parse, voice, bars) {
	const tune = parse(abc);
	const index = tune ? voiceChannels(tune).indexOf(voice) : -1;
	if (index < 0) return abc;
	return withBarsKept(abc, readScore(abc, tune, index).score.bars, bars, true);
}

/**
 * The same tune spelled in another key: every voice, pitches unchanged.
 * @param {string} abc
 * @param {DrawnVoice[]} voices read from this ABC
 * @param {{ keyText: string, spelling: import('../../theory/musicInKey.js').Key }} key
 */
export function respellDrawnMelody(abc, voices, key) {
	let text = abc;
	// The last voice first, so the earlier ones' places in the text still hold
	for (const { score } of [...voices].reverse()) {
		text = rewriteAbc(text, { ...score, key: key.spelling }, score.notes, { every: true });
	}
	return withKeySignature(text, key.keyText);
}

/**
 * The same tune with these voices moved by some semitones (an octave): the
 * melody takes its harmony parts along, so hand edits to them stay.
 * @param {string} abc
 * @param {DrawnVoice[]} voices read from this ABC
 * @param {number} semitones
 */
export function transposedDrawnMelody(abc, voices, semitones) {
	let text = abc;
	// The last voice first, so the earlier ones' places in the text still hold
	for (const { score } of [...voices].reverse()) {
		text = rewriteAbc(text, score, transposed(score.notes, semitones));
	}
	return text;
}

/**
 * One edit passes the same text through several steps (words, harmony);
 * each version of it is parsed once.
 * @param {(abc: string) => any} parse
 * @returns {(abc: string) => any}
 */
function readingEachOnce(parse) {
	const read = new Map();
	return (abc) => {
		if (!read.has(abc)) read.set(abc, parse(abc));
		return read.get(abc);
	};
}
