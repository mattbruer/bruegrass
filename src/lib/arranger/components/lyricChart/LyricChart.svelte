<script>
	/**
	 * A lyric chart drawn straight down, not on paper (for the help page,
	 * or anywhere a chart sits inside other content). PaperPages draws the
	 * same blocks on sheets.
	 */
	import ChartBlock from './ChartBlock.svelte';

	/**
	 * @type {{
	 *   blocks: import('../../lyricChart/chartBlocks.js').ChartBlock[],
	 *   header?: { title: string, details: { label: string, value: string }[] },
	 *   label?: (chord: string) => string
	 * }}
	 */
	let { blocks, header, label = (chord) => chord } = $props();
</script>

<div>
	{#each blocks as block, b (b)}
		{#if block.kind !== 'header' || header}
			<ChartBlock {block} header={header ?? { title: '', details: [] }} {label} />
		{/if}
	{/each}
</div>
