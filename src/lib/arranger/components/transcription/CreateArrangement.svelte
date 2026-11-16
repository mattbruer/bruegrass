<script>
	/**
	 * "Create an arrangement": pick which of the transcription's sections to
	 * take (all of them to start with), and they become a new song in the
	 * arranger, in the recording's order, to rearrange there.
	 */
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { arrangeFromTranscription } from '../../state/arrangeFromTranscription.js';
	import { sectionBlocks } from '../../chart/sectionBlocks.js';
	import { withUniqueSectionNames } from '../../transcription/arrangementFromTranscription.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const arranger = useArranger();

	let open = $state(false);
	let problem = $state('');
	/** @type {boolean[]} */
	let chosen = $state([]);

	const sections = $derived(
		sectionBlocks(withUniqueSectionNames(arranger.arrangement.text)).map((block) => ({
			name: block.name,
			words: (block.lines[0] ?? '').replaceAll('|', ' ').replace(/\s+/g, ' ')
		}))
	);

	function start() {
		chosen = sections.map(() => true);
		problem = '';
		open = true;
	}

	async function create() {
		const indexes = chosen.flatMap((on, index) => (on ? [index] : []));
		problem = await arrangeFromTranscription(arranger, indexes);
		if (problem) return;
		open = false;
		goto(resolve('/arranger'));
	}
</script>

<button
	type="button"
	class="ui-button px-4 py-2 text-sm ui-button-primary"
	onclick={start}
	use:tooltip={TIPS.transcription.createArrangement}
>
	Create an arrangement…
</button>

<Dialog bind:open title="Create an arrangement">
	<p class="mb-3 text-sm text-ink-soft">
		Choose the sections to take, with their chords, words and the parts you drew. They become a new
		song in the arranger, where you can move, copy and drop them. This transcription stays as it is.
	</p>
	<ul class="mb-3 flex flex-col gap-1">
		{#each sections as section, index (index)}
			<li>
				<label class="flex items-baseline gap-2 py-1">
					<input type="checkbox" bind:checked={chosen[index]} />
					<span class="font-semibold">{section.name}</span>
					<span class="truncate text-sm text-ink-soft">{section.words}</span>
				</label>
			</li>
		{/each}
	</ul>
	{#if problem}
		<p class="mb-3 text-sm text-danger" role="alert">{problem}</p>
	{/if}
	<div class="flex flex-wrap justify-end gap-2">
		<button type="button" class="ui-button px-4 py-2" onclick={() => (open = false)}>Cancel</button>
		<button
			type="button"
			class="ui-button px-4 py-2 ui-button-primary"
			disabled={!chosen.some(Boolean)}
			onclick={create}>Create</button
		>
	</div>
</Dialog>
