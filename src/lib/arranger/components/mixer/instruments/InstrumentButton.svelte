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
	{name}
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
