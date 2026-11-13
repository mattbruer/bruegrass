/**
 * One animation loop shared by every meter and the visualiser, so the page
 * draws them all together once per screen refresh, and nothing runs while
 * nothing is listening.
 *
 * Usage:
 *   const stop = onEveryFrame((now, elapsed) => { ...draw... });
 *   // later
 *   stop();
 */

/** @typedef {(now: number, elapsed: number) => void} FrameCallback seconds */

/** @type {Set<FrameCallback>} */
const callbacks = new Set();
let frame = 0;
let lastTime = 0;

/**
 * Call `callback` every frame until the returned function is called.
 * @param {FrameCallback} callback
 */
export function onEveryFrame(callback) {
	callbacks.add(callback);
	if (callbacks.size === 1) start();

	return function stop() {
		callbacks.delete(callback);
		if (callbacks.size === 0) cancelAnimationFrame(frame);
	};
}

function start() {
	lastTime = performance.now() / 1000;
	frame = requestAnimationFrame(everyFrame);
}

/** @param {number} timestamp milliseconds */
function everyFrame(timestamp) {
	const now = timestamp / 1000;
	const elapsed = Math.max(0, now - lastTime);
	lastTime = now;
	for (const callback of callbacks) callback(now, elapsed);
	frame = requestAnimationFrame(everyFrame);
}
