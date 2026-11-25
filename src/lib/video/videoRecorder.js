/**
 * Films a camera stream with the browser's MediaRecorder: start, stop, and
 * get back the file. It records the stream's sound too (compressed, only
 * used to line the video up with the full-quality take; see findOffset.js).
 *
 * Safari makes MP4, Chrome WebM (or MP4 in newer versions): the first
 * format this browser can make is used, and the file says which.
 */

/**
 * Best first. H.264 in MP4 plays on every device a take may be sent to
 * (an iPhone can't play every WebM); WebM is the fallback for an older Chrome.
 * avc3 before avc1: it carries the picture's settings with the frames, so a
 * phone turned mid-take (the picture's size changes) still records; Chrome
 * warns that avc1 can't.
 */
const FORMATS = [
	'video/mp4;codecs=avc3.4d002a,mp4a.40.2',
	'video/mp4;codecs=avc1.4d002a,mp4a.40.2',
	'video/mp4;codecs=avc1,opus',
	'video/mp4',
	'video/webm;codecs=vp9,opus',
	'video/webm;codecs=vp8,opus',
	'video/webm'
];

/** 720p at 60 fps with fast fingers in it: about 30 MB a minute. */
const VIDEO_BITS_PER_SECOND = 4_000_000;
/** The file's sound only lines the video up with the take: small is fine. */
const AUDIO_BITS_PER_SECOND = 64_000;
/**
 * A keyframe every second (where the browser lets us say: Chrome): the video
 * is seeked often to keep in time with the band, and a seek is quick and
 * exact only near a keyframe.
 */
const KEYFRAME_EVERY_MS = 1000;

/**
 * @param {MediaStream} stream the camera, with the mic's track
 */
export function createVideoRecorder(stream) {
	const type = FORMATS.find((format) => MediaRecorder.isTypeSupported(format)) ?? '';
	const recorder = new MediaRecorder(stream, {
		...(type ? { mimeType: type } : {}),
		videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
		audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
		videoKeyFrameIntervalDuration: KEYFRAME_EVERY_MS
	});
	/** @type {Blob[]} */
	const chunks = [];
	recorder.ondataavailable = ({ data }) => data.size > 0 && chunks.push(data);

	return {
		/** @returns {Promise<void>} once it's really filming (read your clock then) */
		start() {
			return new Promise((resolve, reject) => {
				recorder.onstart = () => resolve();
				recorder.onerror = (event) => reject(/** @type {any} */ (event).error ?? event);
				recorder.start();
			});
		},

		/** @returns {Promise<Blob>} everything since start() */
		stop() {
			return new Promise((resolve) => {
				recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
				recorder.stop();
			});
		},

		dispose() {
			if (recorder.state !== 'inactive') recorder.stop();
			recorder.ondataavailable = recorder.onstop = recorder.onstart = recorder.onerror = null;
		}
	};
}

/** @typedef {ReturnType<typeof createVideoRecorder>} VideoRecorder */
