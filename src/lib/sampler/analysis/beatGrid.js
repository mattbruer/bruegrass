/**
 * Where the beat falls in a recording made to a click, worked out from the
 * hits themselves (the click and the mic each have their own delay, so
 * the click's own times can't be used), and how early or late each hit is
 * against it: the player's own timing, which the humanizer can learn from.
 */

/**
 * The beat's position within one beat (frames from the start, 0 up to
 * `beatFrames`): the average of where the hits fall, taken round a circle
 * so hits just before and just after a beat average to the beat.
 * @param {number[]} hits frames
 * @param {number} beatFrames
 */
export function beatPhase(hits, beatFrames) {
	let x = 0;
	let y = 0;
	for (const hit of hits) {
		const angle = (2 * Math.PI * hit) / beatFrames;
		x += Math.cos(angle);
		y += Math.sin(angle);
	}
	const angle = Math.atan2(y, x);
	return ((((angle / (2 * Math.PI)) * beatFrames) % beatFrames) + beatFrames) % beatFrames;
}

/**
 * How far a hit is from the nearest beat, in frames: negative early, positive late.
 * @param {number} hit
 * @param {number} phase from beatPhase
 * @param {number} beatFrames
 */
export function offBeat(hit, phase, beatFrames) {
	const fromBeat = (((hit - phase) % beatFrames) + beatFrames) % beatFrames;
	return fromBeat > beatFrames / 2 ? fromBeat - beatFrames : fromBeat;
}
