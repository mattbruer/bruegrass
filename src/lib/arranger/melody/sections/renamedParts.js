/**
 * A section renamed in the chart keeps its tune: when one section's name
 * changes and nothing else does (same sections, same places), its tune
 * goes with the new name. Typing a new name letter by letter is a run of
 * such renames.
 *
 * Renaming a copy (a pasted second "Verse", or a line that played another
 * section `as` it) gives it its own copy of that tune instead, to change
 * from there: the original still has its own.
 */

/**
 * @param {import('./tuneBySection.js').SectionInstance[]} before
 * @param {import('./tuneBySection.js').SectionInstance[]} after
 * @template T
 * @param {Record<string, T>} parts a section's tunes, or its pickups, by name
 * @returns {Record<string, T> | null} the parts with tunes moved or copied, or null when nothing was
 */
export function renamedParts(before, after, parts) {
	if (before.length !== after.length) return null;
	const sourcesAfter = new Set(after.map((instance) => instance.source));
	const moved = { ...parts };
	let changed = false;
	before.forEach((old, index) => {
		const now = after[index];
		const ownLine = now.name === now.source;
		if (!ownLine || old.source === now.source || now.source in moved || !(old.source in moved))
			return;
		moved[now.source] = structuredClone(moved[old.source]);
		if (!sourcesAfter.has(old.source)) delete moved[old.source];
		changed = true;
	});
	return changed ? moved : null;
}
