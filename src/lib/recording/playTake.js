/**
 * Play a recorded take through the speakers (or headphones).
 * Two-channel takes (two mics) play one mic on each side, so you can
 * hear them apart; anything else plays in the middle.
 */

/**
 * @param {AudioContext} context
 * @param {import('./takeRecorder.js').Take} take
 * @param {() => void} onEnded called when it finishes or is stopped
 * @returns {() => void} stop
 */
export function playTake(context, take, onEnded) {
	const frames = take.channels[0]?.length ?? 0;
	const buffer = context.createBuffer(take.channels.length, Math.max(1, frames), take.sampleRate);
	take.channels.forEach((channel, index) => buffer.copyToChannel(channel, index));

	const player = context.createBufferSource();
	player.buffer = buffer;
	player.connect(context.destination);
	player.onended = () => {
		player.disconnect();
		onEnded();
	};
	player.start();

	return () => player.stop();
}
