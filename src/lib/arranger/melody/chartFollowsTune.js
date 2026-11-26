/**
 * Chords edited in the tune, written into the chart. The chart is the one
 * place chords are kept, so adding, changing or removing a chord symbol in
 * the ABC is a chart edit; the tune's symbols then follow the chart
 * (chordsFollowChart.js). Only bars whose chords the edit changed are
 * written, so the chart keeps what the tune can't show (a change while the
 * melody holds a note). A bar keeps the chart's rule (chordPlaces.js): a
 * change moves to the nearest place, and a bar with more changes than
 * places isn't written but pointed out.
 */
import { barsInPlayOrder } from '../chart/chartBars.js';
import { withBarChords } from '../chart/withBarChords.js';
import { chordsOnPlaces, chordVoice, walk } from './abcChords.js';

const EPSILON = 1e-6;

/**
 * @typedef {{ chords: string[], tooMany: boolean } | null} TuneBar
 *   a bar's chords as the tune has them, at concert pitch, written the
 *   chart's way (one, or one on each place); tooMany: more changes than the
 *   bar has places; null where the tune has no chord yet
 */

/**
 * The tune's chords bar by bar, on the chart's bars.
 * @param {any[][]} voices abcjs.synth.sequence(tune)
 * @param {import('../chart/chartBars.js').ChartBar[]} bars
 * @returns {TuneBar[] | null} null when the tune has no chord symbols
 */
export function tuneChordsByBar(voices, bars) {
	const voice = chordVoice(voices);
	if (!voice) return null;
	const { items, pickup } = walk(voice);
	const changes = items
		.filter((item) => item.chord)
		.map((item) => ({ t: item.t - pickup, name: /** @type {string} */ (item.chord) }));

	return bars.map((bar) => {
		const end = bar.start + bar.beats;
		const sounding = changes.findLast((change) => change.t <= bar.start + EPSILON)?.name;
		const inBar = changes.filter(
			(change) => change.t > bar.start + EPSILON && change.t < end - EPSILON
		);
		const first = sounding ?? inBar[0]?.name;
		if (!first) return null;
		const marks = [
			{ offset: 0, name: first },
			...inBar.map((change) => ({ offset: change.t - bar.start, name: change.name }))
		];
		const { chords, moved } = chordsOnPlaces(bar.beats, marks);
		return { chords, tooMany: moved.some((change) => change.dropped) };
	});
}

/**
 * The chart with the bars an edit to the tune changed written in.
 * @param {string} text the chart
 * @param {import('../chart/timeline.js').Section[]} sections read from it
 * @param {any[][]} before abcjs.synth.sequence of the tune before the edit
 * @param {any[][]} after abcjs.synth.sequence of the tune now
 * @returns {{ text: string, problems: string[] }} problems: bars left as they were, and why
 */
export function chartWithTuneChords(text, sections, before, after) {
	const bars = barsInPlayOrder(sections);
	const was = tuneChordsByBar(before, bars);
	const now = tuneChordsByBar(after, bars);
	/** @type {string[]} */
	const problems = [];
	if (!now) return { text, problems };

	let chart = text;
	bars.forEach((bar, index) => {
		const tune = now[index];
		if (!tune || JSON.stringify(tune) === JSON.stringify(was?.[index] ?? null)) return;
		if (tune.tooMany) {
			problems.push(
				`Bar ${index + 1} has more chord changes than a bar can hold, so the chart keeps its chords there.`
			);
			return;
		}
		chart = withBarChords(chart, bar, tune.chords.join(','));
	});
	return { text: chart, problems };
}
