<script>
	/**
	 * How the tune is kept: whole (as typed or pasted), or by section, each
	 * section of the chart owning its bars. By section, it lists the sections
	 * in play order with whose tune each plays, and one that shares another's
	 * can be made its own.
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { sectionInstances } from '../../melody/sections/tuneBySection.js';
	import { sharesItsTune } from '../../melody/sections/makeItsOwn.js';

	const arranger = useArranger();
	const { melody, arrangement } = arranger;

	let problem = $state('');
	let instances = $derived(sectionInstances(arrangement.text));

	async function split() {
		problem = await arranger.splitTuneIntoSections();
	}

	function join() {
		problem = '';
		arranger.joinTune();
	}
</script>

{#if melody.bySection}
	<section class="mb-3 ui-well px-3 py-2">
		<div class="mb-1 flex flex-wrap items-center gap-2">
			<h3 class="text-sm font-semibold">The tune by section</h3>
			<button
				type="button"
				class="ml-auto ui-button px-2 py-0.5 text-xs"
				use:tooltip={TIPS.melody.sections.join}
				onclick={join}>Keep as one tune</button
			>
		</div>
		<ul class="flex flex-col gap-1 text-sm">
			{#each instances as instance, index (index)}
				<li class="flex flex-wrap items-center gap-2">
					<span>{instance.name}</span>
					{#if instance.source !== instance.name}
						<span class="text-ink-soft">plays {instance.source}’s tune</span>
					{:else if !(instance.source in melody.bySection.parts)}
						<span class="text-ink-soft">no tune yet</span>
					{/if}
					{#if sharesItsTune(instances, index)}
						<button
							type="button"
							class="ml-auto ui-button px-2 py-0.5 text-xs"
							use:tooltip={TIPS.melody.sections.makeItsOwn}
							onclick={() => arranger.makeSectionItsOwn(index)}>Make it its own</button
						>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{:else if melody.hasNotation && arrangement.isPlayable}
	<div class="mb-3 flex flex-wrap items-center gap-2">
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-sm"
			use:tooltip={TIPS.melody.sections.split}
			onclick={split}>Split the tune into sections</button
		>
		{#if problem}
			<p class="text-sm text-danger" role="status">{problem}</p>
		{/if}
	</div>
{/if}
