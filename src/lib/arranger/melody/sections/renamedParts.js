/**
 * A section renamed in the chart keeps its tune: when one section's name
 * changes and nothing else does (same sections, same places), its tune
 * moves to the new name. Typing a new name letter by letter is a run of
 * such renames.
 */

/**
 * @param {import('./tuneBySection.js').SectionInstance[]} before
 * @param {import('./tuneBySection.js').SectionInstance[]} after
 * @template T
 * @param {Record<string, T>} parts a section's tunes, or its pickups, by name
 * @returns {Record<string, T> | null} the parts with tunes moved, or null when nothing was renamed
 */
export function renamedParts(before, after, parts) {
	if (before.length !== after.length) return null;
	const sourcesAfter = new Set(after.map((instance) => instance.source));
	const moved = { ...parts };
	let changed = false;
	before.forEach((old, index) => {
		const now = after[index];
		const renamed = old.name === old.source && now.name === now.source && old.name !== now.name;
		if (!renamed || sourcesAfter.has(old.source) || now.source in moved || !(old.source in moved))
			return;
		moved[now.source] = moved[old.source];
		delete moved[old.source];
		changed = true;
	});
	return changed ? moved : null;
}
