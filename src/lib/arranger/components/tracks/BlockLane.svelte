<script>
	/**
	 * A notes lane, read-only: notes as short bars placed by pitch (high at
	 * the top), like a piano roll squeezed small.
	 */

	/**
	 * @type {{
	 *   lane: import('../../tracks/lanes.js').NotesLane,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 */
	let { lane, scale } = $props();

	const pitches = $derived(lane.blocks.map((block) => block.pitch ?? 0));
	const lowest = $derived(Math.min(...pitches));
	const range = $derived(Math.max(...pitches) - lowest + 1);

	/** @param {number} pitch as a share of the lane's height, from the top */
	function heightOf(pitch) {
		return 1 - (pitch - lowest + 1) / range;
	}
</script>

<div class="lane">
	{#each lane.blocks as block, index (index)}
		<div
			class="note"
			style:left="{scale.toX(block.start)}px"
			style:width="{Math.max(
				2,
				scale.toX(block.start + block.length) - scale.toX(block.start) - 1
			)}px"
			style:top="calc({heightOf(block.pitch ?? 0)} * (100% - 0.5rem) + 0.25rem)"
			style:height="calc((100% - 0.5rem) / {range})"
		></div>
	{/each}
</div>

<style>
	.lane {
		position: relative;
		min-height: var(--lane-height);
		border-bottom: var(--lane-divider, 1px solid var(--color-line));
		overflow: hidden;
	}

	.note {
		position: absolute;
		min-height: 3px;
		border-radius: 1px;
		background: var(--color-accent);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / calc(0.35 * var(--drop))),
			0 3px 6px rgb(0 0 0 / calc(0.6 * var(--drop)));
	}
</style>
