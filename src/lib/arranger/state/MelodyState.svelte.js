/**
 * The optional melody: ABC notation, and everything read from it. The
 * notation is parsed once per change, here (`#read`); the band, the piano
 * roll, harmony and the chord conversions all take what they need from it.
 *
 * The tune is kept whole or by section (SectionedText.svelte.js);
 * `notation` is always the tune as played.
 */
import { readTune } from '../melody/readTune.js';
import { readMelody } from '../melody/readMelody.js';
import { readVoices } from '../melody/roll/drawnMelody.js';
import { hasChords } from '../melody/abcChords.js';
import { STARTER_SONG } from '../starterSong.js';
import { abcjsIfLoaded } from './abcjsLoaded.svelte.js';
import { SectionedText } from './SectionedText.svelte.js';

export class MelodyState {
	#tune;

	/** @param {import('./SectionedText.svelte.js').LayoutOf} [layoutOf] */
	constructor(layoutOf = () => ({ instances: [], restsFor: () => '' })) {
		this.#tune = new SectionedText(STARTER_SONG.abc, layoutOf);
	}

	/** The tune in ABC notation, as played. */
	get notation() {
		return this.#tune.text;
	}

	set notation(abc) {
		this.#tune.text = abc;
	}

	/** The tune as the ABC view shows it: whole, or each section's tune once. */
	get abcView() {
		return this.#tune.view;
	}

	set abcView(text) {
		this.#tune.view = text;
	}

	/** @type {import('../melody/sections/tuneBySection.js').TuneBySection | null} the tune kept by section (null: kept whole) */
	get bySection() {
		return this.#tune.bySection;
	}

	set bySection(tune) {
		this.#tune.bySection = tune;
	}

	/**
	 * A song's tune onto the page.
	 * @param {string} abc as played (or whole)
	 * @param {import('../melody/sections/tuneBySection.js').TuneBySection | null} bySection
	 */
	load(abc, bySection) {
		this.#tune.load(abc, bySection);
	}

	/** Keep the tune whole again, as it plays now. */
	join() {
		this.#tune.join();
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
