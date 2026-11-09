/**
 * Share blocks out onto pages, in order, starting a new page when the
 * next block won't fit. A block is never split; one taller than a page
 * gets a page of its own.
 * @param {number[]} heights each block's height
 * @param {number} pageHeight the room on one page
 * @returns {number[][]} each page's block indexes
 */
export function paginate(heights, pageHeight) {
	/** @type {number[][]} */
	const pages = [[]];
	let used = 0;
	heights.forEach((height, index) => {
		const page = pages[pages.length - 1];
		if (page.length > 0 && used + height > pageHeight) {
			pages.push([index]);
			used = height;
		} else {
			page.push(index);
			used += height;
		}
	});
	return pages;
}
