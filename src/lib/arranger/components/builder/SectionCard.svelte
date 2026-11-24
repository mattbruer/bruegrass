<script>
	/** One part of the song in the chart builder: its name, its menu and its bars. */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { renameSection } from '../../builder/chartEdits.js';
	import BarTile from './BarTile.svelte';
	import SectionMenu from './SectionMenu.svelte';

	/**
	 * @type {{
	 *   chart: import('../../chart/writtenChart.js').WrittenChart,
	 *   index: number,
	 *   times: import('../../builder/barTimes.js').BarTime[],
	 *   words: import('../../chart/sectionLyrics.js').SectionLyrics,
	 *   picked: { section: number, bar: number } | null,
	 *   playingBar: { section: number, measure: number } | null,
	 *   onpick: (place: { section: number, bar: number }) => void,
	 *   edit: import('./builder.js').Edit
	 * }}
	 */
	let { chart, index, times, words, picked, playingBar, onpick, edit } = $props();

	let section = $derived(chart.sections[index]);
	let pickedBar = $derived(picked?.section === index ? picked.bar : -1);

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function rename(event) {
		const input = event.currentTarget;
		edit((c) => renameSection(c, index, input.value));
		input.value = section.name;
	}

	/** @param {number} bar */
	function showsTime(bar) {
		return times[bar].changes !== null || (index === 0 && bar === 0);
	}
</script>

<section class="flex flex-col gap-1.5">
	<div class="flex items-center gap-1.5">
		<input
			class="min-w-0 flex-1 ui-field px-2 py-1 text-sm font-semibold"
			value={section.name}
			data-section-name={index}
			aria-label="Part name"
			enterkeyhint="done"
			use:tooltip={TIPS.builder.sectionName}
			onchange={rename}
			onkeydown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
		/>
		<SectionMenu {chart} {index} {edit} />
	</div>

	{#if section.repeats}
		<p class="px-1 text-sm text-ink-soft">Plays {section.repeats} again.</p>
	{:else}
		<div class="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
			{#each section.bars as bar, b (b)}
				<BarTile
					{bar}
					time={times[b]}
					words={words.bars[b] ?? ''}
					picked={pickedBar === b}
					playing={playingBar?.section === index && playingBar.measure === b}
					showTime={showsTime(b)}
					onpick={() => onpick({ section: index, bar: b })}
				/>
			{/each}
			<button
				type="button"
				class="new-bar rounded-[var(--corner-control)] text-xl text-ink-soft"
				class:ui-button-on={pickedBar === section.bars.length}
				aria-label="Add a bar"
				use:tooltip={TIPS.builder.newBar}
				onclick={() => onpick({ section: index, bar: section.bars.length })}
			>
				+
			</button>
		</div>
	{/if}
</section>

<style>
	.new-bar {
		min-height: 3.6rem;
		border: 2px dashed var(--color-ink-faint);
	}
</style>
