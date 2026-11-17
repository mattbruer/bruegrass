<script>
	/** A plain play or pause shape in the text colour, for small buttons (the player bar has its own pictures). */
	/** @type {{ playing: boolean }} playing: show pause */
	let { playing } = $props();
</script>

<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true">
	{#if playing}
		<rect x="3" y="2" width="3.5" height="12" rx="0.8" fill="currentColor" />
		<rect x="9.5" y="2" width="3.5" height="12" rx="0.8" fill="currentColor" />
	{:else}
		<path
			d="M4 2.2v11.6a.8.8 0 0 0 1.2.7l9.3-5.8a.8.8 0 0 0 0-1.4L5.2 1.5A.8.8 0 0 0 4 2.2z"
			fill="currentColor"
		/>
	{/if}
</svg>
