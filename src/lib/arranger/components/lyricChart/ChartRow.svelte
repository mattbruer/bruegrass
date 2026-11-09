<script>
	/** One row of the chart: a sung line's bars (with the section's name above its first row, and any pickup before bar 1). */
	import ChartBar from './ChartBar.svelte';

	/**
	 * @type {{
	 *   row: Extract<import('../../lyricChart/chartBlocks.js').ChartBlock, { kind: 'row' }>,
	 *   label: (chord: string) => string
	 * }}
	 */
	let { row, label } = $props();
</script>

<div class="row" class:starts-section={row.sectionName !== null}>
	{#if row.sectionName}
		<h2 class="section-name">{row.sectionName}</h2>
	{/if}
	<div class="bars">
		{#if row.pickup}
			<div class="pickup">
				<span>&nbsp;</span>
				<span>{row.pickup}</span>
			</div>
		{/if}
		{#each row.bars as bar, b (bar.index)}
			<ChartBar {bar} {label} closesRow={b === row.bars.length - 1} />
		{/each}
	</div>
</div>

<style>
	.row {
		padding-bottom: 0.6rem;
	}

	.starts-section {
		padding-top: 0.8rem;
	}

	.section-name {
		margin-bottom: 0.25rem;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-ink-soft);
	}

	/* Every row keeps the same room on the left for a pickup, so bars line up from row to row */
	.bars {
		--pickup-room: 5rem;

		position: relative;
		display: flex;
		padding-left: var(--pickup-room);
		flex-wrap: wrap;
		row-gap: 0.4rem;
	}

	/* Ends where bar 1 starts; a long one runs on into the page margin */
	.pickup {
		position: absolute;
		top: 0;
		right: calc(100% - var(--pickup-room));
		display: flex;
		flex-direction: column;
		padding: 0.1rem 0.4rem 0 0;
		text-align: right;
		white-space: nowrap;
	}
</style>
