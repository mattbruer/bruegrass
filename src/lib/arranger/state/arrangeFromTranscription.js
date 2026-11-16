/**
 * "Create an arrangement": a new song from the open transcription, with the
 * sections you chose. The transcription stays as it is, tied to its
 * recording; the arrangement is an ordinary song at the transcription's
 * tempo, its tune and written bass kept by section, so moving its sections
 * in the arranger moves their music too.
 */
import { abcjsReady } from './abcjsLoaded.svelte.js';
import { readSongFields } from './songFields.js';
import { tuneReader } from '../melody/abcjs.js';
import { sectionInstances } from '../melody/sections/tuneBySection.js';
import { splitTune } from '../melody/sections/splitTune.js';
import {
	chartOfSections,
	tuneOfChart,
	withUniqueSectionNames
} from '../transcription/arrangementFromTranscription.js';

/**
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 * @param {number[]} chosen the sections to take, by their place in the chart
 * @returns {Promise<string>} why it couldn't be made ('' when it was)
 */
export async function arrangeFromTranscription(arranger, chosen) {
	const abcjs = await abcjsReady();
	const { arrangement, melody, bass, song } = arranger;
	if (!arrangement.isPlayable) return 'Fix the chords first: the chart can’t be played.';
	if (chosen.length === 0) return 'Choose a section or more.';

	const named = withUniqueSectionNames(arrangement.text);
	const instances = sectionInstances(named);
	const barCounts = arrangement.sections.map((section) => section.measures.length);
	const split = (/** @type {string} */ abc) =>
		abc.trim() ? splitTune(abc, tuneReader(abcjs)(abc), instances, barCounts) : null;

	const tune = split(melody.notation);
	if (tune && !tune.tune) return `The tune can’t be taken over: ${tune.problem}`;
	const bassLine = split(bass.notation);
	const chart = chartOfSections(named, chosen);
	const name = `${song.name || arranger.title} arrangement`;

	song.startNew({
		...readSongFields(arranger),
		arrangement: chart,
		abc: '',
		tune: tune?.tune ? tuneOfChart(tune.tune, chart) : null,
		bass: '',
		bassTune: bassLine?.tune ? tuneOfChart(bassLine.tune, chart) : null,
		recording: null
	});
	song.name = name;
	await song.keepAsYourOwn();
	return '';
}
