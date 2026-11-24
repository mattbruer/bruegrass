<script>
	/**
	 * Changing the picked bar: its chords, the bar itself (add, copy,
	 * delete, hold, time), and its words, one tab at a time so it fits a phone.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { chordName, insertBar, removeChord, setChord } from '../../builder/chartEdits.js';
	import { mostChords } from '../../builder/barTimes.js';
	import ChordPad from './ChordPad.svelte';
	import BarActions from './BarActions.svelte';
	import BarWords from './BarWords.svelte';

	const TABS = [
		{ id: 'chord', name: 'Chord' },
		{ id: 'bar', name: 'Bar' },
		{ id: 'words', name: 'Words' }
	];

	/**
	 * @type {{
	 *   chart: import('../../chart/writtenChart.js').WrittenChart,
	 *   picked: import('./builder.js').Picked,
	 *   times: import('../../builder/barTimes.js').BarTime[][],
	 *   words: import('../../chart/sectionLyrics.js').SectionLyrics,
	 *   songKey: import('../../chart/key.js').Key | null,
	 *   edit: import('./builder.js').Edit,
	 *   pick: (picked: import('./builder.js').Picked) => void
	 * }}
	 */
	let { chart, picked, times, words, songKey, edit, pick } = $props();

	let tab = $state('chord');

	let section = $derived(chart.sections[picked.section]);
	let bar = $derived(section.bars[picked.bar]);
	let isNewBar = $derived(!bar);
	let chords = $derived(bar?.chords ?? []);
	let most = $derived(mostChords(times[picked.section][picked.bar]?.time ?? '4/4'));
	let current = $derived(chords[picked.chord] ? chordName(chords[picked.chord]) : '');

	/** @param {string} name */
	function putChord(name) {
		const nextChord = picked.chord + 1 < Math.max(chords.length, 1);
		const next = nextChord
			? { ...picked, chord: picked.chord + 1 }
			: { section: picked.section, bar: picked.bar + 1, chord: 0 };
		if (isNewBar) edit((c) => insertBar(c, picked, [name]), next);
		else edit((c) => setChord(c, picked, name), next);
	}

	/** @param {-1 | 1} by */
	function step(by) {
		const bar = Math.min(Math.max(picked.bar + by, 0), section.bars.length);
		pick({ section: picked.section, bar, chord: 0 });
	}
</script>

<div class="mt-2 flex flex-col gap-2 ui-card p-2">
	<div class="flex items-center gap-2">
		<span class="text-sm font-semibold">
			{section.name} · {isNewBar ? 'new bar' : `bar ${picked.bar + 1}`}
		</span>
		<button
			type="button"
			class="ui-button px-2 py-0.5 text-sm"
			aria-label="Bar before"
			disabled={picked.bar === 0}
			use:tooltip={TIPS.builder.previous}
			onclick={() => step(-1)}>‹</button
		>
		<button
			type="button"
			class="ui-button px-2 py-0.5 text-sm"
			aria-label="Bar after"
			disabled={isNewBar}
			use:tooltip={TIPS.builder.next}
			onclick={() => step(1)}>›</button
		>
		<div class="ml-auto">
			{#if !isNewBar}
				<TabSwitch tabs={TABS} bind:value={tab} tips={TIPS.builder.tabs} label="Change the bar" />
			{/if}
		</div>
	</div>

	{#if isNewBar || tab === 'chord'}
		{#if !isNewBar}
			<div class="flex flex-wrap items-center gap-1.5">
				{#each chords.length ? chords : [''] as written, c (c)}
					<button
						type="button"
						class="min-w-12 ui-button px-2.5 py-1 text-sm font-semibold"
						class:ui-button-on={picked.chord === c}
						use:tooltip={TIPS.builder.slot}
						onclick={() => pick({ ...picked, chord: c })}
						>{written ? chordName(written) : '%'}</button
					>
				{/each}
				{#if picked.chord === chords.length && chords.length > 0}
					<span class="min-w-12 ui-button ui-button-on px-2.5 py-1 text-sm">?</span>
				{/if}
				{#if chords.length < most && picked.chord < chords.length}
					<button
						type="button"
						class="ui-button px-2.5 py-1 text-sm"
						aria-label="Add a chord to the bar"
						use:tooltip={TIPS.builder.addSlot}
						onclick={() => pick({ ...picked, chord: chords.length })}>+ chord</button
					>
				{/if}
				{#if chords.length > 1 && picked.chord < chords.length}
					<button
						type="button"
						class="ui-button px-2.5 py-1 text-sm"
						use:tooltip={TIPS.builder.removeSlot}
						onclick={() => edit((c) => removeChord(c, picked), { ...picked, chord: 0 })}
						>Remove {current}</button
					>
				{/if}
			</div>
		{/if}
		<ChordPad {songKey} {current} onpick={putChord} />
	{:else if tab === 'bar'}
		<BarActions {chart} {picked} {times} {edit} />
	{:else}
		<BarWords {picked} {words} {edit} {pick} lastBar={section.bars.length - 1} />
	{/if}
</div>
