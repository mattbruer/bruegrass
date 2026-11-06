<script>
	/**
	 * An insert slot on a strip, as in Logic: a power button that bypasses
	 * the plugin, and its name, which opens the plugin's window.
	 */

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
		title={enabled ? 'Bypass' : 'Turn on'}
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
		title="Open {name}"
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

	.name:hover,
	.name.open {
		color: var(--color-accent);
	}
</style>
