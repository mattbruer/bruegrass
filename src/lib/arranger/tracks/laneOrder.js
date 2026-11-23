/**
 * The order of the Tracks page's lanes: the instrument lanes (the band,
 * the tune's parts) first and the audio lanes last, until you move them;
 * then the song keeps your order (`song.laneOrder`, ids top to bottom). A
 * lane that isn't in the saved order yet (just added) joins its own group:
 * an instrument lane after the last instrument lane, an audio lane at the end.
 */

/**
 * @template {{ id: string, kind: string }} L
 * @param {L[]} lanes every lane, in the usual order (instrument lanes, then audio)
 * @param {string[]} order the saved order ([]: none)
 * @returns {L[]}
 */
export function orderedLanes(lanes, order) {
	const byId = new Map(lanes.map((lane) => [lane.id, lane]));
	/** @type {L[]} */
	const placed = order.flatMap((id) => byId.get(id) ?? []);
	for (const lane of lanes) {
		if (placed.includes(lane)) continue;
		const lastOfGroup = placed.findLastIndex((each) => isAudio(each) === isAudio(lane));
		const at = isAudio(lane)
			? placed.length
			: lastOfGroup >= 0
				? lastOfGroup + 1
				: firstAudioIndex(placed);
		placed.splice(at, 0, lane);
	}
	return placed;
}

/**
 * The lanes' ids with one moved to a new place.
 * @param {{ id: string }[]} lanes in their order now
 * @param {string} id the lane moved
 * @param {number} to its new index (counted before it's taken out)
 * @returns {string[]}
 */
export function withLaneMoved(lanes, id, to) {
	const ids = lanes.map((lane) => lane.id);
	const from = ids.indexOf(id);
	if (from < 0) return ids;
	ids.splice(from, 1);
	ids.splice(Math.max(0, Math.min(ids.length, to > from ? to - 1 : to)), 0, id);
	return ids;
}

/**
 * Where a lane dragged to a height drops: before the first row whose middle is below it.
 * @param {number} y
 * @param {{ top: number, bottom: number }[]} rows each lane's row, top to bottom
 * @returns {number} an index from 0 (the top) to rows.length (the bottom)
 */
export function dropIndex(y, rows) {
	const below = rows.findIndex((row) => y < (row.top + row.bottom) / 2);
	return below < 0 ? rows.length : below;
}

/** @param {{ kind: string }} lane */
function isAudio(lane) {
	return lane.kind === 'take';
}

/** @param {{ kind: string }[]} lanes */
function firstAudioIndex(lanes) {
	const at = lanes.findIndex(isAudio);
	return at < 0 ? lanes.length : at;
}
