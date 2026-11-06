/**
 * Playback: starting and stopping the band (and the melody), and any
 * problem to show the user.
 */
import { playArrangement } from '../instruments/guitar.js';
import { audioTaps } from '../playback/mixerGraph.svelte.js';
import { melodyEvents } from '../melody/melody.js';
import { melodyTime } from '../melody/follow.js';

/** @typedef {Awaited<ReturnType<typeof playArrangement>>} Playback */

export class PlayerState {
	/** @type {import('./ArrangementState.svelte.js').ArrangementState} */
	#arrangement;
	/** @type {import('./LoopState.svelte.js').LoopState} */
	#loop;
	/** @type {import('./MelodyState.svelte.js').MelodyState} */
	#melody;

	/** What's playing now (null when stopped). Its position() and beats() read the audio clock. */
	playback = /** @type {Playback | null} */ ($state(null));
	/** A problem to show under the player (empty when all is well). */
	problem = $state('');

	isPlaying = $derived(this.playback !== null);

	/** Which bars of the melody this playback covers, for following the sheet music. */
	#melodyTiming = { offset: 0, pickup: 0 };

	/**
	 * @param {import('./ArrangementState.svelte.js').ArrangementState} arrangement
	 * @param {import('./LoopState.svelte.js').LoopState} loop
	 * @param {import('./MelodyState.svelte.js').MelodyState} melody
	 */
	constructor(arrangement, loop, melody) {
		this.#arrangement = arrangement;
		this.#loop = loop;
		this.#melody = melody;
	}

	async play() {
		this.stop();
		this.problem = '';
		if (this.#arrangement.error) {
			this.problem = this.#arrangement.error;
			return;
		}

		try {
			this.playback = await playArrangement(this.#loop.sectionsToPlay, {
				capo: this.#arrangement.capoFret,
				transpose: this.#arrangement.transpose,
				bpm: this.#arrangement.bpm,
				melody: this.#melodyForThisPass()
			});
			// Each play is measured afresh, so the loudness reading is this song as it is now
			audioTaps.current?.output.resetLoudness();
		} catch (problem) {
			this.showProblem(problem);
		}
	}

	stop() {
		this.playback?.stop();
		this.playback = null;
	}

	/** After a change that affects what's playing (like the loop): start again with it. */
	restartIfPlaying() {
		if (this.isPlaying) this.play();
	}

	/** @param {unknown} problem */
	showProblem(problem) {
		this.problem = problem instanceof Error ? problem.message : String(problem);
	}

	/**
	 * Where the melody is right now, in quarter notes from bar 1 (NaN when
	 * stopped). The sheet music's cursor follows this.
	 */
	melodyTimeNow = () => {
		const clock = this.playback?.beats();
		return clock ? melodyTime(clock, this.#melodyTiming) : NaN;
	};

	/**
	 * The melody's notes for the bars about to play: all of them, or just
	 * the loop region's. The pickup only belongs to a pass that starts at bar 1.
	 */
	#melodyForThisPass() {
		const melody = this.#melody.line;
		const startInSong = this.#loop.startInSong;
		this.#melodyTiming = {
			offset: startInSong,
			pickup: startInSong === 0 ? (melody?.pickup ?? 0) : 0
		};
		if (!melody) return null;

		return melodyEvents(melody, {
			sections: this.#loop.sectionsToPlay,
			offset: startInSong,
			bpm: this.#arrangement.bpm,
			shift: this.#arrangement.transpose // ABC is at concert pitch, so the capo doesn't move it
		});
	}
}
