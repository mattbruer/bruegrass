<script>
	/**
	 * How the video is laid out: its frame (a reel, the feed, wide) and the
	 * tiles, one key per layout that fits the A/V lanes (tileLayout.js),
	 * each a little picture of its grid in the frame's shape. Saved with
	 * the song.
	 */
	import { useArranger } from '../../state/context.js';
	import { layoutChoices, wallLayout, tileRows } from '../../video/tileLayout.js';
	import { FRAMES } from '$lib/video/frames.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { recording, song } = useArranger();

	const count = $derived(recording.filmedLanes.length);
	const layout = $derived(wallLayout(recording.filmedLanes, song.video));

	/** @param {number} columns */
	function choose(columns) {
		song.video = { ...song.video, columns };
	}

	/** @param {string} frame */
	function chooseFrame(frame) {
		song.video = { ...song.video, frame };
	}
</script>

<div class="picker">
	<select
		class="ui-field px-2 py-1.5 text-sm"
		aria-label="Video shape"
		value={layout.frame.id}
		onchange={(event) => chooseFrame(event.currentTarget.value)}
		use:tooltip={TIPS.video.frame}
	>
		{#each FRAMES as frame (frame.id)}
			<option value={frame.id}>{frame.name}</option>
		{/each}
	</select>
	{#if count > 1}
		<div class="keys" role="group" aria-label="Video layout">
			{#each layoutChoices(count) as { columns, rows } (columns)}
				<button
					type="button"
					class="layout ui-button"
					class:ui-button-on={columns === layout.columns}
					aria-pressed={columns === layout.columns}
					aria-label="{columns} across, {rows} down"
					onclick={() => choose(columns)}
					use:tooltip={TIPS.video.layout}
				>
					<span
						class="grid"
						style:aspect-ratio="{layout.frame.width} / {layout.frame.height}"
						aria-hidden="true"
					>
						{#each tileRows( Array.from({ length: count }, (_, index) => index), columns ) as row, index (index)}
							<span class="row">
								{#each row as cell (cell)}
									<span class="cell"></span>
								{/each}
							</span>
						{/each}
					</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.picker,
	.keys {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}
	.layout {
		display: grid;
		place-items: center;
		min-width: 2.75rem;
		min-height: 2.75rem; /* a finger's worth */
		padding: 0.25rem;
	}
	.grid,
	.row {
		display: flex;
		gap: 1px;
	}
	.grid {
		flex-direction: column;
		height: 1.75rem;
	}
	.row,
	.cell {
		flex: 1;
	}
	.cell {
		border-radius: 1px;
		background: currentColor;
	}
</style>
