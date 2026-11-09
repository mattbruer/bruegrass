/**
 * The piano roll's way in and out of the tune's ABC: the melody and each
 * harmony part, every one a voice the roll can edit. abcjs reads it (loaded
 * on first use).
 *
 * Writing the melody rewrites the drawn bars, then brings the rest along:
 * words under it are placed again on the new notes (when the chart has the
 * words), and the harmony parts are written fresh in the changed bars only,
 * so hand edits elsewhere stay. Writing a harmony part changes just that part.
 */
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
 * @returns {Promise<{ voices: DrawnVoice[], sequence: any[][] | null } | null>}
 *   voices: the melody first; null when the ABC has no music yet
 */
export async function readDrawnMelody(abc) {
	const abcjs = await loadAbcjs();
	const tune = abcjs.parseOnly(abc)[0];
	if (!tune) return null;
	const voices = voiceChannels(tune).map((id, index) => ({
		id,
		name: voiceName(id),
		...readScore(abc, tune, index)
	}));
	if (!voices[0] || voices[0].score.bars.length === 0) return null;
	return { voices, sequence: tryOrNull(() => abcjs.synth.sequence(tune, {})) };
}

/**
 * The ABC with one voice's notes as drawn.
 * @param {{
 *   abc: string, voice: string, score: Score, notes: DrawnNote[], song: Song,
 *   newTune?: { title: string, keyText: string, lineStarts: Set<number> } | null
 * }} change voice: which one was drawn; newTune: write a whole tune (the
 *   score came from the chart)
 */
export async function writeDrawnMelody({ abc, voice, score, notes, song, newTune = null }) {
	if (newTune) return newAbc(score, notes, newTune);
	const written = rewriteAbc(abc, score, notes);
	if (voice !== MELODY_CHANNEL) return written;

	const abcjs = await loadAbcjs();
	const parse = (/** @type {string} */ text) => abcjs.parseOnly(text)[0];
	let text = withWords(written, song, abcjs);
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
 */
function withWords(abc, song, abcjs) {
	if (!hasWords(abc) || !hasLyrics(song.lyrics) || song.sections.length === 0) return abc;
	const tune = abcjs.parseOnly(abc)[0];
	const sequence = tune && tryOrNull(() => abcjs.synth.sequence(tune, {}));
	return sequence ? abcWithWords(abc, tune, sequence, song.sections, song.lyrics).abc : abc;
}

/** The melody (before any harmony part) has words under it. */
function hasWords(/** @type {string} */ abc) {
	const melodyEnd = abc.search(/^V:(?!1\b)/m);
	return /^w:/m.test(melodyEnd === -1 ? abc : abc.slice(0, melodyEnd));
}

/** @param {import('../../chart/sectionLyrics.js').SectionLyrics[]} lyrics */
function hasLyrics(lyrics) {
	return lyrics.some((section) => section.pickup.trim() || section.bars.some((bar) => bar.trim()));
}

async function loadAbcjs() {
	return (await import('abcjs')).default;
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
