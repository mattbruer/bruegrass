<script>
	/**
	 * An audio lane's menu (⋯ beside its name): its name, moving it up or
	 * down, its takes (which one plays, earlier or later by ear, download,
	 * delete), a take from a file someone sent, and, while it has no takes,
	 * taking the lane away.
	 */
	import Popover from '$lib/components/Popover.svelte';
	import { useArranger } from '../../state/context.js';
	import { PART_NAME_LENGTH } from '../../melody/partNames.js';
	import TakeList from '../recording/TakeList.svelte';
	import MoveLane from './MoveLane.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ lane: import('../../tracks/lanes.js').TakeLane, lanes: { id: string }[] }} lanes: every lane, in its order now */
	let { lane, lanes } = $props();

	const { recording } = useArranger();

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function addFile(event) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = ''; // the same file can be chosen again
		if (file) recording.addFromFile(file, lane.id);
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
				maxlength={PART_NAME_LENGTH}
				onchange={(event) => {
					recording.renameLane(lane.id, event.currentTarget.value);
					event.currentTarget.value = recording.laneName(lane.id); // a refused blank shows the name kept
				}}
				onkeydown={(event) => {
					if (event.key === 'Enter') event.currentTarget.blur();
				}}
				use:tooltip={TIPS.tracks.laneName}
			/>
		</label>

		<MoveLane id={lane.id} {lanes} />

		<TakeList trackId={lane.id} />

		<label class="ui-button px-3 py-1.5 text-center text-sm" use:tooltip={TIPS.recording.addFile}>
			Add a take from a file…
			<input type="file" accept="audio/*,.wav" class="sr-only" onchange={addFile} />
		</label>

		{#if lane.takes.length === 0}
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-left text-sm"
				onclick={() => recording.removeLane(lane.id)}
				use:tooltip={TIPS.tracks.laneRemove}>Remove lane</button
			>
		{/if}
	</div>
</Popover>

<style>
	.menu {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.75rem;
		width: min(22rem, calc(100vw - 2rem));
	}

	.heading {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}
</style>
