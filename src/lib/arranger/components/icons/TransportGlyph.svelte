<script>
	/** Start over and bar-step shapes, drawn like PlayPauseGlyph so the transport keys match. */
	/** @type {{ shape: 'start' | 'back' | 'forward' }} */
	let { shape } = $props();
</script>

<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true">
	{#if shape === 'start'}
		<rect x="1.5" y="2.5" width="2.2" height="11" rx="0.6" fill="currentColor" />
		<path
			d="M14 3.2v9.6a.7.7 0 0 1-1.1.6L5.8 8.6a.7.7 0 0 1 0-1.2l7.1-4.8a.7.7 0 0 1 1.1.6z"
			fill="currentColor"
		/>
	{:else}
		<path
			d={shape === 'back' ? 'M10.5 2.5 5 8l5.5 5.5' : 'M5.5 2.5 11 8l-5.5 5.5'}
			fill="none"
			stroke="currentColor"
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/if}
</svg>
