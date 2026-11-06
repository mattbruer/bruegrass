<script>
	/**
	 * Mute (M) and, for instrument channels, Solo (S). Soloing any channel
	 * silences the channels that aren't soloed; the reverb carries on.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{ settings: { mute: boolean, solo?: boolean }, name: string }}
	 *   settings: a channel or the reverb aux (no solo there)
	 */
	let { settings, name } = $props();

	let canSolo = $derived(settings.solo !== undefined);
</script>

<div class="flex gap-1.5">
	<button
		type="button"
		class="toggle mute"
		class:on={settings.mute}
		aria-pressed={settings.mute}
		aria-label="Mute {name}"
		use:tooltip={TIPS.mixer.mute}
		onclick={() => (settings.mute = !settings.mute)}
	>
		M
	</button>

	{#if canSolo}
		<button
			type="button"
			class="toggle solo"
			class:on={settings.solo}
			aria-pressed={settings.solo}
			aria-label="Solo {name}"
			use:tooltip={TIPS.mixer.solo}
			onclick={() => (settings.solo = !settings.solo)}
		>
			S
		</button>
	{/if}
</div>

<style>
	/* Small raised buttons that stay pressed in, and light up, while on */
	.toggle {
		width: 2rem;
		border-radius: var(--corner-small);
		background: var(--color-surface);
		padding: 0.2rem 0;
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--color-ink-soft);
		box-shadow: var(--shadow-raised-small);
	}

	.toggle.on {
		box-shadow: var(--shadow-inset-small);
		color: white;
	}

	/* Colours as in most DAWs: mute blue, solo yellow */
	.mute.on {
		background: var(--mixer-mute-on);
	}

	.solo.on {
		background: var(--mixer-solo-on);
		color: black;
	}
</style>
