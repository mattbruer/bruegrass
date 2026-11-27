<script>
	/**
	 * An instrument lane's menu (⋯ beside its name): a name of your own (a
	 * generated line's is its lead's, shown but not typed),
	 * moving it up or down; for the melody or a part you wrote, harmony
	 * lines generated from it; for a generated line, copying it to a lane of
	 * its own; for an added part, making it the bass line (rare: most people
	 * never write a bass) or taking it away.
	 */
	import Popover from '$lib/components/Popover.svelte';
	import MoveLane from './MoveLane.svelte';
	import CopyToLaneButton from './CopyToLaneButton.svelte';
	import HarmonyChoices from '../melody/HarmonyChoices.svelte';
	import { isGenerated } from '../../melody/harmony/generatedParts.js';
	import { MELODY_CHANNEL } from '../../melody/harmony/partChannels.js';
	import StyleSelect from '../page/StyleSelect.svelte';
	import KeySelect from '../player/KeySelect.svelte';
	import CapoSelect from '../player/CapoSelect.svelte';
	import { BAND_LANE } from '../../tracks/lanes.js';
	import { useArranger } from '../../state/context.js';
	import { isExtraPart } from '../../melody/extraParts.js';
	import { PART_NAME_LENGTH, ownName } from '../../melody/partNames.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   lane: import('../../tracks/lanes.js').BandLane,
	 *   lanes: { id: string }[]
	 * }}
	 *   lanes: every lane, in its order now
	 */
	let { lane, lanes } = $props();

	const { parts, bass, melody } = useArranger();

	const added = $derived(isExtraPart(lane.id));
	const generated = $derived(isGenerated(melody.generated, lane.id));
	/** A line harmony can be written from: the melody, or a part you wrote. */
	const leads = $derived(lane.id === MELODY_CHANNEL || (added && !generated));
	/** The Band, guitar and mandolin aren't parts, so their own names are the lanes'. */
	const ownLaneName = $derived(lane.kind === 'notes' ? ownName(lane.id) : lane.name);

	function remove() {
		const hasNotes = lane.kind === 'notes' && lane.blocks.length > 0;
		if (!hasNotes || confirm(`Take “${lane.name}” away, with its notes?`)) parts.remove(lane.id);
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function rename(event) {
		parts.rename(lane.id, event.currentTarget.value);
		event.currentTarget.value = parts.name(lane.id, ownLaneName); // a refused blank shows the name kept
	}
</script>

<Popover class="px-1.5 text-xs" tip={TIPS.tracks.laneMenu}>
	{#snippet button()}<span aria-hidden="true">⋯</span><span class="sr-only">{lane.name}'s menu</span
		>{/snippet}
	<div class="menu">
		{#if generated && lane.kind === 'notes' && lane.lead}
			<div class="flex flex-col gap-1 text-sm">
				<span class="heading">Name</span>
				<span class="font-semibold">{lane.name}</span>
				<span class="text-xs text-[var(--color-ink-soft)]"
					>Written from {parts.name(lane.lead)}, and named after it: rename that lane to rename this
					one.</span
				>
			</div>
		{:else}
			<label class="flex flex-col gap-1 text-sm">
				<span class="heading">Name</span>
				<input
					class="ui-field px-2 py-1"
					value={lane.name}
					placeholder={ownLaneName}
					maxlength={PART_NAME_LENGTH}
					onchange={rename}
					onkeydown={(event) => {
						if (event.key === 'Enter') event.currentTarget.blur();
					}}
					use:tooltip={TIPS.tracks.laneName}
				/>
			</label>
		{/if}
		{#if lane.id === BAND_LANE}
			<StyleSelect />
			<KeySelect />
		{:else if lane.id === 'guitar'}
			<CapoSelect />
		{/if}
		<MoveLane id={lane.id} {lanes} />
		{#if leads}
			<HarmonyChoices lead={lane.id} />
		{/if}
		{#if generated}
			<CopyToLaneButton part={lane.id} class="ui-menu-item" />
		{/if}
		{#if added}
			{#if !bass.isWritten && !generated}
				<button
					type="button"
					class="ui-button ui-menu-item"
					onclick={() => parts.useAsBass(lane.id)}
					use:tooltip={TIPS.transcription.laneBass}>Make it the bass line</button
				>
			{/if}
			<button
				type="button"
				class="ui-button ui-menu-item"
				onclick={remove}
				use:tooltip={TIPS.tracks.instRemove}>Remove lane</button
			>
		{/if}
	</div>
</Popover>

<style>
	.menu {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.75rem;
		width: min(18rem, calc(100vw - 2rem));
	}

	.heading {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}
</style>
