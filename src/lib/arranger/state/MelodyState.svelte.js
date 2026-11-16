/**
 * The optional melody: ABC notation, and everything read from it. The
 * notation is parsed once per change, here (`#read`); the band, the piano
 * roll, harmony and the chord conversions all take what they need from it.
 *
 * The tune is kept one of two ways. Whole: the ABC as typed or pasted,
 * kept exactly. By section (`bySection`, melody/sections/): each section of
 * the chart owns its bars, and `notation` is the tune as played, made from
 * them in the chart's order; whatever writes `notation` (the piano roll, a
 * capo change) is written back to the sections. A write that can't be read
 * back that way keeps the tune whole instead, so nothing is lost.
 */
import { readTune } from '../melody/readTune.js';
import { readMelody } from '../melody/readMelody.js';
import { readVoices } from '../melody/roll/drawnMelody.js';
import { hasChords } from '../melody/abcChords.js';
import { STARTER_SONG } from '../starterSong.js';
import { abcjsIfLoaded } from './abcjsLoaded.svelte.js';
import {
	fromPlayedTune,
	fromTuneBySectionText,
	playedTune,
	tuneBySectionText
} from '../melody/sections/tuneBySection.js';
import { unitOfHeader } from '../melody/sections/splitTune.js';

/**
 * @typedef {import('../melody/sections/tuneBySection.js').TuneBySection} TuneBySection
 * @typedef {(unit: number) => {
 *   instances: import('../melody/sections/tuneBySection.js').SectionInstance[],
 *   restsFor: import('../melody/sections/tuneBySection.js').RestsFor
 * }} TuneLayout the chart's sections in play order, and what a section with no tune plays
 */

export class MelodyState {
	/** The tune kept whole: ABC as typed. */
	#whole = $state(STARTER_SONG.abc);
	/** @type {TuneBySection | null} the tune kept by section (null: kept whole) */
	bySection = $state.raw(null);
	#layout = $derived(this.bySection ? this.#layoutOf(unitOfHeader(this.bySection.header)) : null);
	#played = $derived(
		this.bySection && this.#layout
			? playedTune(this.bySection, this.#layout.instances, this.#layout.restsFor)
			: this.#whole
	);

	/** @param {TuneLayout} layoutOf */
	constructor(layoutOf = () => ({ instances: [], restsFor: () => '' })) {
		this.#layoutOf = layoutOf;
	}

	/** @type {TuneLayout} */
	#layoutOf;

	/** The tune in ABC notation, as played. */
	get notation() {
		return this.#played;
	}

	set notation(abc) {
		if (!this.bySection || !this.#layout) {
			this.#whole = abc;
			return;
		}
		const { instances, restsFor } = this.#layout;
		this.#keep(fromPlayedTune(abc, this.bySection, instances, restsFor), abc);
	}

	/** The tune as the ABC view shows it: whole, or each section's tune once. */
	get abcView() {
		if (!this.bySection || !this.#layout) return this.#whole;
		const { instances, restsFor } = this.#layout;
		return tuneBySectionText(this.bySection, instances, restsFor);
	}

	set abcView(text) {
		if (!this.bySection || !this.#layout) {
			this.#whole = text;
			return;
		}
		const { instances, restsFor } = this.#layout;
		this.#keep(fromTuneBySectionText(text, this.bySection, instances, restsFor), text);
	}

	/**
	 * A song's tune onto the page.
	 * @param {string} abc as played (or whole)
	 * @param {TuneBySection | null} bySection
	 */
	load(abc, bySection) {
		this.bySection = bySection;
		this.#whole = abc;
	}

	/** Keep the tune whole again, as it plays now. */
	join() {
		const played = this.#played;
		this.bySection = null;
		this.#whole = played;
	}

	/**
	 * @param {TuneBySection | null} next the tune by section, or null: it couldn't be read back
	 * @param {string} text what was written
	 */
	#keep(next, text) {
		if (next) {
			this.bySection = next;
			return;
		}
		this.bySection = null;
		this.#whole = text;
	}

	/** How the sheet music is drawn: as it sounds, or in the key of the guitar's shapes (for reading with a capo). */
	sheetView = $state(/** @type {'concert' | 'shapes'} */ ('concert'));

	hasNotation = $derived(this.notation.trim() !== '');

	#read = $derived(readTune(abcjsIfLoaded(), this.notation));
	/** The notation as abcjs parsed it (null: no music, or abcjs still loading). */
	tune = $derived(this.#read.tune);
	/** The tune as played, repeats played out (for its chord symbols and bars). */
	sequence = $derived(this.#read.sequence);
	warnings = $derived(this.#read.warnings);

	/** The melody's notes, timed from bar 1, or why it can't be played. */
	#melody = $derived(readMelody(this.tune));
	line = $derived(this.#melody.line);
	/** Quarters before bar 1, known even when the tune is only rests. */
	pickup = $derived(this.#melody.pickup);
	error = $derived(this.#melody.error);

	/** Every voice as a score of bars and notes, for the piano roll (null: nothing to draw). */
	voices = $derived(this.tune ? readVoices(this.notation, this.tune) : null);

	title = $derived(this.tune?.metaText?.title ?? '');

	/** The tune has chord symbols (so the arrangement can be written from them). */
	hasChordSymbols = $derived(this.sequence ? hasChords(this.sequence) : false);
}
