/**
 * Play a recorded take through the speakers (or headphones).
 * Two-channel takes (two mics) play one mic on each side, so you can
 * hear them apart; anything else plays in the middle.
 */

/**
 * @param {AudioContext} context
 * @param {import('./takeRecorder.js').Take} take
 * @param {() => void} onEnded called once, when it finishes or is stopped
 * @param {{ start: number, end: number }} [range] the frames to play (default: all of it)
 * @returns {() => void} stop
 */
export function playTake(context, take, onEnded, range) {
	const frames = take.channels[0]?.length ?? 0;
	const buffer = context.createBuffer(take.channels.length, Math.max(1, frames), take.sampleRate);
	take.channels.forEach((channel, index) => buffer.copyToChannel(channel, index));

	const player = context.createBufferSource();
	player.buffer = buffer;
	player.connect(context.destination);

	let ended = false;
	// Called straight away on stop, not left to `onended`: a context closing at the same time never sends it
	const finish = () => {
		if (ended) return;
		ended = true;
		player.onended = null;
		player.disconnect();
		onEnded();
	};
	player.onended = finish;

	const start = range ? range.start / take.sampleRate : 0;
	const seconds = range ? Math.max(0, range.end - range.start) / take.sampleRate : undefined;
	player.start(0, start, seconds);

	return () => {
		if (ended) return;
		player.stop();
		finish();
	};
}
