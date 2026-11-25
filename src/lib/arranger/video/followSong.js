/**
 * A Svelte action for an A/V lane's <video>: every frame, show the film
 * that lane plays at this moment of the song (filmAt.js), where the band
 * is. While the band plays, the film plays at its take's speed (slower when
 * the tempo is down) and is kept in time: a small
 * drift is pulled in by playing a touch faster or slower, a big one (a
 * jump, a slow phone) by seeking. Stopped, it shows the frame at the
 * playhead. Where the lane has no filmed clip the tile goes blank.
 */
import { onEveryFrame } from '$lib/audio/analysis/frameLoop.js';
import { filmAt } from './filmAt.js';

/** Further out than this (seconds) and the film jumps to where it should be. */
const DRIFT_TO_SEEK = 0.1;
/** How hard a small drift is pulled in (speed change per second of drift), at most `MOST_PULL`. */
const PULL = 1;
const MOST_PULL = 0.05;
/** Stopped: the shown frame may be this far (seconds) from the playhead before it's sought. */
const STILL_FRAME_WITHIN = 0.02;

/**
 * @typedef {{
 *   clips: import('../tracks/lanes.js').LaneClip[],
 *   timeNow: () => number,
 *   restingAt: () => number,
 *   filmOf: (take: import('$lib/storage/songTakes.js').TakeDocument) => Promise<string | null>
 * }} FollowParams
 *   timeNow: seconds from bar 1 where the band is (NaN: stopped);
 *   restingAt: where the playhead rests while stopped; filmOf: a take's film URL
 * @param {HTMLVideoElement} video
 * @param {FollowParams} params
 */
export function followSong(video, params) {
	let current = params;
	/** The take whose film is loaded (or loading). */
	let showing = /** @type {string | null} */ (null);
	let loading = false;

	const stop = onEveryFrame(() => {
		const now = current.timeNow();
		const playing = Number.isFinite(now);
		const at = filmAt(current.clips, playing ? now : current.restingAt());
		if (!at) return blank();
		if (at.take.id !== showing) return void load(at.take);
		if (loading || video.seeking) return;
		video.style.visibility = 'visible';
		const drift = (at.time - video.currentTime) / at.speed; // in song time

		if (!playing) {
			if (!video.paused) video.pause();
			if (Math.abs(at.time - video.currentTime) > STILL_FRAME_WITHIN) video.currentTime = at.time;
			return;
		}
		if (video.paused) video.play().catch(() => {});
		if (Math.abs(drift) > DRIFT_TO_SEEK) video.currentTime = at.time;
		else
			video.playbackRate = at.speed * (1 + Math.max(-MOST_PULL, Math.min(MOST_PULL, drift * PULL)));
	});

	function blank() {
		if (!video.paused) video.pause();
		video.style.visibility = 'hidden';
	}

	/** @param {import('$lib/storage/songTakes.js').TakeDocument} take */
	async function load(take) {
		showing = take.id;
		loading = true;
		blank();
		const url = await current.filmOf(take);
		if (showing !== take.id) return; // another take was wanted meanwhile
		video.src = url ?? '';
		loading = false;
	}

	return {
		/** @param {FollowParams} next */
		update(next) {
			current = next;
		},
		destroy() {
			stop();
			video.pause();
			video.removeAttribute('src');
			video.load(); // lets go of the film
		}
	};
}
