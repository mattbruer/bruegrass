<script module>
	/** How many changes Undo can take back. */
	const UNDO_STEPS = 50;

	/* Kept across switching to Text and back, and shared by every builder on the page (they change the same chart) */
	/** Earlier texts of the chart, for Undo. */
	let history = $state.raw(/** @type {string[]} */ ([]));
	/** The words being typed that the last change was (undone as one), and the text it left. */
	let lastTyping = '';
	let lastWritten = '';
</script>

<script>
	/**
	 * The chart built with buttons instead of typed: each part with its
	 * bars as tiles; tap a bar, then tap its chord (the next bar is picked
	 * for you, so a progression is a row of taps). Every change is written
	 * straight into the chart text, the one place the song lives
	 * (builder/chartEdits.js on chart/writtenChart.js), so the text editor,
	 * the strip and the band follow at once.
	 */
	import { tick } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { lyricsFromLines } from '../../chart/sectionLyrics.js';
	import { addSection } from '../../builder/chartEdits.js';
	import { barTimes } from '../../builder/barTimes.js';
	import SectionCard from './SectionCard.svelte';
	import BarTray from './BarTray.svelte';

	/** @type {{ playingBar: { section: number, measure: number } | null }} */
	let { playingBar } = $props();

	const { arrangement } = useArranger();

	/** @type {HTMLDivElement | undefined} */
	let list = $state();
	/** @type {import('./builder.js').Picked | null} */
	let picked = $state(null);

	let chart = $derived(arrangement.written);
	let times = $derived(barTimes(chart));
	let words = $derived(chart.sections.map((section) => lyricsFromLines(section.lyrics)));

	// The chart typed in the text editor (or anywhere else) can't be undone here
	$effect(() => {
		if (arrangement.text !== lastWritten) history = [];
	});

	// The pick follows the chart: a part deleted or turned into a repeat drops it
	$effect(() => {
		if (!picked) return;
		const section = chart.sections[picked.section];
		if (!section || section.repeats) picked = null;
		else if (picked.bar > section.bars.length)
			picked = { ...picked, bar: section.bars.length, chord: 0 };
	});

	/** @type {import('./builder.js').Edit} */
	function edit(change, next, typing = '') {
		if (!typing || typing !== lastTyping) {
			history = [...history.slice(1 - UNDO_STEPS), arrangement.text];
		}
		lastTyping = typing;
		arrangement.editWritten(change);
		lastWritten = arrangement.text;
		if (next !== undefined) picked = next;
	}

	function undo() {
		const before = history.at(-1);
		if (before === undefined) return;
		history = history.slice(0, -1);
		lastTyping = '';
		arrangement.text = lastWritten = before;
	}

	async function addPart() {
		const after = chart.sections.length - 1;
		edit((c) => addSection(c, after, 'Part'), { section: after + 1, bar: 0, chord: 0 });
		await tick();
		const name = list?.querySelector(`[data-section-name="${after + 1}"]`);
		if (name instanceof HTMLInputElement) {
			name.scrollIntoView({ block: 'nearest' });
			name.select();
		}
	}
</script>

<div bind:this={list} class="flex h-56 flex-col gap-3 overflow-y-auto ui-field p-2">
	{#each chart.sections, s (s)}
		<SectionCard
			{chart}
			index={s}
			times={times[s]}
			words={words[s]}
			{picked}
			{playingBar}
			onpick={(place) => (picked = { ...place, chord: 0 })}
			{edit}
		/>
	{/each}
</div>

<div class="mt-2 flex gap-2">
	<button
		type="button"
		class="ui-button px-3 py-1 text-sm"
		use:tooltip={TIPS.builder.addSection}
		onclick={addPart}>+ Part</button
	>
	<button
		type="button"
		class="ml-auto ui-button px-3 py-1 text-sm"
		disabled={history.length === 0}
		use:tooltip={TIPS.builder.undo}
		onclick={undo}>Undo</button
	>
</div>

{#if picked && chart.sections[picked.section] && !chart.sections[picked.section].repeats}
	<BarTray
		{chart}
		{picked}
		{times}
		words={words[picked.section]}
		songKey={arrangement.key}
		{edit}
		pick={(next) => (picked = next)}
	/>
{/if}
