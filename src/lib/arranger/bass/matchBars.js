/**
 * Which old bar each new bar is, after the chart changed: the longest run
 * of matching bars in order (like a text diff), so a bar added or removed
 * anywhere leaves every other bar matched to itself.
 */

/**
 * @param {string[]} oldKeys what each old bar is (its length, meter and chords)
 * @param {string[]} newKeys the same for each new bar
 * @returns {Map<number, number>} new bar index → old bar index, for matched bars
 */
export function matchBars(oldKeys, newKeys) {
	const rows = oldKeys.length;
	const cols = newKeys.length;
	// longest[i][j]: matches possible from old bar i and new bar j onwards
	const longest = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
	for (let i = rows - 1; i >= 0; i--) {
		for (let j = cols - 1; j >= 0; j--) {
			longest[i][j] =
				oldKeys[i] === newKeys[j]
					? longest[i + 1][j + 1] + 1
					: Math.max(longest[i + 1][j], longest[i][j + 1]);
		}
	}

	const matched = new Map();
	let i = 0;
	let j = 0;
	while (i < rows && j < cols) {
		if (oldKeys[i] === newKeys[j]) matched.set(j++, i++);
		else if (longest[i + 1][j] >= longest[i][j + 1]) i++;
		else j++;
	}
	return matched;
}
