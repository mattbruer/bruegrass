/**
 * The shapes a finished video can be, for where it will be posted. Plain
 * data: a new shape is one entry. Sizes are what the platforms ask for
 * (Nov 2026): Reels 9:16 at 1080×1920 (Meta's Reels docs; Facebook shows
 * reels at up to 720p), the feed 4:5 at 1080×1350, landscape 16:9.
 *
 * Facebook lays its name, caption and buttons over a reel's top and bottom;
 * a reel shows the films under them anyway (the user's own reels do).
 */

/**
 * @typedef {{
 *   id: string, name: string, width: number, height: number
 * }} VideoFrame
 */

/** @type {readonly VideoFrame[]} */
export const FRAMES = Object.freeze([
	{
		id: 'reel',
		name: 'Reel 9:16',
		width: 1080,
		height: 1920
	},
	{
		id: 'feed',
		name: 'Feed 4:5',
		width: 1080,
		height: 1350
	},
	{
		id: 'wide',
		name: 'Wide 16:9',
		width: 1920,
		height: 1080
	}
]);

export const DEFAULT_FRAME = FRAMES[0];

/** @param {string} id */
export function frameById(id) {
	return FRAMES.find((frame) => frame.id === id) ?? DEFAULT_FRAME;
}
