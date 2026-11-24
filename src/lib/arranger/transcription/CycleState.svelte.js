/**
 * Transcribe's cycle, like Logic's: a region from bar line to bar line that
 * the player loops while it's on. The region is kept while it's off, so
 * turning it on again (the Cycle button, C) brings it back.
 */
import { barLabel } from './barNumbers.js';
import { secondsAt, secondsAtBeat } from './tempoMap.js';
import { sectionCycles } from './cycle.js';

/** Turned on while stopped outside it, the player starts this many beats before it. */
const LEAD_IN_BEATS = 2;

/**
 * @typedef {import('./cycle.js').Cycle} Cycle
 * @typedef {import('./TranscriptionState.svelte.js').TranscriptionState} TranscriptionState
 */

export class CycleState {
	/** @type {Cycle | null} quarters from bar 1 */
	region = $state.raw(null);
	on = $state(false);

	/** The region as moments of the recording, for the player (null: off). */
	seconds = $derived.by(() => {
		const grid = this.#transcription.grid;
		if (!grid || !this.on || !this.region) return null;
		return { from: secondsAt(grid, this.region.from), to: secondsAt(grid, this.region.to) };
	});

	/** The named sections as regions, for the Cycle menu (each with its name and bar). */
	sections = $derived.by(() => {
		const { markers, bars, grid, pickupBar } = this.#transcription;
		return sectionCycles(markers, bars, grid?.bars.firstBeat ?? 0).map((section) => ({
			...section,
			label: barLabel(section.number, pickupBar)
		}));
	});

	#transcription;

	/** @param {TranscriptionState} transcription */
	constructor(transcription) {
		this.#transcription = transcription;
	}

	/** @param {Cycle} region a new region, turned on */
	set(region) {
		this.region = region;
		this.turn(true);
	}

	/**
	 * Before Play: with the cycle on, a playhead outside it starts at the
	 * cycle's start, so Play runs the cycle; inside it, Play carries on from there.
	 */
	startFromCycle() {
		const span = this.seconds;
		const player = this.#transcription.player;
		if (!span || player.playing) return;
		if (player.time < span.from || player.time >= span.to) player.seek(span.from);
	}

	/** After a pause: with the cycle on, back to its start, ready to go round again. */
	backToStart() {
		const span = this.seconds;
		if (span) this.#transcription.player.seek(span.from);
	}

	clear() {
		this.region = null;
		this.on = false;
	}

	/**
	 * Turn the cycle on or off. Turned on while stopped outside it, the
	 * player waits a couple of beats before it, so you hear it come in.
	 * @param {boolean} on
	 */
	turn(on) {
		this.on = on && this.region !== null;
		const { grid, player } = this.#transcription;
		if (!this.on || !this.region || !grid || player.playing) return;
		const time = player.time;
		const inside =
			time >= secondsAt(grid, this.region.from) && time < secondsAt(grid, this.region.to);
		if (!inside) player.seek(leadInBefore(grid.beats, this.region.from + grid.bars.firstBeat));
	}

	/** @param {number} number cycle just this bar, or turn the cycle off when it already is */
	toggleBar(number) {
		const region = this.#barRegion(number);
		if (!region) return;
		if (this.isJustBar(number)) this.turn(false);
		else this.set(region);
	}

	/** @param {Cycle} region the cycle is on and is exactly this region */
	isRegion(region) {
		return this.on && this.region?.from === region.from && this.region?.to === region.to;
	}

	/** @param {number} number the cycle is on and is just this bar */
	isJustBar(number) {
		const region = this.#barRegion(number);
		if (!region || !this.on || !this.region) return false;
		return this.region.from === region.from && this.region.to === region.to;
	}

	/** @param {number} number */
	#barRegion(number) {
		const { grid, bars } = this.#transcription;
		const bar = bars.find((each) => each.number === number);
		if (!bar || !grid) return null;
		const from = bar.firstBeat - grid.bars.firstBeat;
		return { from, to: from + bar.beats };
	}
}

/**
 * Where to start playing so a couple of beats come before this one.
 * @param {number[]} beats the grid's beats, in seconds
 * @param {number} beat
 */
export function leadInBefore(beats, beat) {
	return Math.max(0, secondsAtBeat(beats, beat - LEAD_IN_BEATS));
}
