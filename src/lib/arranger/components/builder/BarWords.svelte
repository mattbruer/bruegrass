<script>
	/**
	 * The Words tab: the words sung in the picked bar (Enter goes on to the
	 * next bar), the part's pickup on its first bar, and where lines start.
	 * Each keystroke goes into the chart, so nothing typed is lost.
	 */
	import { untrack } from 'svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { setBarWords, setPickupWords, toggleLineStart } from '../../builder/chartEdits.js';

	/**
	 * @type {{
	 *   picked: import('./builder.js').Picked,
	 *   words: import('../../chart/sectionLyrics.js').SectionLyrics,
	 *   lastBar: number,
	 *   edit: import('./builder.js').Edit,
	 *   pick: (picked: import('./builder.js').Picked) => void
	 * }}
	 */
	let { picked, words, lastBar, edit, pick } = $props();

	let id = $props.id();
	let startsLine = $derived(words.rowStarts.includes(picked.bar));
	/* What's typed, kept apart from the chart, which tidies spaces away mid-word */
	let draft = $state('');
	let pickupDraft = $state('');

	$effect(() => {
		void [picked.section, picked.bar];
		untrack(() => {
			draft = words.bars[picked.bar] ?? '';
			pickupDraft = words.pickup;
		});
	});

	/** @param {KeyboardEvent} event */
	function onToNextBar(event) {
		if (event.key !== 'Enter' || picked.bar >= lastBar) return;
		event.preventDefault();
		pick({ ...picked, bar: picked.bar + 1, chord: 0 });
	}
</script>

<div class="flex flex-col gap-1.5">
	{#if picked.bar === 0}
		<label class="flex items-center gap-2 text-xs text-ink-soft" for="{id}-pickup"
			>Before bar 1</label
		>
		<input
			id="{id}-pickup"
			class="ui-field px-2 py-1.5"
			bind:value={pickupDraft}
			use:tooltip={TIPS.builder.pickup}
			oninput={() =>
				edit(
					(c) => setPickupWords(c, picked.section, pickupDraft),
					undefined,
					`pickup ${picked.section}`
				)}
		/>
	{/if}
	<label class="text-xs text-ink-soft" for="{id}-words">Words in bar {picked.bar + 1}</label>
	<!-- svelte-ignore a11y_autofocus -->
	<input
		id="{id}-words"
		class="ui-field px-2 py-1.5"
		bind:value={draft}
		enterkeyhint="next"
		autocapitalize="off"
		autofocus
		use:tooltip={TIPS.builder.words}
		onkeydown={onToNextBar}
		oninput={() =>
			edit(
				(c) => setBarWords(c, picked, draft),
				undefined,
				`words ${picked.section} ${picked.bar}`
			)}
	/>
	{#if picked.bar > 0}
		<button
			type="button"
			class="w-fit ui-button px-3 py-1 text-sm"
			class:ui-button-on={startsLine}
			aria-pressed={startsLine}
			use:tooltip={TIPS.builder.lineStart}
			onclick={() => edit((c) => toggleLineStart(c, picked))}>New line here</button
		>
	{/if}
</div>
