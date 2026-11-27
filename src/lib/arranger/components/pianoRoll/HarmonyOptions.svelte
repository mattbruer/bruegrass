<script>
	/**
	 * Try other ways to sing the generated line shown, by ear: each option
	 * swaps in the line written in another style, all but the bars you've
	 * locked. While the band plays, it starts the loop
	 * again with the new line, so you hear it straight away; loop a few bars
	 * and flip between options. Put back returns the part to how it was
	 * before you started trying.
	 */
	import { untrack } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import { harmonyOptions } from '../../melody/roll/harmonyOptions.js';
	import { abcjsIfLoaded } from '../../state/abcjsLoaded.svelte.js';
	import { tuneReader } from '../../melody/abcjs.js';
	import { partName as partNameOf } from '../../melody/partNames.js';
	import { mixer } from '../../mixer/mixer.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ drawing: import('../../melody/roll/MelodyDrawing.svelte.js').MelodyDrawing }} */
	let { drawing } = $props();

	const arranger = useArranger();
	const { melody, player } = arranger;

	/** @type {import('../../melody/roll/harmonyOptions.js').HarmonyOption[]} */
	let options = $state.raw([]);
	/** The tune before the first option was tried (null when nothing is being tried). */
	let before = $state(/** @type {string | null} */ (null));
	/** The tune as the last option left it, to tell our changes from anyone else's. */
	let lastTried = '';
	let restartWhenRead = false;

	let part = $derived(drawing.current?.id ?? '');
	let partName = $derived(partNameOf(part, arranger.parts.names));
	/** The line's lead and every line generated from it: the group singing together. */
	let group = $derived.by(() => {
		const lead = melody.generated.find((each) => each.id === part)?.lead;
		if (!lead) return [];
		return [lead, ...melody.generated.filter((each) => each.lead === lead).map((each) => each.id)];
	});
	let groupOnly = $derived(
		mixer.channels.every((channel) => channel.solo === group.includes(channel.id))
	);

	$effect(() => {
		const abc = melody.notation;
		const tune = melody.tune;
		const id = part;
		untrack(() => {
			if (abc !== lastTried) before = null;
			const abcjs = abcjsIfLoaded();
			options = abcjs
				? harmonyOptions(abc, tune, id, arranger.songForMelody(), tuneReader(abcjs))
				: [];
		});
	});

	// Once the new line is read, start the band again so it's heard
	$effect(() => {
		void melody.line;
		if (!restartWhenRead) return;
		restartWhenRead = false;
		untrack(() => player.restartIfPlaying());
	});

	/** @param {import('../../melody/roll/harmonyOptions.js').HarmonyOption} option */
	function tryOption(option) {
		const abc = melody.notation;
		const tried = option.abc;
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

	function toggleGroupOnly() {
		const on = !groupOnly;
		for (const channel of mixer.channels) channel.solo = on && group.includes(channel.id);
	}
</script>

{#if options.length > 0}
	<div class="mb-2 ui-card p-3 text-sm">
		<p class="mb-2 text-ink-soft">
			Other ways to sing this line ({partName}). Loop a few bars, press Play, and tap through them.
		</p>
		<div class="mb-2 flex flex-wrap gap-2" role="group" aria-label="Harmony options">
			{#each options as option (option.id)}
				<button
					type="button"
					class="ui-button px-3 py-1.5"
					class:ui-button-on={option.current}
					aria-pressed={option.current}
					onclick={() => tryOption(option)}
					use:tooltip={TIPS.melody.harmonyOptions.styles[option.id]}>{option.name}</button
				>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				class:ui-button-on={groupOnly}
				aria-pressed={groupOnly}
				onclick={toggleGroupOnly}
				use:tooltip={TIPS.melody.harmonyOptions.singers}>Just the lead and its lines</button
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
