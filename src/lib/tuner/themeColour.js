/**
 * A CSS colour (theme variables allowed) as the browser works it out
 * inside `element`, for drawing on a canvas, which can't read variables.
 * @param {Element} element
 * @param {string} css e.g. 'var(--meter-safe)'
 */
export function resolveColour(element, css) {
	const probe = document.createElement('span');
	probe.style.color = css;
	element.append(probe);
	const colour = getComputedStyle(probe).color;
	probe.remove();
	return colour;
}
