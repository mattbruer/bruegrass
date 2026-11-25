<script>
	/**
	 * An instrument lane's menu (⋯ beside its name): a name of your own,
	 * moving it up or down, and, for a part added with + Inst, making it the
	 * bass line (rare: most people never write a bass) or taking it away.
	 */
	import Popover from '$lib/components/Popover.svelte';
	import MoveLane from './MoveLane.svelte';
	import StyleSelect from '../page/StyleSelect.svelte';
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

	const { parts, bass } = useArranger();

	const added = $derived(isExtraPart(lane.id));
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
		{#if lane.id === BAND_LANE}
			<StyleSelect />
		{/if}
		<MoveLane id={lane.id} {lanes} />
		{#if added}
			{#if !bass.isWritten}
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
