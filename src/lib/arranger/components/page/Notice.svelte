<script>
	/** The app's one notice line (state/notice.svelte.js); tap it to close it. */
	import { notice } from '../../state/notice.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { fly } from 'svelte/transition';
</script>

{#if notice.text}
	<button
		type="button"
		class="notice ui-card"
		role="status"
		onclick={() => notice.hide()}
		use:tooltip={TIPS.app.notice}
		transition:fly={{ y: -16, duration: 180 }}
	>
		{notice.text}
	</button>
{/if}

<style>
	.notice {
		position: fixed;
		top: calc(env(safe-area-inset-top, 0px) + 0.75rem);
		left: 50%;
		translate: -50% 0;
		z-index: 40;
		width: max-content;
		max-width: calc(100vw - 2rem);
		padding: 0.6rem 1rem;
		color: var(--color-ink);
		font-size: 0.875rem;
		text-align: center;
	}
</style>
