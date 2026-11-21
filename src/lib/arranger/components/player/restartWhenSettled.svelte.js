/**
 * Restart a playing band once a setting has rested for a moment (a fader
 * dragged, the tempo's + held down), so a drag doesn't restart it at every
 * step. Call it during a component's setup: the effect is cleaned up with it.
 */

const SETTLE_MS = 400;

/**
 * @param {() => unknown} read the setting that changes what plays
 * @param {{ restartIfPlaying: () => void }} player
 */
export function restartWhenSettled(read, player) {
	let played = read();
	$effect(() => {
		const value = read();
		if (value === played) return;
		const timer = setTimeout(() => {
			played = value;
			player.restartIfPlaying();
		}, SETTLE_MS);
		return () => clearTimeout(timer);
	});
}
