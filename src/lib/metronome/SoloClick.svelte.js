/**
 * A straight click on its own, for the Metronome page: the tempo, sound and
 * level in settings.metronome, straight to the speakers (no song, no mixer).
 * Any change while it clicks restarts it on the new settings.
 */
import { settings } from '$lib/settings/settings.svelte.js';
import { steadyClickGrid } from '$lib/arranger/playback/metronome/clickGrid.js';
import { startClicks } from '$lib/arranger/playback/metronome/clicker.js';
import { clickSoundById } from '$lib/arranger/playback/metronome/sounds.js';
import { clickClock, gainOf } from '$lib/arranger/playback/metronome/clickClock.js';
import { tempoClock } from '$lib/arranger/chart/tempoCurve.js';
import { validTempo } from '$lib/arranger/chart/tempo.js';

/** Lead before the first click (seconds). */
const START_DELAY = 0.1;

export class SoloClick {
	on = $state(false);
	prefs = settings.metronome;

	/** @type {import('tone').Gain | null} */
	#level = null;
	#stopClicks = () => {};
	/** Counts every start, so one overtaken while Tone loads gives up. */
	#run = 0;
	/** @type {ReturnType<typeof clickClock>} */
	#clock = null;

	toggle() {
		if (this.on) this.stop();
		else this.start();
	}

	async start() {
		this.on = true;
		const run = ++this.#run;
		this.#halt();
		const Tone = await import('tone');
		await Tone.start();
		if (run !== this.#run || !this.on) return;

		this.#level = new Tone.Gain(gainOf(this.prefs.level)).toDestination();
		const grid = steadyClickGrid();
		const clicks = {
			grid,
			origin: Tone.now() + START_DELAY,
			clock: tempoClock([], this.prefs.tempo, grid.lengthQuarters)
		};
		const sound = clickSoundById(this.prefs.sound);
		this.#stopClicks = startClicks(Tone, { ...clicks, sound, destination: this.#level });
		this.#clock = clickClock(Tone, clicks);
	}

	stop() {
		this.on = false;
		this.#run++;
		this.#halt();
	}

	/** @param {number} bpm */
	setTempo(bpm) {
		this.prefs.tempo = validTempo(bpm);
		this.#restartIfOn();
	}

	/** @param {string} id a sound from sounds.js */
	setSound(id) {
		this.prefs.sound = id;
		this.#restartIfOn();
	}

	/** Follow the level as it's dragged (no restart). */
	applyLevel() {
		if (this.#level) this.#level.gain.value = gainOf(this.prefs.level);
	}

	/** Beats since the first click, by the clock you hear (null when off). */
	beatsNow() {
		const clock = this.#clock;
		return clock ? clock.beatsAt(clock.now() - clock.origin) : null;
	}

	#restartIfOn() {
		if (this.on) this.start();
	}

	#halt() {
		this.#stopClicks();
		this.#stopClicks = () => {};
		this.#level?.dispose();
		this.#level = null;
		this.#clock = null;
	}
}
