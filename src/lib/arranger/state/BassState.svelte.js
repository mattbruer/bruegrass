/**
 * The song's bass line once it's been edited, as ABC (one voice, bass
 * clef, concert pitch, one bar per chart bar in play order). Empty while
 * the band writes it from the chart, which is what it does until the bass
 * is first changed in the piano roll. Parsed here, once per change.
 *
 * Kept whole or by section, like the tune (SectionedText.svelte.js): by
 * section, a section nobody has edited plays the band's own line, and
 * `notation` stays empty until some section has its own bars.
 */
import { readBassScore, writtenBassNotes } from '../bass/readBass.js';
import { abcjsIfLoaded } from './abcjsLoaded.svelte.js';
import { SectionedText } from './SectionedText.svelte.js';

export class BassState {
	#line;

	/** @param {import('./SectionedText.svelte.js').LayoutOf} [layoutOf] */
	constructor(layoutOf = () => ({ instances: [], restsFor: () => '' })) {
		this.#line = new SectionedText('', layoutOf);
	}

	/** The edited line as played ('' while the band plays its own). */
	get notation() {
		const bySection = this.#line.bySection;
		if (bySection && Object.keys(bySection.parts).length === 0) return '';
		return this.#line.text;
	}

	set notation(abc) {
		const bySection = this.#line.bySection;
		if (bySection && !abc.trim()) this.#line.bySection = { ...bySection, parts: {} };
		else this.#line.text = abc;
	}

	/** @type {import('../melody/sections/tuneBySection.js').TuneBySection | null} the line kept by section (null: kept whole) */
	get bySection() {
		return this.#line.bySection;
	}

	set bySection(line) {
		this.#line.bySection = line;
	}

	isWritten = $derived(this.notation.trim() !== '');

	/** The edited line read as a score, once per change (null: not edited, or abcjs still loading). */
	read = $derived(readBassScore(this.notation, abcjsIfLoaded()));

	/** The edited line's notes for the band to play (null: the band plays its own). */
	written = $derived(writtenBassNotes(this.read));

	/**
	 * A song's bass line onto the page.
	 * @param {string} abc as played ('' for the band's own)
	 * @param {import('../melody/sections/tuneBySection.js').TuneBySection | null} bySection
	 */
	load(abc, bySection) {
		this.#line.load(abc, bySection);
	}

	/**
	 * Keep the line by section: each section's bars that differ from the
	 * band's own line become that section's.
	 * @param {string} header the band's own line's header
	 */
	split(header) {
		return this.#line.splitAsPlayed({ header, voices: [], leads: {}, parts: {}, pickups: {} });
	}

	/** Keep the line whole again, as it plays now. */
	join() {
		const played = this.notation;
		this.#line.bySection = null;
		this.#line.text = played;
	}

	/** Go back to the band's own bass line, written from the chart. */
	rewriteFromChart() {
		this.notation = '';
	}
}
