/**
 * The arrangement text split into sections: each `"Name" ...` line, and
 * the lines under it up to the next one (its lyrics). The chord chart
 * (parseArrangement.js) and the lyrics (sectionLyrics.js) both read the
 * text through this, so they always agree on where sections are.
 */

const SECTION_LINE = /^"([^"]+)"\s*(.*)$/;

/**
 * @param {string} source
 * @returns {{ name: string, content: string, lines: string[] }[]}
 *   content: the rest of the section line (bars, or `as Other`);
 *   lines: the non-blank lines under it, trimmed
 */
export function sectionBlocks(source) {
	/** @type {{ name: string, content: string, lines: string[] }[]} */
	const blocks = [];
	for (const raw of source.split('\n')) {
		const line = raw.trim();
		const match = line.match(SECTION_LINE);
		if (match) blocks.push({ name: match[1], content: match[2], lines: [] });
		else if (line && blocks.length > 0) blocks[blocks.length - 1].lines.push(line);
	}
	return blocks;
}
