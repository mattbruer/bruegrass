/**
 * The browser's own AudioContext under Tone's. Tone wraps its context in
 * standardized-audio-context, whose worklet loader rewrites the code it
 * fetches and can't load a processor with `import` lines (the stretch
 * player, as Vite serves it in development). A native node in the native
 * context runs on the same audio clock as Tone's nodes, which is the point.
 *
 * `_nativeAudioContext` is that library's own field, not a public API:
 * this is the one place that reaches for it.
 *
 * @param {typeof import('tone')} Tone
 * @returns {AudioContext}
 */
export function nativeContextOf(Tone) {
	const raw = /** @type {any} */ (Tone.getContext().rawContext);
	const native = raw._nativeAudioContext ?? raw;
	if (!(native instanceof AudioContext)) {
		throw new Error('The audio context underneath Tone could not be found.');
	}
	return native;
}
