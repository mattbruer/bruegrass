<script>
	/** Bar numbers and section names across the top of the tracks, from the count-in bar on. */

	/**
	 * @type {{
	 *   bars: import('../../tracks/ruler.js').RulerBar[],
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 */
	let { bars, scale } = $props();
</script>

<div class="ruler">
	{#each bars as bar (bar.number)}
		<div
			class="bar"
			class:count-in={bar.number === 0}
			style:left="{scale.toX(bar.start)}px"
			style:width="{scale.toX(bar.start + bar.beats) - scale.toX(bar.start)}px"
		>
			<span class="number">{bar.number === 0 ? 'Count-in' : bar.number}</span>
			{#if bar.sectionName}
				<span class="section">{bar.sectionName}</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	.ruler {
		position: relative;
		height: 2.5rem;
		border-bottom: 1px solid var(--color-line);
		background: var(--color-surface);
	}

	.bar {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 0.15rem 0.3rem;
		border-left: 1px solid var(--color-line);
		overflow: hidden;
		white-space: nowrap;
		font-size: 0.7rem;
		line-height: 1.2;
	}

	.number {
		color: var(--color-ink-soft);
		font-variant-numeric: tabular-nums;
	}

	.count-in .number {
		color: var(--color-ink-faint);
	}

	.section {
		font-weight: 700;
	}
</style>
