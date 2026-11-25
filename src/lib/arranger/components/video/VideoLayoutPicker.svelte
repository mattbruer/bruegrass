<script>
	/**
	 * How the video tiles are laid out: one key per layout that fits the
	 * A/V lanes (tileLayout.js), each a little picture of its grid. Saved
	 * with the song.
	 */
	import { useArranger } from '../../state/context.js';
	import { columnsFor, layoutChoices } from '../../video/tileLayout.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { recording, song } = useArranger();

	const count = $derived(recording.filmedLanes.length);
	const chosen = $derived(columnsFor(count, song.video.columns));

	/** @param {number} columns */
	function choose(columns) {
		song.video = { ...song.video, columns };
	}
</script>

{#if count > 1}
	<div class="picker" role="group" aria-label="Video layout">
		{#each layoutChoices(count) as { columns, rows } (columns)}
			<button
				type="button"
				class="layout ui-button"
				class:ui-button-on={columns === chosen}
				aria-pressed={columns === chosen}
				aria-label="{columns} across, {rows} down"
				onclick={() => choose(columns)}
				use:tooltip={TIPS.video.layout}
			>
				<span class="grid" style:--columns={columns} aria-hidden="true">
					{#each Array.from({ length: count }, (_, index) => index) as index (index)}
						<span class="cell"></span>
					{/each}
				</span>
			</button>
		{/each}
	</div>
{/if}

<style>
	.picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
	.layout {
		display: grid;
		place-items: center;
		min-width: 2.75rem;
		min-height: 2.75rem; /* a finger's worth */
		padding: 0.375rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(var(--columns), 0.5rem);
		gap: 2px;
	}
	.cell {
		height: 0.3rem;
		border-radius: 1px;
		background: currentColor;
	}
</style>
