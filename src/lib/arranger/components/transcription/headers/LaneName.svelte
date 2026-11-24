<script>
	/**
	 * A lane's name in its header. With onpick it's a button that picks the
	 * lane for the editor below; without, plain text.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';

	/** @type {{ name: string, tip?: string, picked?: boolean, onpick?: () => void }} */
	let { name, tip, picked = false, onpick } = $props();
</script>

{#if onpick}
	<button type="button" class="name pick" onclick={onpick} aria-pressed={picked} use:tooltip={tip}
		>{name}</button
	>
{:else}
	<span class="name" use:tooltip={tip}>{name}</span>
{/if}

<style>
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.pick {
		flex: 1;
		min-width: 0;
		text-align: left;
	}
</style>
