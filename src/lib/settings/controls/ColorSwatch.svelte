<script>
	/**
	 * A colour choice: the browser's own colour picker, shown as a raised
	 * swatch of the current colour, with its hex code beside it.
	 *
	 * Usage: <ColorSwatch bind:color={settings.appearance.text} labelledBy="setting-id" />
	 */

	/** @type {{ color: string, labelledBy: string }} */
	let { color = $bindable(), labelledBy } = $props();
</script>

<span class="flex items-center gap-2">
	<span class="font-mono text-xs text-ink-soft uppercase">{color}</span>
	<input type="color" bind:value={color} aria-labelledby={labelledBy} class="swatch" />
</span>

<style>
	/* Hide the browser's default frame, leaving just the colour, raised */
	.swatch {
		width: 2.75rem;
		height: 2rem;
		cursor: pointer;
		appearance: none;
		border: none;
		border-radius: var(--corner-control);
		background: var(--color-surface);
		padding: 0.25rem;
		box-shadow: var(--shadow-raised-small);
	}

	.swatch::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	.swatch::-webkit-color-swatch {
		border: none;
		border-radius: var(--corner-small);
	}

	.swatch::-moz-color-swatch {
		border: none;
		border-radius: var(--corner-small);
	}

	.swatch:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
