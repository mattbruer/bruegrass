/**
 * A name made safe for file names and URLs: "Old Joe Clark!" → "old-joe-clark".
 * @param {string} text
 */
export function slugify(text) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-') // anything else becomes a dash
		.replace(/^-|-$/g, ''); // no dash at either end
}
