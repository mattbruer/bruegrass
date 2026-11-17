/**
 * A tune with repeats or endings, cut into the chart's sections: its notes
 * as played (repeats and endings played out, readMelody.js), laid on the
 * chart's bars in play order and shared out among the sections like a tune
 * written straight through (splitTune.js). The chord symbols are the
 * chart's; the tune's own, and anything the notes alone don't say
 * (ornaments, slurs), are left behind.
 */
import { scoreFromChart } from '../roll/scoreFromChart.js';
import { TICKS_PER_QUARTER } from '../roll/ticks.js';
import { voiceChannels } from '../harmony/partChannels.js';
import { readTuneText, MELODY_VOICE } from './tuneBySection.js';
import { splitScore, unitOfHeader } from './splitTune.js';

/**
 * @param {string} abc
 * @param {any} tune abcjs's parse of it
 * @param {import('../melody.js').Melody} line its notes as played
 * @param {import('./tuneBySection.js').SectionInstance[]} instances
 * @param {import('../../chart/chartBars.js').ChartBar[]} chartBars the chart's bars in play order
 * @param {{ songKey: import('../../chart/key.js').Key | null, capo: number,
 *   spelling: import('../../theory/musicInKey.js').Key }} song
 * @returns {{ tune: import('./tuneBySection.js').TuneBySection | null, problem: string }}
 */
export function splitPlayedOut(abc, tune, line, instances, chartBars, song) {
	const text = readTuneText(abc);
	if (!text) return { tune: null, problem: 'It has no K: line.' };
	const channels = voiceChannels(tune);
	if (new Set(channels).size !== channels.length)
		return { tune: null, problem: 'It has voices that aren’t harmony parts.' };

	const pickupTicks = Math.round(line.pickup * TICKS_PER_QUARTER);
	const { score: blank } = scoreFromChart(
		chartBars,
		song.songKey,
		song.capo,
		song.spelling,
		pickupTicks / TICKS_PER_QUARTER
	);
	const end = blank.bars.at(-1) ? blank.bars.at(-1).start + blank.bars.at(-1).length : 0;
	const barCounts = instances.map(
		(_, index) => chartBars.filter((bar) => bar.section === index).length
	);
	/** @type {import('./tuneBySection.js').TuneBySection} */
	const split = { header: text.header, voices: text.voices, leads: {}, parts: {}, pickups: {} };

	text.ids.forEach((id, index) => {
		const notes = line.notes
			.filter((note) => note.channel === channels[index])
			.map((note) => ({
				midi: note.pitch,
				start: Math.round(note.time * TICKS_PER_QUARTER) + pickupTicks,
				length: Math.round(note.length * TICKS_PER_QUARTER)
			}))
			.filter((note) => note.start >= 0 && note.start < end)
			.map((note) => ({ ...note, length: Math.min(note.length, end - note.start) }));
		const score = {
			bars: blank.bars,
			notes,
			chords: id === MELODY_VOICE ? blank.chords : [],
			key: song.spelling,
			unit: unitOfHeader(text.header)
		};
		splitScore(score, pickupTicks > 0 ? 1 : 0, id, instances, barCounts, split);
	});
	return { tune: split, problem: '' };
}
