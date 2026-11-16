<script>
	/**
	 * "Send to the arranger": the sections you named (with markers) become a
	 * new song in the arranger, one of two ways. Practise a part: one section
	 * on its own, looping, with the notes showing. Build an arrangement: the
	 * sections you tick, in the recording's order, to rearrange there. Bars
	 * you didn't name never go. The transcription stays as it is.
	 */
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Dialog from '$lib/components/Dialog.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { useArranger } from '../../state/context.js';
	import { arrangeFromTranscription } from '../../state/arrangeFromTranscription.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const arranger = useArranger();

	let open = $state(false);
	let problem = $state('');
	/** @type {'practise' | 'arrange'} */
	let purpose = $state('practise');
	/** The section to practise (its place in the chart). */
	let practised = $state(0);
	/** @type {Record<number, boolean>} the sections to arrange */
	let ticked = $state({});

	const sections = $derived(arranger.transcription.sections);
	const chosen = $derived(
		purpose === 'practise'
			? [practised]
			: sections.flatMap((section) => (ticked[section.index] ? [section.index] : []))
	);

	function start() {
		practised = sections[0]?.index ?? 0;
		ticked = Object.fromEntries(sections.map((section) => [section.index, true]));
		problem = '';
		open = true;
	}

	async function send() {
		const songName = arranger.song.name || arranger.title;
		const practisedName = sections.find((section) => section.index === practised)?.name;
		const name =
			purpose === 'practise' ? `${songName} – ${practisedName}` : `${songName} arrangement`;
		const pickups = Object.fromEntries(sections.map((section) => [section.index, section.pickup]));
		problem = await arrangeFromTranscription(arranger, chosen, name, pickups);
		if (problem) return;
		if (purpose === 'practise') settings.musicView = 'sheet';
		open = false;
		goto(resolve('/arranger'));
	}
</script>

<button
	type="button"
	class="ui-button px-4 py-2 text-sm ui-button-primary"
	onclick={start}
	use:tooltip={TIPS.transcription.send}
>
	Send to the arranger…
</button>

<Dialog bind:open title="Send to the arranger">
	<div class="px-6 pt-3 pb-6">
		{#if sections.length === 0}
			<p class="mb-3 text-sm">
				Name the sections you want first. Tap the number of the bar where a section starts and give
				it a marker: “Verse”, “Chorus”, “Mando break”. Where it ends, tap the bar after it and
				choose End of section (or start the next one there). Only named sections can be sent.
			</p>
			<div class="flex justify-end">
				<button type="button" class="ui-button px-4 py-2" onclick={() => (open = false)}>OK</button>
			</div>
		{:else}
			<p class="mb-2 text-sm font-semibold">What do you want to do?</p>
			<div class="mb-3 grid grid-cols-2 gap-2">
				<button
					type="button"
					class="ui-button px-3 py-2 text-left"
					class:ui-button-on={purpose === 'practise'}
					aria-pressed={purpose === 'practise'}
					onclick={() => (purpose = 'practise')}
				>
					<span class="block font-semibold">Practise a part</span>
					<span class="block text-xs text-ink-soft">One section, looping with the band</span>
				</button>
				<button
					type="button"
					class="ui-button px-3 py-2 text-left"
					class:ui-button-on={purpose === 'arrange'}
					aria-pressed={purpose === 'arrange'}
					onclick={() => (purpose = 'arrange')}
				>
					<span class="block font-semibold">Build an arrangement</span>
					<span class="block text-xs text-ink-soft">Sections to move, copy and drop</span>
				</button>
			</div>

			<p class="mb-1 text-sm text-ink-soft">
				{purpose === 'practise' ? 'Which part?' : 'Which sections? They go over in this order.'}
			</p>
			<ul class="mb-3 flex flex-col">
				{#each sections as section (section.index)}
					<li>
						<label class="flex items-baseline gap-2 py-1">
							{#if purpose === 'practise'}
								<input type="radio" name="practised" value={section.index} bind:group={practised} />
							{:else}
								<input type="checkbox" bind:checked={ticked[section.index]} />
							{/if}
							<span class="font-semibold">{section.name}</span>
							<span class="shrink-0 text-sm text-ink-soft tabular-nums"
								>{section.from === section.to
									? `bar ${section.from}`
									: `bars ${section.from}–${section.to}`}</span
							>
							<span class="truncate text-sm text-ink-soft">{section.words}</span>
						</label>
					</li>
				{/each}
			</ul>
			{#if problem}
				<p class="mb-3 text-sm text-danger" role="alert">{problem}</p>
			{/if}
			<div class="flex flex-wrap justify-end gap-2">
				<button type="button" class="ui-button px-4 py-2" onclick={() => (open = false)}
					>Cancel</button
				>
				<button
					type="button"
					class="ui-button px-4 py-2 ui-button-primary"
					disabled={chosen.length === 0}
					onclick={send}>Send</button
				>
			</div>
		{/if}
	</div>
</Dialog>
