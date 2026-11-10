/**
 * The band's own bass line (instruments/bassline.js) written out as ABC,
 * so the piano roll can show it and an edit can start from it: one voice in
 * bass clef, concert pitch, the chart's bars in play order (no repeats, so
 * bar n is the chart's bar n), each bar with its chords as chord symbols.
 * The chord symbols are how a later chart change finds the bars it changed
 * (bassFollowsChart.js).
 *
 * Pitches are written as bassline.js numbers them: the bass's open E is 40,
 * E,, in ABC. Like the guitar, it sounds an octave below.
 */
import { bassLine } from '../instruments/bassline.js';
import { barsInPlayOrder } from '../chart/chartBars.js';
import { scoreFromChart } from '../melody/roll/scoreFromChart.js';
import { newAbc } from '../melody/roll/scoreToAbc.js';
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';
import { mod12 } from '../chart/key.js';
import { rhythm } from '../chart/timeline.js';
import { leadOnsets } from './melodySpace.js';

/**
 * @typedef {{
 *   sections: import('../chart/timeline.js').Section[],
 *   songKey: import('../chart/key.js').Key | null,
 *   capo: number,
 *   melodyKey: { spelling: import('../theory/musicInKey.js').Key, keyText: string },
 *   tune?: import('../melody/melody.js').Melody | null
 * }} BassSong what the bass line is written from (the melody's key is the concert key)
 */

/**
 * The bass line in use: the edited one, else the band's own from the chart.
 * @param {string} written the song's bass field
 * @param {BassSong} song
 */
export function bassAbcInUse(written, song) {
	return written.trim() ? written : generatedBassAbc(song);
}

/** @param {BassSong} song */
export function generatedBassAbc({ sections, songKey, capo, melodyKey, tune = null }) {
	const { score, lineStarts } = scoreFromChart(
		barsInPlayOrder(sections),
		songKey,
		capo,
		melodyKey.spelling
	);
	const tuneOnsets = leadOnsets(tune, { quarters: rhythm(sections).quarters });
	const notes = bassLine(sections, { capo: mod12(capo), tuneOnsets }).map((note) => ({
		midi: note.pitch,
		start: Math.round(note.beat * TICKS_PER_QUARTER),
		length: Math.round(note.length * TICKS_PER_QUARTER)
	}));
	return newAbc(score, notes, {
		title: 'Bass',
		keyText: `${melodyKey.keyText} clef=bass`,
		lineStarts
	});
}

/**
 * What the bass is written from, for the open song.
 * @param {{
 *   arrangement: { sections: any[], key: any, capoFret: number },
 *   melodyKey: BassSong['melodyKey'],
 *   melody: { line: BassSong['tune'] }
 * }} arranger
 * @param {BassSong['tune']} [tune] the tune to fit the walks around (default: the open one)
 * @returns {BassSong}
 */
export function bassSongOf({ arrangement, melodyKey, melody }, tune = melody.line) {
	return {
		sections: arrangement.sections,
		songKey: arrangement.key,
		capo: arrangement.capoFret,
		melodyKey,
		tune
	};
}
