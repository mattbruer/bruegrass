<script>
	/**
	 * The step after finding the beats: name the sections. Only named
	 * sections can go to the arranger, so this comes before the chords and
	 * parts. It says how, and lists what's named so far with its bars, so you
	 * can see each section's start and end.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();
</script>

<section class="flex flex-col gap-3 ui-card p-4" aria-labelledby="section-step-title">
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<h2 id="section-step-title" class="text-lg font-bold">Name the sections</h2>
		<button
			type="button"
			class="ui-button px-4 py-2 ui-button-primary"
			onclick={() => transcription.doneNamingSections()}
			use:tooltip={TIPS.transcription.doneNaming}>Done</button
		>
	</div>
	<ol class="list-decimal space-y-1 pl-5 text-sm">
		<li>
			Play the recording. Where a section starts, press <strong>+ Marker</strong> and name it: “Verse”,
			“Chorus”, “Mando break”.
		</li>
		<li>
			A section ends where the next one starts. If nothing you want comes after it, choose <strong
				>End of section</strong
			> on the bar after it.
		</li>
		<li>If the singer comes in before the bar, set <strong>Tune starts</strong> in its menu.</li>
	</ol>
	<p class="text-sm text-ink-soft">
		Name only what you want: every section to build an arrangement, or just one part to practise.
	</p>

	{#if transcription.sections.length > 0}
		<ul class="flex flex-col gap-1 ui-well px-3 py-2 text-sm">
			{#each transcription.sections as section (section.index)}
				<li class="flex flex-wrap items-baseline gap-2">
					<span class="font-semibold">{section.name}</span>
					<span class="text-ink-soft tabular-nums"
						>{section.from === section.to
							? `bar ${section.from}`
							: `bars ${section.from}–${section.to}`}</span
					>
					{#if section.pickup}
						<span class="text-ink-soft"
							>tune starts {section.pickup} beat{section.pickup === 1 ? '' : 's'} early</span
						>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="ui-well px-3 py-2 text-sm text-ink-soft">No sections named yet.</p>
	{/if}
</section>
