/**
 * The band's click: armed with the metronome key, it clicks along whenever
 * the band plays, following the song's bars, and is silent while stopped.
 * Armed or not is this device's habit (settings), like the count-in. A click
 * on its own is the Metronome page's ($lib/metronome/).
 */
import { settings } from '$lib/settings/settings.svelte.js';
import { getMetronomeInput } from '../mixer/mixerGraph.svelte.js';
import { startClicks } from '../playback/metronome/clicker.js';
import { clickSoundById } from '../playback/metronome/sounds.js';
import { clickClock, gainOf } from '../playback/metronome/clickClock.js';

export { LEVEL_MAX_DB, LEVEL_MIN_DB } from '../playback/metronome/clickClock.js';

export class MetronomeState {
	/** The sound, level and meter, remembered in settings. */
	prefs = settings.metronome;

	/** @type {import('./PlayerState.svelte.js').PlayerState} */
	#player;
	/** The metronome's gain node, once the audio is built (null before). */
	#node = /** @type {import('tone').Gain | null} */ (null);
	/** Stops the clicks now sounding (null when none). */
	#stopClicks = /** @type {(() => void) | null} */ (null);
	/** Counts every sync, so a start overtaken while it loads gives up. */
	#run = 0;
	/** The click's clock while it sounds (null when silent). */
	#clock = /** @type {ReturnType<typeof clickClock>} */ (null);

	/** @param {import('./PlayerState.svelte.js').PlayerState} player */
	constructor(player) {
		this.#player = player;
	}

	/** Is the click armed to play with the band? */
	get on() {
		return this.prefs.withBand;
	}

	/** Arm or disarm it; a playing band gains or loses its click at once. */
	async toggle() {
		this.prefs.withBand = !this.prefs.withBand;
		await this.sync();
	}

	/** @param {string} id a sound from sounds.js */
	async setSound(id) {
		this.prefs.sound = id;
		await this.sync();
	}

	/** Apply the level the menu chose (no restart: it changes while the click plays). */
	applyLevel() {
		if (this.#node) this.#node.gain.value = gainOf(this.prefs.level);
	}

	/** Start, restart or stop the click to match the band: clicking while it plays and the key is lit. */
	async sync() {
		const run = ++this.#run;
		this.#halt();
		const clicks = this.#player.playback?.clicks;
		if (!this.on || !clicks) return;

		const Tone = await import('tone');
		const node = await getMetronomeInput();
		if (run !== this.#run) return;

		this.#node = /** @type {import('tone').Gain} */ (node);
		this.applyLevel();
		const sound = clickSoundById(this.prefs.sound);
		this.#stopClicks = startClicks(Tone, { ...clicks, sound, destination: node });
		this.#clock = clickClock(Tone, clicks);
	}

	/**
	 * Beats since the first click, by the clock you hear (null when silent),
	 * for drawing the pendulum on the beat.
	 */
	beatsNow() {
		const clock = this.#clock;
		return clock ? clock.beatsAt(clock.now() - clock.origin) : null;
	}

	#halt() {
		this.#stopClicks?.();
		this.#stopClicks = null;
		this.#clock = null;
	}
}
