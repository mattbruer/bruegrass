<script>
	/**
	 * A lane's colour, as a small swatch the size of the M/S buttons beside it:
	 * the browser's own colour picker underneath.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';

	/** @type {{ color: string, label: string, tip: string }} */
	let { color = $bindable(), label, tip } = $props();
</script>

<input type="color" class="swatch" bind:value={color} aria-label={label} use:tooltip={tip} />

<style>
	.swatch {
		width: 2rem;
		height: 1.45rem;
		cursor: pointer;
		appearance: none;
		border: 1px solid var(--color-line);
		border-radius: var(--corner-small);
		background: var(--color-raised);
		padding: 0.2rem;
		box-shadow:
			var(--shadow-bevel),
			0 1px 3px var(--shadow-dark-edge),
			var(--shadow-drop-small);
	}

	.swatch::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	.swatch::-webkit-color-swatch {
		border: none;
		border-radius: calc(var(--corner-small) / 2);
	}

	.swatch::-moz-color-swatch {
		border: none;
		border-radius: calc(var(--corner-small) / 2);
	}

	.swatch:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
