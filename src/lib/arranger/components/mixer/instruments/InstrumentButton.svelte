<script>
	/** A tune channel's instrument, on its strip: tap to choose another. */
	import { defaultTuneInstrument, tuneInstrument } from '../../../instruments/tuneInstruments.js';
	import { instrumentWindow, openInstruments } from './instrumentWindowState.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ channel: import('../../../mixer/mixer.svelte.js').ChannelSettings }} */
	let { channel } = $props();

	let isOpen = $derived(instrumentWindow.channelId === channel.id);
	let name = $derived(tuneInstrument(channel.instrument, defaultTuneInstrument(channel.id)).name);
</script>

<button
	type="button"
	class="instrument ui-button"
	class:ui-button-on={isOpen}
	aria-label="{channel.name} plays on {name}: choose another"
	aria-haspopup="dialog"
	aria-expanded={isOpen}
	onclick={() => openInstruments(channel.id)}
	use:tooltip={TIPS.mixer.instrument}
>
	<span class="name">{name}</span>
	<svg class="chevron" viewBox="0 0 12 12" aria-hidden="true"
		><path
			d="M2.5 4.5 6 8l3.5-3.5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
		/></svg
	>
</button>

<style>
	.instrument {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.3rem;
		width: 100%;
		padding: 0.3rem 0.4rem;
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1.15;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		flex-shrink: 0;
		width: 0.75rem;
		height: 0.75rem;
		color: var(--color-ink-soft);
	}
</style>
