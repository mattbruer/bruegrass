/**
 * A song's video, as saved with it (`song.video`): which audio lanes are
 * A/V lanes (they film as they record) and how their tiles are laid out.
 * Plain data; the films themselves are with the takes (storage/songTakes.js).
 */
import { DEFAULT_FRAME, frameById } from '$lib/video/frames.js';
import { validFraming } from '$lib/video/framing.js';

/**
 * @typedef {{
 *   lanes: string[], columns: number, frame: string,
 *   framing: Record<string, import('$lib/video/framing.js').Framing>
 * }} SongVideo
 *   lanes: the A/V lanes, by record track; columns: tiles across (0: the layout that shows
 *   the films biggest); frame: the finished video's shape, an id in $lib/video/frames.js;
 *   framing: how each lane's film sits in its tile, by record track (missing: centred)
 */

/** @type {SongVideo} */
export const NO_VIDEO = Object.freeze({
	lanes: [],
	columns: 0,
	frame: DEFAULT_FRAME.id,
	framing: {}
});

/**
 * @param {unknown} video as saved (missing on songs from before video)
 * @returns {SongVideo}
 */
export function validVideo(video) {
	const saved = /** @type {Partial<SongVideo> | null | undefined} */ (video);
	return {
		lanes: Array.isArray(saved?.lanes) ? saved.lanes : [],
		columns: Number.isInteger(saved?.columns) ? /** @type {number} */ (saved?.columns) : 0,
		frame: frameById(saved?.frame ?? '').id,
		framing: Object.fromEntries(
			Object.entries(saved?.framing ?? {}).map(([id, framing]) => [id, validFraming(framing)])
		)
	};
}

/**
 * @param {SongVideo} video
 * @param {string} trackId
 * @param {import('$lib/video/framing.js').Framing} framing
 * @returns {SongVideo}
 */
export function withFraming(video, trackId, framing) {
	return { ...video, framing: { ...video.framing, [trackId]: framing } };
}

/** @param {SongVideo} video @param {string} trackId */
export function isFilmed(video, trackId) {
	return video.lanes.includes(trackId);
}

/**
 * @param {SongVideo} video
 * @param {string} trackId
 * @param {boolean} filmed
 * @returns {SongVideo} with the best layout again: one chosen for so many tiles isn't for more
 */
export function withFilmedLane(video, trackId, filmed) {
	const others = video.lanes.filter((id) => id !== trackId);
	const lanes = filmed ? [...others, trackId] : others;
	return { ...video, lanes, columns: lanes.length === video.lanes.length ? video.columns : 0 };
}
