/**
 * Which film shows on an A/V lane at a moment of the song, and where in it.
 * The lane's clips say which take plays there (the same clips as its
 * sound, so trimming or comping the sound cuts the film with it), and the
 * take's film offset says where its first sample is in the film. A take at
 * another tempo than it was recorded at plays its film at the same speed
 * as its sound (takes/takeTempo.js).
 */

/**
 * @param {import('../tracks/lanes.js').LaneClip[]} clips the lane's
 * @param {number} seconds from bar 1
 * @returns {{ take: import('$lib/storage/songTakes.js').TakeDocument, time: number, speed: number } | null}
 *   time: seconds into the take's film; speed: how fast the film plays (null: no filmed clip there)
 */
export function filmAt(clips, seconds) {
	const here = clips.findLast(
		(each) => each.take.video && seconds >= each.start && seconds < each.end
	);
	if (!here?.take.video) return null;
	return {
		take: here.take,
		time:
			here.take.video.offset -
			here.take.video.nudgeMs / 1000 +
			here.clip.from +
			(seconds - here.start) / here.stretch,
		speed: 1 / here.stretch
	};
}
