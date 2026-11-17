/**
 * "Send to the arranger": a new song from the open transcription, with the
 * sections you chose. The transcription stays as it is, tied to its
 * recording; the arrangement is an ordinary song at the transcription's
 * tempo, its tune and written bass kept by section, so moving its sections
 * in the arranger moves their music too. It remembers the recording it was
 * made from (`madeFrom`), so Transcribe can take you back to it.
 *
 * A section whose tune starts early (a pickup) takes those notes from the
 * end of the section before, in every voice of the tune, so they go with
 * it. Only the tune: the bass and chords keep to the bar lines.
 */
import { abcjsReady } from './abcjsLoaded.svelte.js';
import { readSongFields } from './songFields.js';
import { tuneReader } from '../melody/abcjs.js';
import { readTuneText, sectionInstances } from '../melody/sections/tuneBySection.js';
import { withPickupsCutOut } from '../melody/sections/sectionPickups.js';
import { splitTune } from '../melody/sections/splitTune.js';
import {
	chartOfSections,
	tuneOfChart,
	withUniqueSectionNames
} from '../transcription/arrangementFromTranscription.js';

/**
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 * @param {number[]} chosen the sections to take, by their place in the chart
 * @param {string} name what to call the new song (numbered if it's taken)
 * @param {Record<number, number>} pickups each section's pickup in quarters, by its place in the chart
 * @returns {Promise<string>} why it couldn't be made ('' when it was)
 */
export async function arrangeFromTranscription(arranger, chosen, name, pickups) {
	const abcjs = await abcjsReady();
	const { arrangement, melody, bass, song } = arranger;
	if (!arrangement.isPlayable) return 'Fix the chords first: the chart can’t be played.';
	if (chosen.length === 0) return 'Choose a section or more.';

	const named = withUniqueSectionNames(arrangement.text);
	const instances = sectionInstances(named);
	const barCounts = arrangement.sections.map((section) => section.measures.length);
	const split = (/** @type {string} */ abc) =>
		abc.trim() ? splitTune(abc, tuneReader(abcjs)(abc), instances, barCounts) : null;

	const reading = { parse: tuneReader(abcjs), barCounts };
	const pickupQuarters = Object.fromEntries(
		Object.entries(pickups).map(([index, quarters]) => [instances[Number(index)]?.source, quarters])
	);
	const ids = readTuneText(melody.notation)?.ids ?? [];
	const cut = melody.notation.trim()
		? withPickupsCutOut(melody.notation, ids, pickupQuarters, instances, reading)
		: null;
	const tune = split(cut?.text ?? melody.notation);
	if (tune && !tune.tune) return `The tune can’t be taken over: ${tune.problem}`;
	if (tune?.tune && cut) {
		for (const [source, voices] of Object.entries(cut.lifted))
			tune.tune.pickups[source] = { quarters: pickupQuarters[source], voices };
	}
	const bassLine = split(bass.notation);
	const chart = chartOfSections(named, chosen);
	const madeFrom = song.recording;

	song.startNew({
		...readSongFields(arranger),
		arrangement: chart,
		abc: '',
		tune: tune?.tune ? tuneOfChart(tune.tune, chart) : null,
		bass: '',
		bassTune: bassLine?.tune ? tuneOfChart(bassLine.tune, chart) : null,
		recording: null,
		madeFrom
	});
	song.name = name;
	await song.keepAsYourOwn();
	return '';
}
