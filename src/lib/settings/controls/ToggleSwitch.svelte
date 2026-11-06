<script>
	/**
	 * An on/off switch: a sunk track with a raised knob that slides across,
	 * and the track lights up in the accent colour when on.
	 *
	 * Usage: <ToggleSwitch bind:on={settings.something} labelledBy="setting-id" />
	 * Optional: tip="what it does" for a tooltip.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';

	/** @type {{ on: boolean, labelledBy: string, tip?: string }} */
	let { on = $bindable(), labelledBy, tip } = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={on}
	aria-labelledby={labelledBy}
	class="switch"
	class:on
	onclick={() => (on = !on)}
	use:tooltip={tip}
>
	<span class="knob"></span>
</button>

<style>
	.switch {
		position: relative;
		width: 3.25rem;
		height: 1.85rem;
		border-radius: 9999px;
		background: var(--color-surface);
		box-shadow: var(--shadow-inset-small);
		transition: background 0.2s ease;
	}

	.switch.on {
		background: var(--color-accent-soft);
	}

	.switch:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.knob {
		position: absolute;
		top: 0.2rem;
		left: 0.2rem;
		width: 1.45rem;
		height: 1.45rem;
		border-radius: 9999px;
		background: var(--color-surface);
		box-shadow: var(--shadow-raised-small);
		transition: transform 0.2s ease;
	}

	.switch.on .knob {
		transform: translateX(1.4rem);
	}
</style>
