<!--
	The key that does the same as a button, shown on the button (R, Space…).
	Hidden for screen readers: the tooltip says it in words.
-->
<script>
	/** @type {{ label: string }} */
	let { label } = $props();
</script>

<kbd aria-hidden="true">{label}</kbd>

<style>
	kbd {
		margin-left: 0.4rem;
		padding: 0 0.3rem;
		border-radius: var(--corner-control);
		box-shadow: var(--shadow-inset-small);
		font-family: inherit;
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--color-ink-soft);
	}
</style>
