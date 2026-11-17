/**
 * The piano roll's way in and out of the tune's ABC: the melody and each
 * harmony part, every one a voice the roll can edit. The open tune is read
 * in MelodyState; these take what it read.
 *
 * Writing the melody rewrites the drawn bars, then brings the rest along:
 * words under it are placed again on the new notes (when the chart has the
 * words), and the harmony parts are written fresh in the changed bars only,
 * so hand edits elsewhere stay. Writing a harmony part changes just that part.
 */
import { tuneReader } from '../abcjs.js';
import { readScore } from './readScore.js';
import { changedBars, newAbc, rewriteAbc, withKeySignature } from './scoreToAbc.js';
import { withFreshHarmonyBars } from './freshHarmonyBars.js';
import { abcWithWords } from '../words/abcWithWords.js';
import { MELODY_CHANNEL, voiceChannels } from '../harmony/partChannels.js';
import { HARMONY_PARTS } from '../harmony/harmonyParts.js';
import { concertChordAt } from '../../chart/concertChords.js';

/**
 * @typedef {import('./readScore.js').Score} Score
 * @typedef {import('./editNotes.js').DrawnNote} DrawnNote
 * @typedef {{ id: string, name: string, score: Score, problem: string }} DrawnVoice
 *   id: its channel (MELODY_CHANNEL, or a harmony part's id)
 * @typedef {{
 *   sections: import('../../chart/timeline.js').Section[],
 *   lyrics: import('../../chart/sectionLyrics.js').SectionLyrics[],
 *   capo: number
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
		name: voiceName(id),
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
	if (voice !== MELODY_CHANNEL || !abcjs) return written;

	const parse = readingEachOnce(tuneReader(abcjs));
	let text = withWords(written, song, abcjs, parse);
	if (song.sections.length > 0) {
		const chordAt = concertChordAt(song.sections, song.capo);
		text = withFreshHarmonyBars(text, parse, chordAt, changedBars(score, notes));
	}
	return text;
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

/** @param {string} id */
function voiceName(id) {
	return HARMONY_PARTS.find((part) => part.id === id)?.name ?? 'Melody';
}

/**
 * The chart's words placed again under the melody, if it had words.
 * @param {string} abc
 * @param {Song} song
 * @param {any} abcjs
 * @param {(abc: string) => any} parse
 */
function withWords(abc, song, abcjs, parse) {
	if (!hasWords(abc) || !hasLyrics(song.lyrics) || song.sections.length === 0) return abc;
	const tune = parse(abc);
	const sequence = tune && tryOrNull(() => abcjs.synth.sequence(tune, {}));
	return sequence ? abcWithWords(abc, tune, sequence, song.sections, song.lyrics).abc : abc;
}

/** The melody (before any harmony part) has words under it. */
function hasWords(/** @type {string} */ abc) {
	const melodyEnd = abc.search(/^V:(?!1\b)/m);
	return /^w:/m.test(melodyEnd === -1 ? abc : abc.slice(0, melodyEnd));
}

/** @param {import('../../chart/sectionLyrics.js').SectionLyrics[]} lyrics */
export function hasLyrics(lyrics) {
	return lyrics.some((section) => section.pickup.trim() || section.bars.some((bar) => bar.trim()));
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

/**
 * @template T
 * @param {() => T} read
 * @returns {T | null}
 */
function tryOrNull(read) {
	try {
		return read();
	} catch {
		return null;
	}
}
