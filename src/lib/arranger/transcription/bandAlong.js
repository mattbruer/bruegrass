/**
 * The band (guitar, mandolin, bass) playing along with the recording in
 * Transcribe. The band's notes are worked out as usual (performance.js),
 * then each is moved onto the recording's own time through its tempo map,
 * so the band follows the recording's drift. While it plays, the stretch
 * player says where the song is heard on the audio clock (its `Clock`);
 * each report queues the notes due a little ahead, at any speed. A jump
 * (a seek, the cycle going round) or a pause stops the band; the next
 * report starts a fresh one from there.
 */
import { secondsAt } from './tempoMap.js';

/** Queue notes this far ahead of what's heard (seconds of the audio clock). */
const LOOKAHEAD = 0.2;
/** A report this far from where the song should be by now was a jump (seconds of song). */
const JUMP_TOLERANCE = 0.03;
/** A note already this late when queued (a band still being made) is left out (seconds). */
const TOO_LATE = 0.02;

/**
 * @typedef {{ note: any, index: number, start: number, stop: number | null, duration: number | null }} SongNote
 *   one band note on the recording's time: start, stop in seconds into the
 *   recording; duration in seconds of recording (for the upright)
 * @typedef {{ notes: SongNote[], play: (note: any, index: number, at: number) => void }} SongStream
 * @typedef {{ streams: { notes: { time: number }[], play: (note: any, index: number, at: number) => void }[], stop: () => void }} Band
 */

/**
 * Each of the band's streams with its notes moved onto the recording's time.
 * @param {Band['streams']} streams from createBand, for one pass not looping
 * @param {number} quarter seconds per quarter the performance was worked out at
 * @param {import('./beatGrid.js').BeatGrid} grid
 * @returns {SongStream[]}
 */
export function streamsOnRecording(streams, quarter, grid) {
	/** @param {number} seconds into the performance */
	const onRecording = (seconds) => secondsAt(grid, seconds / quarter);
	return streams.map(({ notes, play }) => ({
		play,
		notes: notes
			.map((note, index) => {
				const { time, stop, duration } =
					/** @type {{ time: number, stop?: number, duration?: number }} */ (note);
				const start = onRecording(time);
				return {
					note,
					index,
					start,
					stop: stop === undefined ? null : onRecording(stop),
					duration: duration === undefined ? null : onRecording(time + duration) - start
				};
			})
			.toSorted((a, b) => a.start - b.start)
	}));
}

/**
 * Play a band along with the recording, following the stretch player's clock.
 * @param {{
 *   makeBand: () => Promise<{ band: Band, streams: SongStream[] } | null>,
 *   loop: () => { from: number, to: number } | null,
 *   now: () => number
 * }} options
 *   makeBand: a fresh band and its notes on the recording's time (null: nothing to play);
 *   loop: the stretch the player goes round (it never plays past its end);
 *   now: the audio clock
 */
export function createBandAlong({ makeBand, loop, now }) {
	/** @type {{ band: Band, streams: SongStream[] } | null} */
	let playing = null;
	/** @type {Promise<unknown> | null} a band being made */
	let making = null;
	/** @type {import('$lib/slowDowner/StretchPlayer.svelte.js').Clock | null} */
	let last = null;
	/** Song seconds queued up to. */
	let queuedTo = 0;

	function stop() {
		playing?.band.stop();
		playing = null;
		last = null;
	}

	/** @param {import('$lib/slowDowner/StretchPlayer.svelte.js').Clock} clock */
	function isJump(clock) {
		if (!last) return true;
		const expected = last.seconds + (clock.at - last.at) * last.speed;
		return Math.abs(expected - clock.seconds) > JUMP_TOLERANCE;
	}

	/** @param {import('$lib/slowDowner/StretchPlayer.svelte.js').Clock} clock */
	function queue(clock) {
		if (!playing) return;
		const cycle = loop();
		let until = clock.seconds + LOOKAHEAD * clock.speed;
		if (cycle && clock.seconds < cycle.to) until = Math.min(until, cycle.to);
		/** @param {number} seconds into the recording */
		const heardAt = (seconds) => clock.at + (seconds - clock.seconds) / clock.speed;

		for (const stream of playing.streams) {
			for (const { note, index, start, stop, duration } of stream.notes) {
				if (start < queuedTo) continue;
				if (start >= until) break;
				const at = heardAt(start);
				if (at < now() - TOO_LATE) continue;
				stream.play(
					{
						...note,
						time: at,
						...(stop !== null && { stop: heardAt(stop) }),
						...(duration !== null && { duration: duration / clock.speed })
					},
					index,
					at
				);
			}
		}
		queuedTo = Math.max(queuedTo, until);
	}

	return {
		/**
		 * Where the song is heard now: queue what's coming (a jump starts a fresh band from there).
		 * @param {import('$lib/slowDowner/StretchPlayer.svelte.js').Clock} clock
		 */
		follow(clock) {
			if (isJump(clock)) {
				stop();
				queuedTo = clock.seconds;
			}
			last = clock;
			if (playing) return queue(clock);
			if (making) return;
			making = makeBand()
				.then((made) => {
					if (!made) return;
					if (last) {
						playing = made;
						queue(last);
					} else made.band.stop();
				})
				.finally(() => (making = null));
		},

		/** Silence the band (a pause, or the notes changed): the next report starts afresh. */
		stop
	};
}
