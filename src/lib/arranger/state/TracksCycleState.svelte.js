/**
 * The Tracks page's cycle, Logic's way and like Transcribe's: a stretch of
 * bars the band plays round and round while it's on. The band loops whole
 * bars, so its ends sit on bar lines. Kept while off, so turning it on again
 * (the Cycle button, C) brings it back; made afresh each visit.
 */
import { cycleBarNumbers, sectionCycles } from '../transcription/cycle.js';

/** @typedef {import('../transcription/cycle.js').Cycle} Cycle */

export class TracksCycleState {
	/** @type {Cycle | null} quarters from bar 1 */
	region = $state.raw(null);
	on = $state(false);

	#ruler;

	/** @param {() => import('../tracks/ruler.js').RulerBar[]} ruler the song's bars on the tracks */
	constructor(ruler) {
		this.#ruler = ruler;
	}

	/** The bars the band cycles, numbered from 1 (null: off). */
	bars = $derived(this.on && this.region ? cycleBarNumbers(this.region, this.#ruler()) : null);

	/** Each section of the chart as a cycle, for the Cycle menu. */
	sections = $derived.by(() => {
		const bars = this.#ruler().filter((bar) => bar.number > 0);
		/** @type {Record<number, string>} */
		const starts = {};
		for (const bar of bars) if (bar.sectionName) starts[bar.number] = bar.sectionName;
		const placed = bars.map((bar) => ({
			number: bar.number,
			firstBeat: bar.start,
			beats: bar.beats
		}));
		return sectionCycles(starts, placed, 0);
	});

	/** @param {Cycle} region a new region, turned on */
	set(region) {
		this.region = region;
		this.turn(true);
	}

	/** @param {boolean} on */
	turn(on) {
		this.on = on && this.region !== null;
	}

	/** @param {Cycle} region the cycle is on and is exactly this region */
	isRegion(region) {
		return this.on && this.region?.from === region.from && this.region?.to === region.to;
	}
}
