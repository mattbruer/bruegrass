/**
 * iPhone and iPad (Safari 16.4+'s Audio Session API): what the page uses
 * audio for. 'playback' plays through the silent switch, like a music app;
 * 'play-and-record' is needed for the mic to open at all ("AudioSession
 * category is not compatible with audio capture") and keeps it on while
 * music plays. The one place the type is set: playing never downgrades it
 * while a mic is open.
 */

let micsOpen = 0;

/** @param {'playback' | 'play-and-record'} type */
function setType(type) {
	const session = /** @type {any} */ (globalThis.navigator)?.audioSession;
	if (session && session.type !== type) session.type = type;
}

/** Before playing (call before any await, while still in the tap). */
export function forPlayback() {
	if (micsOpen === 0) setType('playback');
}

/**
 * Before opening a mic. Returns the release, to call when the mic closes.
 * @returns {() => void}
 */
export function holdForMic() {
	micsOpen++;
	setType('play-and-record');
	let released = false;
	return () => {
		if (released) return;
		released = true;
		micsOpen--;
		if (micsOpen === 0) setType('playback');
	};
}
