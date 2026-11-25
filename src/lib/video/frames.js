/**
 * The shapes a finished video can be, for where it will be posted. Plain
 * data: a new shape is one entry. Sizes are what the platforms ask for
 * (Nov 2026): Reels 9:16 at 1080×1920 (Meta's Reels docs; Facebook shows
 * reels at up to 720p), the feed 4:5 at 1080×1350, landscape 16:9.
 *
 * `covered`: how much of the top and bottom the app's own buttons and
 * caption cover, in pixels of the frame (a reel: the name at the top, the
 * caption and Like / Comment / Share at the bottom; third-party guides, not
 * a Meta spec). Keep faces and hands out of it.
 */

/**
 * @typedef {{
 *   id: string, name: string, width: number, height: number,
 *   covered: { top: number, bottom: number, topSays: string, bottomSays: string }
 * }} VideoFrame
 *   covered: topSays, bottomSays: what covers each band, written on it
 */

/** @type {readonly VideoFrame[]} */
export const FRAMES = Object.freeze([
	{
		id: 'reel',
		name: 'Reel 9:16',
		width: 1080,
		height: 1920,
		covered: {
			top: 210,
			bottom: 290,
			topSays: 'Facebook shows your name here',
			bottomSays: 'Facebook’s caption and buttons go here'
		}
	},
	{
		id: 'feed',
		name: 'Feed 4:5',
		width: 1080,
		height: 1350,
		covered: { top: 0, bottom: 0, topSays: '', bottomSays: '' }
	},
	{
		id: 'wide',
		name: 'Wide 16:9',
		width: 1920,
		height: 1080,
		covered: { top: 0, bottom: 0, topSays: '', bottomSays: '' }
	}
]);

export const DEFAULT_FRAME = FRAMES[0];

/** @param {string} id */
export function frameById(id) {
	return FRAMES.find((frame) => frame.id === id) ?? DEFAULT_FRAME;
}
