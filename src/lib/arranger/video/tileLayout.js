/**
 * How the video tiles are laid out in the frame: so many across, as many
 * rows down as that takes. Four tiles can be 1 across (one column of
 * four), 2 across (two by two) or 4 across (one row).
 */
import { frameById } from '$lib/video/frames.js';

/**
 * The video as it's laid out now: its frame, and the tiles across and down.
 * @param {import('../tracks/lanes.js').TakeLane[]} lanes the A/V lanes
 * @param {import('./songVideo.js').SongVideo} video the song's
 */
export function wallLayout(lanes, video) {
	const frame = frameById(video.frame);
	const frameShape = frame.width / frame.height;
	const columns = columnsFor(lanes.length, video.columns, frameShape, filmShape(lanes, frameShape));
	return { frame, columns, rows: Math.ceil(lanes.length / columns) };
}

/**
 * Every way to lay out `count` tiles, by how many across. A column that
 * doesn't save a row is left out (four tiles 3 across is still two rows).
 * @param {number} count
 * @returns {{ columns: number, rows: number }[]}
 */
export function layoutChoices(count) {
	/** @param {number} columns */
	const rowsFor = (columns) => Math.ceil(count / columns);
	return Array.from({ length: count }, (_, index) => index + 1)
		.filter((columns) => columns === 1 || rowsFor(columns) < rowsFor(columns - 1))
		.map((columns) => ({ columns, rows: rowsFor(columns) }));
}

/**
 * How many across: the one chosen, or else the layout that crops the films
 * least (bestColumns).
 * @param {number} count
 * @param {number} chosen 0: none chosen
 * @param {number} frameShape the frame's width ÷ height
 * @param {number} filmShape the films' width ÷ height
 */
export function columnsFor(count, chosen, frameShape, filmShape) {
	if (chosen >= 1 && chosen <= count) return chosen;
	return bestColumns(count, frameShape, filmShape);
}

/**
 * The layout whose tiles are nearest the films' own shape, so filling a
 * tile crops the least: in a 9:16 reel, two films filmed upright go side by
 * side, three filmed sideways go one above another.
 * @param {number} count
 * @param {number} frameShape width ÷ height
 * @param {number} filmShape width ÷ height
 */
export function bestColumns(count, frameShape, filmShape) {
	const misfit = ({ columns = 1, rows = 1 }) =>
		Math.abs(Math.log(((frameShape / columns) * rows) / filmShape));
	const choices = layoutChoices(Math.max(1, count));
	return choices.reduce((best, each) => (misfit(each) < misfit(best) ? each : best)).columns;
}

/**
 * The films' shape (width ÷ height): the average of the lanes' filmed
 * takes, or `otherwise` before anything is filmed.
 * @param {import('../tracks/lanes.js').TakeLane[]} lanes
 * @param {number} otherwise
 */
export function filmShape(lanes, otherwise) {
	const shapes = lanes.flatMap((lane) =>
		lane.clips.flatMap(({ take: { video } }) =>
			video?.width && video.height ? [Math.log(video.width / video.height)] : []
		)
	);
	if (shapes.length === 0) return otherwise;
	return Math.exp(shapes.reduce((total, each) => total + each, 0) / shapes.length);
}
