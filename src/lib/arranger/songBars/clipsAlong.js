/**
 * An audio lane's clips when bars are taken out of the song or put in, as
 * Logic cuts and inserts time: clips are split at the edges, what's inside
 * bars taken out goes, and everything after moves by the bars' length. The
 * takes' audio is never touched (takes/clips.js).
 *
 * Places are in the take's own time (seconds from bar 1 at the tempo it was
 * recorded at), as clips keep them; the caller works them out per take.
 *
 * @typedef {import('../takes/clips.js').AudioClip} AudioClip
 * @typedef {import('$lib/storage/songTakes.js').TakeDocument} TakeDocument
 */
import { clipStart, movedBy, splitClipAt } from '../takes/clips.js';

/** Closer than this (seconds) counts as on the edge. */
const ON_THE_EDGE = 0.001;

/**
 * @param {{ clip: AudioClip, take: TakeDocument }[]} clips the lane's
 * @param {(take: TakeDocument) => { from: number, to: number }} span the bars taken out, in that take's time
 * @returns {AudioClip[]}
 */
export function clipsWithoutTime(clips, span) {
	return clips.flatMap(({ clip, take }) => {
		const { from, to } = span(take);
		return splitClipAt(clip, take, [from, to]).flatMap((piece) => {
			const start = clipStart(piece, take);
			if (start >= to - ON_THE_EDGE) return [movedBy(piece, -(to - from))];
			return start >= from - ON_THE_EDGE ? [] : [piece];
		});
	});
}

/**
 * @param {{ clip: AudioClip, take: TakeDocument }[]} clips
 * @param {(take: TakeDocument) => { from: number, to: number }} span the empty bars put in, in that take's time
 * @returns {AudioClip[]}
 */
export function clipsWithTime(clips, span) {
	return clips.flatMap(({ clip, take }) => {
		const { from, to } = span(take);
		return splitClipAt(clip, take, [from]).map((piece) =>
			clipStart(piece, take) >= from - ON_THE_EDGE ? movedBy(piece, to - from) : piece
		);
	});
}
