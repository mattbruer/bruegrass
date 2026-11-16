/**
 * An ABC text kept one of two ways (the tune, the bass line). Whole: as
 * typed or pasted, kept exactly. By section (`bySection`,
 * melody/sections/tuneBySection.js): each section of the chart owns its
 * bars, and `text` is the music as played, made from them in the chart's
 * order; whatever writes `text` (the piano roll, a capo change, harmony)
 * is written back to the sections. A write that can't be read back that
 * way keeps it whole instead, so nothing is lost.
 */
import {
	fromPlayedTune,
	fromTuneBySectionText,
	playedTune,
	tuneBySectionText,
	upgradedTune
} from '../melody/sections/tuneBySection.js';
import {
	hasLaterPickups,
	withPickupsLaidIn,
	withPickupsLifted
} from '../melody/sections/sectionPickups.js';

/**
 * @typedef {import('../melody/sections/tuneBySection.js').TuneBySection} TuneBySection
 * @typedef {{
 *   instances: import('../melody/sections/tuneBySection.js').SectionInstance[],
 *   restsFor: import('../melody/sections/tuneBySection.js').RestsFor,
 *   pickupRests?: (quarters: number) => string,
 *   reading?: import('../melody/sections/sectionPickups.js').Reading | null,
 *   withWords?: (abc: string) => string
 * }} Layout the chart's sections in play order, what a section with nothing
 *   of its own plays (and an empty pickup), abcjs and the chart's bars to
 *   lay pickups in with (none: no section pickups), and the music as played
 *   with the chart's words under it
 * @typedef {(bySection: TuneBySection) => Layout} LayoutOf
 */

export class SectionedText {
	/** Kept whole: ABC as typed. */
	#whole = $state('');
	/** @type {TuneBySection | null} kept by section (null: kept whole) */
	bySection = $state.raw(null);
	/** @type {LayoutOf} */
	#layoutOf;
	#layout = $derived(this.bySection ? this.#layoutOf(this.bySection) : null);
	/** As played, before later sections' pickups are laid in. */
	#base = $derived(
		this.bySection && this.#layout
			? playedTune(this.bySection, this.#layout.instances, this.#layout)
			: this.#whole
	);
	#played = $derived.by(() => {
		const layout = this.#layout;
		if (!this.bySection || !layout?.reading) return this.#base;
		if (!hasLaterPickups(this.bySection, layout.instances)) return this.#base;
		return withPickupsLaidIn(this.#base, this.bySection, layout.instances, layout, layout.reading);
	});
	#heard = $derived(this.#layout?.withWords ? this.#layout.withWords(this.#played) : this.#played);

	/**
	 * @param {string} whole
	 * @param {LayoutOf} layoutOf
	 */
	constructor(whole, layoutOf) {
		this.#whole = whole;
		this.#layoutOf = layoutOf;
	}

	/** The music as played. */
	get text() {
		return this.#heard;
	}

	set text(abc) {
		if (!this.bySection || !this.#layout) {
			this.#whole = abc;
			return;
		}
		const layout = this.#layout;
		const { instances } = layout;
		if (layout.reading && hasLaterPickups(this.bySection, instances)) {
			const lifted = withPickupsLifted(abc, this.#base, this.bySection, instances, layout.reading);
			this.#keep(
				lifted && fromPlayedTune(lifted.text, this.bySection, instances, layout, lifted.lifted),
				abc
			);
			return;
		}
		this.#keep(fromPlayedTune(abc, this.bySection, instances, layout), abc);
	}

	/** As the ABC view shows it: whole, or each section's music once. */
	get view() {
		if (!this.bySection || !this.#layout) return this.#whole;
		return tuneBySectionText(this.bySection, this.#layout.instances, this.#layout);
	}

	set view(text) {
		if (!this.bySection || !this.#layout) {
			this.#whole = text;
			return;
		}
		this.#keep(
			fromTuneBySectionText(text, this.bySection, this.#layout.instances, this.#layout),
			text
		);
	}

	/**
	 * A song's text onto the page.
	 * @param {string} abc as played (or whole)
	 * @param {TuneBySection | null} bySection
	 */
	load(abc, bySection) {
		this.bySection = upgradedTune(bySection);
		this.#whole = abc;
	}

	/** Keep it whole again, as it plays now. */
	join() {
		const played = this.#heard;
		this.bySection = null;
		this.#whole = played;
	}

	/**
	 * Keep it by section, reading what it plays now: each section's bars that
	 * differ from what the section would play with nothing of its own.
	 * @param {TuneBySection} empty the header and voices, with no sections yet
	 * @returns {boolean} whether it could be read that way
	 */
	splitAsPlayed(empty) {
		const layout = this.#layoutOf(empty);
		const read = this.#whole.trim()
			? fromPlayedTune(this.#whole, empty, layout.instances, layout)
			: empty;
		if (read) this.bySection = read;
		return !!read;
	}

	/**
	 * @param {TuneBySection | null} next by section, or null: it couldn't be read back
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
}
