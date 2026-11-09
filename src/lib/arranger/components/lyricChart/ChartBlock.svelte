<script>
	/** Draws one block of a lyric chart: the header or a row. */
	import ChartHeader from './ChartHeader.svelte';
	import ChartRow from './ChartRow.svelte';

	/**
	 * @type {{
	 *   block: import('../../lyricChart/chartBlocks.js').ChartBlock,
	 *   header: { title: string, details: { label: string, value: string }[] },
	 *   label: (chord: string) => string
	 * }}
	 */
	let { block, header, label } = $props();
</script>

<div class="text-[15px] leading-snug">
	{#if block.kind === 'header'}
		<ChartHeader {...header} />
	{:else}
		<ChartRow row={block} {label} />
	{/if}
</div>
