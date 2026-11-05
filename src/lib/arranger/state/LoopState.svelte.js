/**
 * The loop: play the whole arrangement, one section, or a range of bars
 * within either. Bars are numbered from 1 within the chosen part.
 */
import { loopOffset, loopRegion, loopScope } from '../chart/loop.js';

/** The "section" value meaning the whole arrangement. */
export const WHOLE_ARRANGEMENT = -1;

export class LoopState {
	/** @type {import('./ArrangementState.svelte.js').ArrangementState} */
	#arrangement;

	/** Which section to loop (an index), or WHOLE_ARRANGEMENT. */
	section = $state(WHOLE_ARRANGEMENT);
	/** First bar of the loop, from 1. */
	from = $state(1);
	/** Last bar of the loop (Infinity = to the end). */
	to = $state(Infinity);

	/** @param {import('./ArrangementState.svelte.js').ArrangementState} arrangement */
	constructor(arrangement) {
		this.#arrangement = arrangement;
	}

	#choice = $derived({ section: this.section, from: this.from, to: this.to });

	/** How many bars the chosen part has. */
	barCount = $derived(loopScope(this.#arrangement.sections, this.section).length);

	/** Only part of the arrangement is chosen (so the loop bar is highlighted). */
	isPartial = $derived(
		this.barCount > 0 &&
			(this.section !== WHOLE_ARRANGEMENT ||
				(Number(this.from) || 1) > 1 ||
				Math.min(this.to, this.barCount) < this.barCount)
	);

	/** What actually plays (and scrolls past): the loop region, or everything. */
	sectionsToPlay = $derived(
		this.isPartial
			? loopRegion(this.#arrangement.sections, this.#choice)
			: this.#arrangement.sections
	);

	/** Where the loop starts in the whole song, in quarter notes (for the melody). */
	startInSong = $derived(this.isPartial ? loopOffset(this.#arrangement.sections, this.#choice) : 0);

	/** After picking a section: loop all of its bars. */
	useAllBarsOfSection() {
		this.from = 1;
		this.to = this.barCount;
	}

	/** Go back to looping the whole arrangement. */
	loopEverything() {
		this.section = WHOLE_ARRANGEMENT;
		this.from = 1;
		this.to = Infinity;
	}
}
