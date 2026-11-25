/**
 * Playback: starting and stopping the band (and the melody), and any
 * problem to show the user.
 */
import { playArrangement } from '../playback/livePlayback.js';
import { audioTaps } from '../mixer/mixerGraph.svelte.js';
import { melodyEvents } from '../melody/melody.js';
import { melodyTime } from '../melody/follow.js';
import { MetronomeState } from './MetronomeState.svelte.js';
import { abcjsReady } from './abcjsLoaded.svelte.js';
import { rhythm } from '../chart/timeline.js';
import { getMetronomeInput } from '../mixer/mixerGraph.svelte.js';
import { countInClicks } from '../playback/metronome/countIn.js';
import { playCountIn } from '../playback/metronome/playCountIn.js';
import { clickSoundById } from '../playback/metronome/sounds.js';
import { firstBar } from '../takes/takeTiming.js';
import { songStartOf } from '../playback/songStart.js';
import { settings } from '$lib/settings/settings.svelte.js';

/** @typedef {Awaited<ReturnType<typeof playArrangement>>} Playback */

/** How long the band keeps sounding after its last pass, for the last chord to ring (seconds). */
const RING_OUT = 2;

export class PlayerState {
	/** @type {import('./ArrangementState.svelte.js').ArrangementState} */
	#arrangement;
	/** @type {import('./LoopState.svelte.js').LoopState} */
	#loop;
	/** @type {import('./MelodyState.svelte.js').MelodyState} */
	#melody;
	/** @type {import('./BassState.svelte.js').BassState} */
	#bass;
	/** What you've changed about the mandolin's chops and the guitar's chords (the song's). */
	#edits;

	/** What's playing now (null when stopped). Its position() and beats() read the audio clock. */
	playback = /** @type {Playback | null} */ ($state(null));
	/** A problem to show under the player (empty when all is well). */
	problem = $state('');

	isPlaying = $derived(this.playback !== null);
	/** Where the song starts, quarters from bar 1: the pickup bar's start when the tune has one (songStart.js). */
	songStart = $derived(
		songStartOf(
			this.#melody.pickup > 0,
			firstBar(this.#arrangement.sections, this.#arrangement.bpm).quarters
		)
	);

	/** The click; it follows the playback's bars while the song plays. */
	metronome;

	/** Which bars of the melody this playback covers, for following the sheet music. */
	#melodyTiming = { offset: 0, pickup: 0 };

	/**
	 * The recorded takes to play along (set by RecordingState).
	 * @type {(leaveOutTrack: string | null) => Promise<import('../takes/playTakes.js').PlayableTake[]>}
	 */
	takesToPlay = async () => [];

	/** Called once when this playback stops (recording saves its take then). */
	#onStop = /** @type {(() => void) | null} */ (null);
	/**
	 * With the loop off, where Stop left off (quarters from bar 1 of the
	 * song), so Play carries on from there; 0 is the start.
	 */
	resumeAt = $state(0);
	/** This playback carries on from where it's stopped (the loop is off, and it isn't a recording). */
	#resumable = false;
	/** When this playback's count-in starts (audio-clock seconds; the band's start without one). */
	countInAt = 0;
	#stopCountIn = () => {};
	/** Stops a playback that doesn't loop once it has rung out. */
	#endTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);

	/**
	 * @param {import('./ArrangementState.svelte.js').ArrangementState} arrangement
	 * @param {import('./LoopState.svelte.js').LoopState} loop
	 * @param {import('./MelodyState.svelte.js').MelodyState} melody
	 * @param {import('./BassState.svelte.js').BassState} bass
	 * @param {() => { chops: import('../instruments/chopEdits.js').ChopEdits, guitar: import('../instruments/guitarEdits.js').GuitarEdits }} edits
	 */
	constructor(arrangement, loop, melody, bass, edits) {
		this.#arrangement = arrangement;
		this.#loop = loop;
		this.#melody = melody;
		this.#bass = bass;
		this.#edits = edits;
		this.metronome = new MetronomeState(this);
	}

	/**
	 * Loops until stopped, or with the loop switched off plays once and stops,
	 * and carries on from where Stop left it next time. Only recording counts in.
	 * @param {{ countIn?: boolean, passes?: number, leaveOutTrack?: string, onStop?: () => void }} [options]
	 *   for recording: countIn (always, for a take), passes (stop after this many),
	 *   leaveOutTrack (don't play the track being recorded on), onStop
	 */
	async play({ countIn = false, passes, leaveOutTrack, onStop } = {}) {
		this.stop();
		const once = passes === undefined && !this.#loop.repeats;
		this.problem = '';
		if (this.#arrangement.error) {
			this.problem = this.#arrangement.error;
			return;
		}

		try {
			// The tune and bass are read once abcjs is in (it loads after the page)
			await abcjsReady();
			const bpm = this.#arrangement.bpm;
			const bar = firstBar(this.#loop.sectionsToPlay, bpm);
			const countInBars = countIn ? settings.metronome.countInBars : 0;
			const from = once ? this.resumeInPass() : 0;
			this.playback = await playArrangement(this.#loop.sectionsToPlay, {
				capo: this.#arrangement.capoFret,
				transpose: this.#arrangement.transpose,
				bpm,
				melody: this.#melodyForThisPass(),
				bass: this.#bass.written,
				...this.#edits(),
				swing: this.#arrangement.swing,
				tempoCurve: this.#arrangement.tempoCurve,
				offset: this.#loop.startInSong,
				takes: await this.takesToPlay(leaveOutTrack ?? null),
				regionStart: this.#arrangement.clock.secondsAt(this.#loop.startInSong),
				countIn: countInBars * bar.seconds,
				passes: once ? 1 : passes,
				from
			});
			this.countInAt = this.playback.songStartsAt;
			if (countInBars > 0) await this.#countIn(this.playback, bar, countInBars);
			this.#resumable = once;
			this.#onStop = onStop ?? null;
			const playback = this.playback;
			const endsIn = playback.secondsLeft() + RING_OUT;
			if (Number.isFinite(endsIn)) {
				this.#endTimer = setTimeout(() => {
					if (this.playback === playback) this.stop();
				}, endsIn * 1000);
			}
			// Each play is measured afresh, so the loudness reading is this song as it is now
			audioTaps.current?.output.resetLoudness();
			this.metronome.sync();
		} catch (problem) {
			this.showProblem(problem);
		}
	}

	stop() {
		clearTimeout(this.#endTimer);
		this.#stopCountIn();
		this.#stopCountIn = () => {};
		if (this.playback && this.#resumable) this.resumeAt = this.#stoppedAt(this.playback);
		this.playback?.stop();
		this.playback = null;
		this.metronome.sync();
		const onStop = this.#onStop;
		this.#onStop = null;
		onStop?.();
	}

	/**
	 * Clicks before the band comes in (a pickup is sung over the last of them).
	 * @param {Playback} playback
	 * @param {{ seconds: number, quarters: number }} bar
	 * @param {number} bars
	 */
	async #countIn(playback, bar, bars) {
		const clicks = countInClicks({ bars, bar });
		this.countInAt = playback.songStartsAt - clicks.seconds;
		const Tone = await import('tone');
		const metronomeInput = /** @type {import('tone').ToneAudioNode} */ (await getMetronomeInput());
		if (this.playback !== playback) return; // stopped meanwhile
		const run = {
			beats: clicks.beats,
			beatsPerBar: bar.quarters,
			beatSeconds: bar.seconds / bar.quarters,
			sound: clickSoundById(settings.metronome.sound),
			destination: metronomeInput
		};
		this.#stopCountIn = playCountIn(Tone, run, this.countInAt);
	}

	/** Back to the start: the next Play begins there (and a playing band starts over). */
	toStart() {
		this.goTo(0);
	}

	/**
	 * The next Play begins here, and a playing band carries on from here
	 * (with the loop off; with it on, Play always starts at the top).
	 * @param {number} quarters from bar 1
	 */
	goTo(quarters) {
		this.resumeAt = Math.max(0, quarters);
		if (this.isPlaying) {
			this.#resumable = false; // so stopping to move doesn't remember where it was
			this.play();
		}
	}

	/**
	 * Where in the song this playback is (quarters from bar 1), or 0 once
	 * it has played through.
	 * @param {Playback} playback
	 */
	#stoppedAt(playback) {
		const clock = playback.beats();
		return clock ? this.#loop.startInSong + Math.max(0, clock.elapsed) : 0;
	}

	/** Where the next Play carries on in what's about to play (quarters into it): 0 for the top. */
	resumeInPass() {
		if (this.#loop.repeats) return 0;
		const into = this.resumeAt - this.#loop.startInSong;
		const length = rhythm(this.#loop.sectionsToPlay).quarters;
		return into > 0 && into < length ? into : 0;
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
			pickup: startInSong === 0 ? this.#melody.pickup : 0
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
