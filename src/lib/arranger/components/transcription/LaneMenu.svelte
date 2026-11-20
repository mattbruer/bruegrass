<script>
	/**
	 * A part lane's menu (⋯ beside its name): a name of your own for it, and,
	 * for a lane added with + Lane, making it the bass line (rare: most
	 * people never write a bass) or taking it away.
	 */
	import Popover from '$lib/components/Popover.svelte';
	import { isExtraPart } from '../../melody/extraParts.js';
	import { PART_NAME_LENGTH, ownName } from '../../melody/partNames.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState,
	 *   lane: import('../../tracks/lanes.js').BandLane
	 * }}
	 */
	let { transcription, lane } = $props();

	const added = $derived(isExtraPart(lane.id));
	const bassWritten = $derived(transcription.arranger.bass.isWritten);

	function remove() {
		const sure = lane.blocks.length === 0 || confirm(`Take “${lane.name}” away, with its notes?`);
		if (sure) transcription.removeLane(lane.id);
	}
</script>

<Popover class="px-1.5 text-xs" tip={TIPS.transcription.laneMenu}>
	{#snippet button()}<span aria-hidden="true">⋯</span><span class="sr-only">{lane.name}'s menu</span
		>{/snippet}
	<label class="flex flex-col gap-1 text-sm">
		<span class="heading">Name</span>
		<input
			class="ui-field px-2 py-1"
			value={transcription.laneName(lane.id)}
			placeholder={ownName(lane.id)}
			maxlength={PART_NAME_LENGTH}
			onchange={(event) => transcription.renameLane(lane.id, event.currentTarget.value)}
			onkeydown={(event) => {
				if (event.key === 'Enter') event.currentTarget.blur();
			}}
			use:tooltip={TIPS.transcription.laneName}
		/>
	</label>
	{#if added}
		{#if !bassWritten}
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-left text-sm"
				onclick={() => transcription.useLaneAsBass(lane.id)}
				use:tooltip={TIPS.transcription.laneBass}>Make it the bass line</button
			>
		{/if}
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-left text-sm"
			onclick={remove}
			use:tooltip={TIPS.transcription.laneRemove}>Remove lane</button
		>
	{/if}
</Popover>

<style>
	.heading {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}
</style>
