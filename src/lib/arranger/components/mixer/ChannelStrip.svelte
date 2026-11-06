<script>
	/**
	 * One instrument's channel strip, top to bottom: its parts' levels (if
	 * it has any), how much it sends to the reverb, pan, mute/solo, fader.
	 */
	import Strip from './Strip.svelte';
	import Slider from './Slider.svelte';
	import MuteSoloButtons from './MuteSoloButtons.svelte';
	import ChannelFader from './ChannelFader.svelte';
	import { LEVEL_SCALE, PAN_SCALE, SEND_SCALE } from './controlScales.js';
	import { defaultChannel } from '../../playback/mixer.svelte.js';
	import { audioTaps } from '../../playback/mixerGraph.svelte.js';

	/** @type {{ channel: import('../../playback/mixer.svelte.js').ChannelSettings }} */
	let { channel } = $props();

	/** Where resetting each control puts it back to. */
	let defaults = $derived(defaultChannel(channel.id));

	/** @param {string} partId */
	const defaultPartLevel = (partId) =>
		defaults.parts.find((part) => part.id === partId)?.volume ?? 0;
</script>

<Strip id={channel.id} name={channel.name}>
	{#each channel.parts as part (part.id)}
		<Slider
			name={part.name}
			bind:value={part.volume}
			{...LEVEL_SCALE}
			reset={defaultPartLevel(part.id)}
			label="{channel.name} {part.name}"
		/>
	{/each}

	<!-- How much goes to the reverb: none at the left, the most at the right -->
	<Slider
		name="Reverb"
		bind:value={channel.send}
		{...SEND_SCALE}
		showValue={false}
		reset={defaults.send}
		label="{channel.name} reverb send"
	/>

	<Slider
		name="Pan"
		bind:value={channel.pan}
		{...PAN_SCALE}
		reset={defaults.pan}
		label="{channel.name} pan"
	/>

	<MuteSoloButtons settings={channel} name={channel.name} />
	<ChannelFader
		level={channel}
		reset={defaults.volume}
		label={channel.name}
		meter={audioTaps.current?.channels.get(channel.id) ?? null}
	/>
</Strip>
