/**
 * How a film sits in its tile: zoomed in so the tile is always filled (no
 * black), and which point of the film is at the tile's centre. Plain
 * numbers, saved per A/V lane with the song; the sizes come from the page.
 */

/** As far in as a film can be zoomed (times the least that fills its tile). */
export const MOST_ZOOM = 4;

/**
 * @typedef {{ zoom: number, x: number, y: number }} Framing
 *   zoom: 1 fills the tile, more is closer; x, y: the point of the film
 *   (0–1 across and down) at the tile's centre
 * @typedef {{ width: number, height: number }} Size
 */

/** @type {Framing} */
export const CENTRED = Object.freeze({ zoom: 1, x: 0.5, y: 0.5 });

/** @param {unknown} saved */
export function validFraming(saved) {
	const framing = /** @type {Partial<Framing> | null | undefined} */ (saved);
	const number = (/** @type {unknown} */ value, /** @type {number} */ otherwise) =>
		typeof value === 'number' && Number.isFinite(value) ? value : otherwise;
	return {
		zoom: clamp(number(framing?.zoom, 1), 1, MOST_ZOOM),
		x: clamp(number(framing?.x, 0.5), 0, 1),
		y: clamp(number(framing?.y, 0.5), 0, 1)
	};
}

/**
 * Where the film goes in its tile (pixels from the tile's top left; parts
 * outside are cut off). The centre point is kept far enough in that no
 * edge of the tile is left uncovered.
 * @param {Size} tile
 * @param {Size} film its own size
 * @param {Framing} framing
 */
export function filmRect(tile, film, framing) {
	const scale = Math.max(tile.width / film.width, tile.height / film.height) * framing.zoom;
	const width = film.width * scale;
	const height = film.height * scale;
	const { x, y } = keptCovering(tile, { width, height }, framing);
	return { left: tile.width / 2 - x * width, top: tile.height / 2 - y * height, width, height };
}

/**
 * The framing moved by a drag of `dx`, `dy` pixels (the film follows the finger).
 * @param {Framing} framing @param {Size} tile @param {Size} film
 * @param {number} dx @param {number} dy
 */
export function dragged(framing, tile, film, dx, dy) {
	const shown = filmRect(tile, film, framing);
	const moved = { ...framing, x: framing.x - dx / shown.width, y: framing.y - dy / shown.height };
	return { ...moved, ...keptCovering(tile, shown, moved) };
}

/**
 * The framing zoomed by `factor` (above 1 is closer), about the tile's centre.
 * @param {Framing} framing @param {Size} tile @param {Size} film @param {number} factor
 */
export function zoomed(framing, tile, film, factor) {
	const closer = { ...framing, zoom: clamp(framing.zoom * factor, 1, MOST_ZOOM) };
	const shown = filmRect(tile, film, closer);
	return { ...closer, ...keptCovering(tile, shown, closer) };
}

/**
 * The centre point, moved in just far enough that the film covers the tile.
 * @param {Size} tile @param {Size} shown the film's size as shown @param {Framing} framing
 */
function keptCovering(tile, shown, { x, y }) {
	const marginX = tile.width / 2 / shown.width;
	const marginY = tile.height / 2 / shown.height;
	return { x: clamp(x, marginX, 1 - marginX), y: clamp(y, marginY, 1 - marginY) };
}

/** @param {number} value @param {number} low @param {number} high */
function clamp(value, low, high) {
	return Math.min(high, Math.max(low, value));
}
