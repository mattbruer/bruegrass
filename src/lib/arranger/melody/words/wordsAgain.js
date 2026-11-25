/**
 * The chart's words placed again under the melody after its notes were
 * rewritten (the piano roll, a held note split for a chord change), so
 * each syllable stays on its note: a note tied from the one before holds
 * the syllable (`_`). Words typed only in the ABC, with none in the chart,
 * can't be placed again.
 */
import { abcWithWords } from './abcWithWords.js';

/**
 * @param {string} abc the melody, notes rewritten
 * @param {{ sections: import('../../chart/timeline.js').Section[], lyrics: import('../../chart/sectionLyrics.js').SectionLyrics[] }} song
 * @param {any} abcjs
 * @param {(abc: string) => any} parse abcjs's parse of an ABC text
 * @returns {string} as it was when it had no words, or the chart has none
 */
export function withChartWordsAgain(abc, song, abcjs, parse) {
	if (!hasWords(abc) || !hasLyrics(song.lyrics) || song.sections.length === 0) return abc;
	const tune = parse(abc);
	const sequence = tune && tryOrNull(() => abcjs.synth.sequence(tune, {}));
	return sequence ? abcWithWords(abc, tune, sequence, song.sections, song.lyrics).abc : abc;
}

/**
 * The melody (before any harmony part) has words under it.
 * @param {string} abc
 */
export function hasWords(abc) {
	const melodyEnd = abc.search(/^V:(?!1\b)/m);
	return /^w:/m.test(melodyEnd === -1 ? abc : abc.slice(0, melodyEnd));
}

/** @param {import('../../chart/sectionLyrics.js').SectionLyrics[]} lyrics */
export function hasLyrics(lyrics) {
	return lyrics.some((section) => section.pickup.trim() || section.bars.some((bar) => bar.trim()));
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
