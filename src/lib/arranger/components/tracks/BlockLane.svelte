<script>
	/**
	 * A band lane, read-only: chords as named blocks, or notes as short bars
	 * placed by pitch (high at the top), like a piano roll squeezed small.
	 */

	/**
	 * @type {{
	 *   lane: import('../../tracks/lanes.js').BandLane,
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
		{#if lane.kind === 'chords'}
			<div
				class="chord"
				style:left="{scale.toX(block.start)}px"
				style:width="{scale.toX(block.start + block.length) - scale.toX(block.start)}px"
			>
				{block.label}
			</div>
		{:else}
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
		{/if}
	{/each}
</div>

<style>
	.lane {
		position: relative;
		min-height: var(--lane-height);
		border-bottom: var(--lane-divider, 1px solid var(--color-line));
		overflow: hidden;
	}

	.chord {
		position: absolute;
		top: 0.35rem;
		bottom: 0.35rem;
		display: flex;
		align-items: center;
		padding: 0 0.3rem;
		border: 1px solid var(--color-line);
		border-radius: var(--corner-small);
		background: var(--color-raised);
		background-image: var(--face-3d);
		box-shadow: var(--shadow-bevel), var(--shadow-drop-small);
		overflow: hidden;
		white-space: nowrap;
		font-size: 0.75rem;
		font-weight: 600;
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
