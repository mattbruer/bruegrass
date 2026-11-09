/**
 * Write the arrangement's words under the melody, as ABC `w:` lines.
 *
 * The words are typed bar by bar under each section of the arrangement
 * (chart/sectionLyrics.js); the melody is played bar for bar with it. So
 * each bar's syllables go onto the melody's notes in that bar (placeInBar.js).
 * Bars the score repeats get a second `w:` line (verse 2) for the second
 * time through, the way ABC writes verses. Any `w:` lines already under the
 * melody are replaced; harmony parts are left alone.
 *
 * abcjs lines words up with notes by itself: rests are skipped, and a note
 * tied from the one before still takes a syllable (so it's given `_`, hold).
 */
import { walk } from '../abcChords.js';
import { barsInPlayOrder } from '../../chart/chartBars.js';
import { syllablesOf } from './syllables.js';
import { placeInBar } from './placeInBar.js';

const EPSILON = 1e-6;

/**
 * @typedef {import('./placeInBar.js').Token} Token
 * @typedef {{ startChar: number, rest: boolean, tied: boolean, line: number }} WrittenNote
 */

/**
 * @param {string} abc the melody's notation
 * @param {any} tune abcjs's tune for that notation
 * @param {any[][]} sequence abcjs.synth.sequence(tune): the tune as played
 * @param {import('../../chart/timeline.js').Section[]} sections the arrangement
 * @param {import('../../chart/sectionLyrics.js').SectionLyrics[]} lyrics its words
 * @returns {{ abc: string, notes: string[] }} notes: what couldn't be placed
 */
export function abcWithWords(abc, tune, sequence, sections, lyrics) {
	const written = writtenNotes(tune);
	const played = playedNotesByBar(written, sequence, sections);
	const { tokens, notes } = placeWords(played, sections, lyrics);
	return { abc: rewrite(abc, written, tokens), notes };
}

/**
 * The melody's notes as written, line by line.
 * @param {any} tune
 * @returns {WrittenNote[]}
 */
function writtenNotes(tune) {
	/** @type {WrittenNote[]} */
	const notes = [];
	(tune?.lines ?? []).forEach((/** @type {any} */ line, /** @type {number} */ l) => {
		for (const element of line.staff?.[0]?.voices?.[0] ?? []) {
			if (element.el_type !== 'note' || element.startChar === undefined) continue;
			notes.push({
				startChar: element.startChar,
				rest: Boolean(element.rest),
				tied: (element.pitches ?? []).some((/** @type {any} */ pitch) => pitch.endTie),
				line: l
			});
		}
	});
	return notes;
}

/**
 * Every sung note as played, grouped by the arrangement bar it falls in
 * (-1: the pickup before bar 1). `key` names a written note on one pass.
 * @param {WrittenNote[]} written
 * @param {any[][]} sequence
 * @param {import('../../chart/timeline.js').Section[]} sections
 */
function playedNotesByBar(written, sequence, sections) {
	const byChar = new Map(written.map((note) => [note.startChar, note]));
	const bars = barsInPlayOrder(sections);
	const last = bars.at(-1);
	const end = last ? last.start + last.beats : 0;
	const { items, pickup } = walk(sequence[0] ?? []);

	/** @type {Map<number, number>} */
	const passes = new Map();
	/** @type {Map<number, { key: string, tied: boolean }[]>} */
	const byBar = new Map();

	for (const item of items) {
		const note = item.startChar === undefined ? undefined : byChar.get(item.startChar);
		if (!note || note.rest) continue;
		const pass = passes.get(note.startChar) ?? 0;
		passes.set(note.startChar, pass + 1);

		const t = item.t - pickup;
		if (t >= end - EPSILON) continue;
		const bar = t < -EPSILON ? -1 : bars.findLastIndex((b) => b.start <= t + EPSILON);
		const notes = byBar.get(bar) ?? [];
		notes.push({ key: `${note.startChar}:${pass}`, tied: note.tied });
		byBar.set(bar, notes);
	}
	return { bars, byBar };
}

/**
 * @param {ReturnType<typeof playedNotesByBar>} played
 * @param {import('../../chart/timeline.js').Section[]} sections
 * @param {import('../../chart/sectionLyrics.js').SectionLyrics[]} lyrics
 */
function placeWords({ bars, byBar }, sections, lyrics) {
	/** @type {Map<string, Token>} */
	const tokens = new Map();
	/** @type {string[]} */
	const notes = [];

	/**
	 * @param {number} bar
	 * @param {string} ownWords
	 * @param {string} pickupWords
	 * @param {string} where
	 */
	const place = (bar, ownWords, pickupWords, where) => {
		const sung = byBar.get(bar) ?? [];
		const own = syllablesOf(ownWords);
		const pickup = syllablesOf(pickupWords);
		if (sung.length === 0 && own.length + pickup.length > 0) {
			notes.push(`${where} has words, but the melody has no notes there.`);
			return;
		}
		const placed = placeInBar(sung, own, pickup);
		sung.forEach((note, i) => tokens.set(note.key, placed.tokens[i]));
		if (placed.leftOver.length > 0) {
			const words = placed.leftOver.map((syllable) => syllable.text).join(' ');
			notes.push(`${where}: more syllables than notes, so “${words}” was left out.`);
		}
	};

	place(-1, '', lyrics[0]?.pickup ?? '', 'Before bar 1');
	bars.forEach((bar, b) => {
		const next = bars[b + 1];
		const leadsIntoNext = next && next.section !== bar.section;
		place(
			b,
			lyrics[bar.section]?.bars[bar.measure] ?? '',
			leadsIntoNext ? (lyrics[next.section]?.pickup ?? '') : '',
			`${sections[bar.section]?.name ?? 'The song'}, bar ${bar.measure + 1}`
		);
	});

	return { tokens, notes };
}

/**
 * The notation with its old `w:` lines taken out and new ones written
 * after each line of music.
 * @param {string} abc
 * @param {WrittenNote[]} written
 * @param {Map<string, Token>} tokens
 */
function rewrite(abc, written, tokens) {
	/** @type {{ at: number, remove: number, text: string }[]} */
	const edits = [];
	const lastNote = written.at(-1);
	if (!lastNote) return abc;

	// Old words under the melody (not under harmony parts, which come after it)
	const partsStart = abc.slice(lastNote.startChar).search(/^V:/m);
	const melodyEnd = partsStart === -1 ? abc.length : lastNote.startChar + partsStart;
	for (const match of abc.matchAll(/^[ \t]*w:.*(\r?\n|$)/gm)) {
		if (match.index < melodyEnd) edits.push({ at: match.index, remove: match[0].length, text: '' });
	}

	for (const line of groupByLine(written)) {
		const wLines = wordLines(line, tokens);
		if (wLines.length === 0) continue;
		const lineEnd = abc.indexOf('\n', line.at(-1)?.startChar ?? 0);
		const at = lineEnd === -1 ? abc.length : lineEnd;
		edits.push({ at, remove: 0, text: wLines.map((w) => `\nw: ${w}`).join('') });
	}

	let result = abc;
	for (const edit of edits.sort((a, b) => b.at - a.at)) {
		result = result.slice(0, edit.at) + edit.text + result.slice(edit.at + edit.remove);
	}
	return result;
}

/** @param {WrittenNote[]} written */
function groupByLine(written) {
	/** @type {Map<number, WrittenNote[]>} */
	const lines = new Map();
	for (const note of written) {
		if (note.rest) continue;
		lines.set(note.line, [...(lines.get(note.line) ?? []), note]);
	}
	return [...lines.values()];
}

/**
 * One `w:` line per time this music is played (verse 1, verse 2…), none if
 * it has no words at all.
 * @param {WrittenNote[]} line
 * @param {Map<string, Token>} tokens
 */
function wordLines(line, tokens) {
	const verses = [];
	for (let pass = 0; ; pass++) {
		const lineTokens = line.map((note) => tokens.get(`${note.startChar}:${pass}`));
		if (lineTokens.every((token) => token === undefined)) break;
		verses.push(lineTokens);
	}
	const sung = verses.some((verse) => verse.some((token) => token?.kind === 'syllable'));
	return sung ? verses.map(wordLine) : [];
}

/** @param {(Token | undefined)[]} verse */
function wordLine(verse) {
	return verse
		.map((token) => {
			if (token?.kind === 'syllable') {
				return token.syllable.text + (token.syllable.continues ? '-' : ' ');
			}
			return token?.kind === 'hold' ? '_ ' : '* ';
		})
		.join('')
		.trim();
}
