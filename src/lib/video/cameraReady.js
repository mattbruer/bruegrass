/**
 * Waits until a camera is really sending pictures. A camera takes a moment
 * to wake (about a second), while the mic sends sound at once; a recording
 * started before then begins its picture late against its own sound, so
 * the film shows everything too early (measured: by the whole wake-up).
 * Filming starts once a few frames have come through.
 */

/** Frames to see before the camera counts as awake. */
const FRAMES_TO_SEE = 3;
/** Give up waiting after this long (seconds): a camera that slow is filmed anyway. */
const LONGEST_WAIT = 5;

/**
 * @param {MediaStream} stream with the camera's track
 * @returns {Promise<void>}
 */
export function cameraReady(stream) {
	const video = document.createElement('video');
	video.muted = true;
	video.playsInline = true;
	video.srcObject = new MediaStream(stream.getVideoTracks());

	return new Promise((resolve) => {
		let seen = 0;
		const done = () => {
			clearTimeout(timer);
			video.pause();
			video.srcObject = null;
			resolve();
		};
		const timer = setTimeout(done, LONGEST_WAIT * 1000);
		/** @type {VideoFrameRequestCallback} */
		const onFrame = () =>
			++seen >= FRAMES_TO_SEE ? done() : video.requestVideoFrameCallback(onFrame);
		video.requestVideoFrameCallback(onFrame);
		video.play().catch(done);
	});
}
