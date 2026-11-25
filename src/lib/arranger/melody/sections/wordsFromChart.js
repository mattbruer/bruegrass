/**
 * A tune kept by section takes its words from the chart: each section's
 * words, typed under its line in the chart, go under its notes as it's
 * played. Words belong to the section as played (Verse 1 and Verse 2 share
 * a tune, not their words), so they're never kept with a section's tune.
 */
import { tuneReader } from '../abcjs.js';
import { abcWithWords } from '../words/abcWithWords.js';
import { hasLyrics } from '../words/wordsAgain.js';

/**
 * @param {string} abc the tune as played
 * @param {any} abcjs
 * @param {import('../../chart/timeline.js').Section[]} sections the chart, read
 * @param {import('../../chart/sectionLyrics.js').SectionLyrics[]} lyrics its words
 * @returns {string} the tune with `w:` lines (as it was when there are no words, or they can't be placed)
 */
export function withWordsFromChart(abc, abcjs, sections, lyrics) {
	if (!abcjs || sections.length === 0 || !hasLyrics(lyrics)) return abc;
	try {
		const tune = tuneReader(abcjs)(abc);
		if (!tune) return abc;
		return abcWithWords(abc, tune, abcjs.synth.sequence(tune, {}), sections, lyrics).abc;
	} catch {
		return abc;
	}
}
