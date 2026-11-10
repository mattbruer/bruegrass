<script>
	/** A lane's name, with mute and solo for its mixer channel. It stays put while the lanes scroll. */
	import { mixer } from '../../playback/mixer.svelte.js';
	import MuteSoloButtons from '../mixer/MuteSoloButtons.svelte';

	/** @type {{ lane: import('../../tracks/lanes.js').Lane }} */
	let { lane } = $props();

	const channel = $derived(mixer.channels.find((each) => each.id === lane.id));
</script>

<div class="header" class:take={lane.kind === 'take'}>
	<span class="name">{lane.name}</span>
	{#if channel}
		<MuteSoloButtons settings={channel} name={lane.name} />
	{/if}
</div>

<style>
	.header {
		position: sticky;
		left: 0;
		z-index: 2;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.25rem;
		height: var(--lane-height);
		padding: 0 0.5rem;
		border-right: 1px solid var(--color-line);
		border-bottom: 1px solid var(--color-line);
		background: var(--color-surface);
	}

	.header.take {
		height: var(--take-lane-height);
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.8rem;
		font-weight: 700;
	}
</style>
