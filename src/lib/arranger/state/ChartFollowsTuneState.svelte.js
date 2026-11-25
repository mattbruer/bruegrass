/**
 * The ABC typed in the melody panel, with its chord symbols kept in the
 * chart: after a pause in typing, bars whose chords the typing changed are
 * written into the chart (melody/chartFollowsTune.js), and the tune's
 * symbols then follow the chart (state/tuneFollowsChart.svelte.js). The
 * pause keeps a half-typed `"Am` from reaching the chart.
 */
import { chartWithTuneChords } from '../melody/chartFollowsTune.js';

/** How long the typing must stop before the chart follows. */
const PAUSE_MS = 700;

export class ChartFollowsTuneState {
	/** Bars the chart couldn't take from the tune, and why. @type {string[]} */
	problems = $state.raw([]);
	#arranger;
	/** The tune as abcjs read it before this run of typing. @type {any[][] | null} */
	#before = null;
	#song = 0;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	#timer;

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
	}

	/**
	 * The ABC as typed, in the melody panel's view of it.
	 * @param {string} text
	 */
	typed(text) {
		const { melody, songsLoaded } = this.#arranger;
		if (!this.#before || this.#song !== songsLoaded) this.#before = melody.sequence;
		this.#song = songsLoaded;
		melody.abcView = text;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => this.#follow(), PAUSE_MS);
	}

	#follow() {
		const before = this.#before;
		this.#before = null;
		const { melody, arrangement, songsLoaded } = this.#arranger;
		const after = melody.sequence;
		if (this.#song !== songsLoaded || !before || !after) return;
		if (arrangement.readError || arrangement.sections.length === 0) return;
		const { text, problems } = chartWithTuneChords(
			arrangement.text,
			arrangement.sections,
			before,
			after,
			arrangement.capoFret
		);
		this.problems = problems;
		if (text !== arrangement.text) arrangement.text = text;
	}
}
