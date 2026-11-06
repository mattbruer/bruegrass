/**
 * Small helpers for drawing on a <canvas> that looks sharp on any screen
 * and uses the app's theme colours.
 */

/**
 * Size the canvas's drawing surface to its on-screen size (times the
 * screen's pixel density, so lines stay crisp on retina screens), and
 * return a context that draws in on-screen (CSS) pixels.
 * @param {HTMLCanvasElement} canvas
 */
export function prepareCanvas(canvas) {
	const density = window.devicePixelRatio || 1;
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;

	if (
		canvas.width !== Math.round(width * density) ||
		canvas.height !== Math.round(height * density)
	) {
		canvas.width = Math.round(width * density);
		canvas.height = Math.round(height * density);
	}

	const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
	context.setTransform(density, 0, 0, density, 0, 0);
	context.clearRect(0, 0, width, height);
	return { context, width, height };
}

/**
 * @typedef {{ line: string, faint: string, label: string }} ScopeColours
 *   line: the signal (accent); faint: grid and guides; label: text
 */

/**
 * The theme's colours, as the canvas needs them (it can't read CSS variables).
 * @param {Element} element any element on the page
 * @returns {ScopeColours}
 */
export function themeColours(element) {
	const styles = getComputedStyle(element);
	const read = (/** @type {string} */ name) => styles.getPropertyValue(name).trim();
	return {
		line: read('--color-accent'),
		faint: read('--color-ink-faint'),
		label: read('--color-ink-soft')
	};
}
