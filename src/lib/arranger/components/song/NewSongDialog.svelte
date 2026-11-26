<script>
	/**
	 * New: a song starts with a title, its key and its time, so there's one
	 * key to point to (Key and capo move away from it). The time signatures
	 * offered are the open song's style's, and the new song keeps that style.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { KEY_GROUPS, songKeyChoices } from '../../chart/keyChoices.js';
	import { styleOf } from '../../styles/styles.js';
	import { newSong } from '../../starterSong.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const FIRST_TIME = '4/4';

	/** @type {{ open: boolean }} */
	let { open = $bindable(false) } = $props();

	const { song, arrangement } = useArranger();
	const keys = songKeyChoices();

	let title = $state('');
	let key = $state('');
	let time = $state(FIRST_TIME);
	let times = $derived(styleOf(arrangement.style).times);

	// Each time it opens: a blank form
	$effect(() => {
		if (!open) return;
		title = '';
		key = '';
		time = FIRST_TIME;
	});

	/** @param {SubmitEvent} event */
	function start(event) {
		event.preventDefault();
		if (!key) return;
		song.startNew(newSong({ key, time, style: arrangement.style }));
		song.rename(title).catch(console.error);
		open = false;
	}
</script>

<Dialog bind:open title="New song">
	<form class="px-6 pt-3 pb-6" onsubmit={start}>
		<label class="block">
			<span class="mb-2 block font-semibold">Title</span>
			<input
				bind:value={title}
				required
				maxlength="100"
				class="w-full ui-field px-3 py-2 pointer-coarse:text-base"
				use:tooltip={TIPS.song.newTitle}
			/>
		</label>

		<h3 class="mt-5 font-semibold">Key</h3>
		<p class="mb-1 max-w-sm text-sm text-ink-soft">
			As it sounds, with no capo. You can change the Key for a singer later.
		</p>
		{#each KEY_GROUPS as group (group.name)}
			<h4 class="mt-2 mb-1.5 text-sm text-ink-soft">{group.name}</h4>
			<div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
				{#each keys.filter((choice) => choice.group === group.name) as choice (choice.value)}
					<button
						type="button"
						class="ui-button px-2 py-1.5 font-semibold sm:py-2.5 sm:text-lg"
						class:ui-button-on={key === choice.value}
						aria-pressed={key === choice.value}
						onclick={() => (key = choice.value)}
						use:tooltip={TIPS.song.newKey}>{choice.name}</button
					>
				{/each}
			</div>
		{/each}

		<h3 class="mt-5 mb-2 font-semibold">Time</h3>
		<div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
			{#each times as choice (choice)}
				<button
					type="button"
					class="ui-button px-2 py-1.5 font-semibold sm:py-2.5 sm:text-lg"
					class:ui-button-on={time === choice}
					aria-pressed={time === choice}
					onclick={() => (time = choice)}
					use:tooltip={TIPS.song.newTime}>{choice}</button
				>
			{/each}
		</div>

		<div class="mt-6 flex items-center justify-end gap-3">
			{#if !key}<span class="mr-auto text-sm text-ink-soft">Choose a key</span>{/if}
			<button type="button" class="ui-button px-4 py-2" onclick={() => (open = false)}>
				Cancel
			</button>
			<button
				type="submit"
				class="ui-button px-5 py-2 ui-button-primary"
				disabled={!key}
				use:tooltip={TIPS.song.newStart}>Start</button
			>
		</div>
	</form>
</Dialog>
