/**
 * A song's video, as saved with it (`song.video`): which audio lanes are
 * A/V lanes (they film as they record) and how their tiles are laid out.
 * Plain data; the films themselves are with the takes (storage/songTakes.js).
 */

/**
 * @typedef {{ lanes: string[], columns: number }} SongVideo
 *   lanes: the A/V lanes, by record track; columns: tiles across (0: the usual for how many)
 */

/** @type {SongVideo} */
export const NO_VIDEO = Object.freeze({ lanes: [], columns: 0 });

/**
 * @param {unknown} video as saved (missing on songs from before video)
 * @returns {SongVideo}
 */
export function validVideo(video) {
	const saved = /** @type {Partial<SongVideo> | null | undefined} */ (video);
	return {
		lanes: Array.isArray(saved?.lanes) ? saved.lanes : [],
		columns: Number.isInteger(saved?.columns) ? /** @type {number} */ (saved?.columns) : 0
	};
}

/** @param {SongVideo} video @param {string} trackId */
export function isFilmed(video, trackId) {
	return video.lanes.includes(trackId);
}

/**
 * @param {SongVideo} video
 * @param {string} trackId
 * @param {boolean} filmed
 * @returns {SongVideo}
 */
export function withFilmedLane(video, trackId, filmed) {
	const others = video.lanes.filter((id) => id !== trackId);
	return { ...video, lanes: filmed ? [...others, trackId] : others };
}
