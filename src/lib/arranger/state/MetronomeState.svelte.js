/**
 * The metronome: a click you can turn on with or without the song. Alone it
 * clicks in the meter and sound chosen in its menu; while the song plays it
 * follows the song's bars. Off each time the page opens (not saved with the song).
 */
import { settings } from '$lib/settings/settings.svelte.js';
import { getMetronomeInput } from '../playback/mixerGraph.svelte.js';
import { soloClickGrid } from '../playback/metronome/clickGrid.js';
import { startClicks } from '../playback/metronome/clicker.js';
import { clickSoundById } from '../playback/metronome/sounds.js';

/** Lead before the first click when it starts alone (seconds). */
const START_DELAY = 0.1;

/** The level's range, in dB before the output stage. */
export const LEVEL_MIN_DB = -40;
export const LEVEL_MAX_DB = 0;

const MAX_BEATS = 12;
const UNITS = [4, 8];

/** @param {number} db */
function gainOf(db) {
	return 10 ** (db / 20);
}

export class MetronomeState {
	/** Is the click on? */
	on = $state(false);

	/** The sound, level and meter, remembered in settings. */
	prefs = settings.metronome;

	/** @type {import('./PlayerState.svelte.js').PlayerState} */
	#player;
	/** @type {import('./ArrangementState.svelte.js').ArrangementState} */
	#arrangement;
	/** The metronome's gain node, once the audio is built (null before). */
	#node = /** @type {import('tone').Gain | null} */ (null);
	/** Stops the clicks now sounding (null when none). */
	#stopClicks = /** @type {(() => void) | null} */ (null);
	/** Counts every sync, so a start overtaken while it loads gives up. */
	#run = 0;
	/** The click's clock while it sounds: when the first click falls and how long a beat is (null when off). */
	#clock = /** @type {{ origin: number, beatSeconds: number, now: () => number } | null} */ (null);

	/**
	 * @param {import('./PlayerState.svelte.js').PlayerState} player
	 * @param {import('./ArrangementState.svelte.js').ArrangementState} arrangement
	 */
	constructor(player, arrangement) {
		this.#player = player;
		this.#arrangement = arrangement;
	}

	async toggle() {
		this.on = !this.on;
		await this.sync();
	}

	turnOff() {
		this.on = false;
		this.sync();
	}

	/** @param {string} id a sound from sounds.js */
	async setSound(id) {
		this.prefs.sound = id;
		await this.sync();
	}

	/**
	 * @param {number} beats
	 * @param {number} unit 4 or 8
	 */
	async setMeter(beats, unit) {
		this.prefs.beats = Math.min(MAX_BEATS, Math.max(1, Math.round(beats) || 1));
		this.prefs.unit = UNITS.includes(unit) ? unit : 4;
		await this.sync();
	}

	/** Apply the level the menu chose (no restart: it changes while the click plays). */
	applyLevel() {
		if (this.#node) this.#node.gain.value = gainOf(this.prefs.level);
	}

	/**
	 * Start, restart or stop the click to match what's happening: the song's
	 * clicks while it plays, otherwise a click alone in the chosen meter.
	 */
	async sync() {
		const run = ++this.#run;
		this.#halt();
		if (!this.on) return;

		const Tone = await import('tone');
		await Tone.start();
		const node = await getMetronomeInput();
		if (run !== this.#run || !this.on) return;

		this.#node = /** @type {import('tone').Gain} */ (node);
		this.applyLevel();
		const clicks = this.#player.playback?.clicks ?? this.#soloClicks(Tone);
		const sound = clickSoundById(this.prefs.sound);
		this.#stopClicks = startClicks(Tone, { ...clicks, sound, destination: node });
		this.#clock = clickClock(Tone, clicks);
	}

	/**
	 * Beats since the first click, by the clock you hear (null when off), for
	 * drawing the pendulum on the beat.
	 */
	beatsNow() {
		const clock = this.#clock;
		return clock ? (clock.now() - clock.origin) / clock.beatSeconds : null;
	}

	#halt() {
		this.#stopClicks?.();
		this.#stopClicks = null;
		this.#clock = null;
	}

	/** @param {typeof import('tone')} Tone */
	#soloClicks(Tone) {
		return {
			origin: Tone.now() + START_DELAY,
			quarterSeconds: 60 / this.#arrangement.bpm,
			grid: soloClickGrid({ beats: this.prefs.beats, unit: this.prefs.unit })
		};
	}
}

/**
 * @param {typeof import('tone')} Tone
 * @param {{ origin: number, quarterSeconds: number, grid: import('../playback/metronome/clickGrid.js').ClickGrid }} clicks
 */
function clickClock(Tone, { origin, quarterSeconds, grid }) {
	if (grid.beats.length === 0) return null;
	const raw = /** @type {AudioContext} */ (/** @type {unknown} */ (Tone.getContext().rawContext));
	return {
		origin,
		beatSeconds: (quarterSeconds * grid.lengthQuarters) / grid.beats.length,
		// What's heard lags the audio clock by the output's latency (a lot, over Bluetooth)
		now: () => Tone.immediate() - (raw.outputLatency || 0)
	};
}
