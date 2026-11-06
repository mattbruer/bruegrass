<script>
	/**
	 * An insert slot on a strip, as in Logic: a power button that bypasses
	 * the plugin, and its name, which opens the plugin's window.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   name: string,
	 *   enabled: boolean,
	 *   windowOpen: boolean,
	 *   onOpen: () => void
	 * }}
	 */
	let { name, enabled = $bindable(), windowOpen, onOpen } = $props();
</script>

<div class="slot" class:bypassed={!enabled}>
	<button
		type="button"
		class="power"
		aria-pressed={enabled}
		aria-label="{name} on"
		use:tooltip={TIPS.mixer.pluginPower}
		onclick={() => (enabled = !enabled)}
	>
		⏻
	</button>
	<button
		type="button"
		class="name"
		class:open={windowOpen}
		aria-haspopup="dialog"
		aria-expanded={windowOpen}
		use:tooltip={TIPS.mixer.pluginOpen}
		onclick={onOpen}
	>
		{name}
	</button>
</div>

<style>
	.slot {
		display: flex;
		width: 100%;
		border-radius: var(--corner-small);
		background: var(--color-surface);
		box-shadow: var(--shadow-inset-small);
		font-size: 0.65rem;
		font-weight: 700;
	}

	.power {
		padding: 0.25rem 0.35rem;
		color: var(--color-accent);
	}

	.bypassed .power,
	.bypassed .name {
		color: var(--color-ink-faint);
	}

	.name {
		flex: 1;
		padding: 0.25rem 0.4rem 0.25rem 0;
		text-align: left;
		color: var(--color-ink);
	}

	.name.open {
		color: var(--color-accent);
	}

	/* Only with a real hover: on a touch screen a tapped :hover sticks until the next tap */
	@media (hover: hover) {
		.name:hover {
			color: var(--color-accent);
		}
	}
</style>
