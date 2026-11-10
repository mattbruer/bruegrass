<script>
	/** A tune channel's instrument, on its strip: tap to choose another. */
	import { tuneInstrument } from '../../../instruments/tuneInstruments.js';
	import { instrumentWindow, openInstruments } from './instrumentWindowState.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ channel: import('../../../playback/mixer.svelte.js').ChannelSettings }} */
	let { channel } = $props();

	let isOpen = $derived(instrumentWindow.channelId === channel.id);
</script>

<button
	type="button"
	class="instrument ui-button"
	class:ui-button-on={isOpen}
	aria-label="{channel.name} plays on {tuneInstrument(channel.instrument).name}: choose another"
	aria-haspopup="dialog"
	aria-expanded={isOpen}
	onclick={() => openInstruments(channel.id)}
	use:tooltip={TIPS.mixer.instrument}
>
	{tuneInstrument(channel.instrument).name}
</button>

<style>
	.instrument {
		width: 100%;
		padding: 0.3rem 0.4rem;
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1.15;
	}
</style>
