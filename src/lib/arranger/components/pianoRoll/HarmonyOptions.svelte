<script>
	/**
	 * Try other ways to sing the harmony part being edited, by ear: each
	 * option swaps in the part written in another style (whole line, or just
	 * the bar of the picked note). While the band plays, it starts the loop
	 * again with the new line, so you hear it straight away; loop a few bars
	 * and flip between options. Put back returns the part to how it was
	 * before you started trying.
	 */
	import { untrack } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import { harmonyOptions, withOption } from '../../melody/roll/harmonyOptions.js';
	import { MELODY_CHANNEL } from '../../melody/harmony/partChannels.js';
	import { mixer } from '../../playback/mixer.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ drawing: import('../../melody/roll/MelodyDrawing.svelte.js').MelodyDrawing }} */
	let { drawing } = $props();

	const arranger = useArranger();
	const { melody, player } = arranger;

	/** @type {import('../../melody/roll/harmonyOptions.js').HarmonyOption[]} */
	let options = $state.raw([]);
	let scope = $state(/** @type {'line' | 'bar'} */ ('line'));
	/** The tune before the first option was tried (null when nothing is being tried). */
	let before = $state(/** @type {string | null} */ (null));
	/** The tune as the last option left it, to tell our changes from anyone else's. */
	let lastTried = '';
	let restartWhenRead = false;
	let reads = 0;

	let part = $derived(drawing.current?.id ?? MELODY_CHANNEL);
	let partName = $derived(drawing.current?.name ?? '');
	/** The bar of the picked note (index into the score's bars), or -1. */
	let pickedBar = $derived.by(() => {
		const note = drawing.notes[drawing.selected];
		if (!note || !drawing.score) return -1;
		return drawing.score.bars.findIndex(
			(bar) => bar.start <= note.start && note.start < bar.start + bar.length
		);
	});
	let barOnly = $derived(scope === 'bar' && pickedBar >= 0);
	let singers = $derived(drawing.voices.map((voice) => voice.id));
	let singersOnly = $derived(
		mixer.channels.every((channel) => channel.solo === singers.includes(channel.id))
	);

	$effect(() => {
		const abc = melody.notation;
		const id = part;
		untrack(() => {
			if (abc !== lastTried) before = null;
			findOptions(abc, id);
		});
	});

	// Once the new line is read, start the band again so it's heard
	$effect(() => {
		void melody.line;
		if (!restartWhenRead) return;
		restartWhenRead = false;
		untrack(() => player.restartIfPlaying());
	});

	/**
	 * @param {string} abc
	 * @param {string} id
	 */
	async function findOptions(abc, id) {
		const reading = ++reads;
		const found =
			id === MELODY_CHANNEL ? [] : await harmonyOptions(abc, id, arranger.songForMelody());
		if (reading === reads) options = found;
	}

	/** @param {import('../../melody/roll/harmonyOptions.js').HarmonyOption} option */
	async function tryOption(option) {
		const abc = melody.notation;
		const bars = barOnly ? new Set([pickedBar]) : null;
		const tried = await withOption(abc, option, part, bars);
		if (melody.notation !== abc) return;
		before ??= abc;
		lastTried = tried;
		restartWhenRead = player.isPlaying;
		melody.notation = tried;
	}

	function putBack() {
		if (before === null) return;
		restartWhenRead = player.isPlaying;
		lastTried = before;
		melody.notation = before;
		before = null;
	}

	function toggleSingersOnly() {
		const on = !singersOnly;
		for (const channel of mixer.channels) channel.solo = on && singers.includes(channel.id);
	}
</script>

{#if part !== MELODY_CHANNEL && options.length > 0}
	<div class="mb-2 ui-card p-3 text-sm">
		<p class="mb-2 text-ink-soft">
			Other ways to sing the {partName}. Loop a few bars, press Play, and tap through them.
		</p>
		<div class="mb-2 flex flex-wrap gap-2" role="group" aria-label="Harmony options">
			{#each options as option (option.id)}
				<button
					type="button"
					class="ui-button px-3 py-1.5"
					class:ui-button-on={option.current && !barOnly}
					aria-pressed={option.current && !barOnly}
					onclick={() => tryOption(option)}
					use:tooltip={TIPS.melody.harmonyOptions.styles[option.id]}>{option.name}</button
				>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-ink-soft">Change:</span>
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				class:ui-button-on={!barOnly}
				aria-pressed={!barOnly}
				onclick={() => (scope = 'line')}
				use:tooltip={TIPS.melody.harmonyOptions.line}>The whole line</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				class:ui-button-on={barOnly}
				aria-pressed={barOnly}
				disabled={pickedBar < 0}
				onclick={() => (scope = 'bar')}
				use:tooltip={TIPS.melody.harmonyOptions.bar}
				>{pickedBar >= 0 ? 'Just this bar' : 'Pick a note for one bar'}</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				class:ui-button-on={singersOnly}
				aria-pressed={singersOnly}
				onclick={toggleSingersOnly}
				use:tooltip={TIPS.melody.harmonyOptions.singers}>Singers only</button
			>
			{#if before !== null}
				<button
					type="button"
					class="ui-button px-3 py-1.5"
					onclick={putBack}
					use:tooltip={TIPS.melody.harmonyOptions.putBack}>Put back how it was</button
				>
			{/if}
		</div>
	</div>
{/if}
