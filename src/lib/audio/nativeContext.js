/**
 * The browser's own AudioContext under Tone's. Tone wraps its context in
 * standardized-audio-context, whose worklet loader rewrites the code it
 * fetches and can't load a processor with `import` lines (the stretch
 * player, as Vite serves it in development). A native node in the native
 * context runs on the same audio clock as Tone's nodes, which is the point.
 *
 * `_nativeAudioContext` and `_nativeAudioNode` are that library's own
 * fields, not a public API: this is the one place that reaches for them.
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

/**
 * The browser's own node under one of Tone's context's nodes, so a native
 * node (a worklet with imports) can play into Tone's graph: the mixer.
 * @param {AudioNode} node made in Tone's context
 * @returns {AudioNode}
 */
export function nativeNodeOf(node) {
	const native = /** @type {any} */ (node)._nativeAudioNode ?? node;
	if (!(native instanceof AudioNode)) {
		throw new Error('The audio node underneath Tone could not be found.');
	}
	return native;
}
