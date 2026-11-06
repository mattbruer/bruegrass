<script>
	/**
	 * The reverb aux, as in Logic: every channel sends to it, the reverb
	 * plugin on its insert slot shapes the sound, and its fader sets the
	 * overall reverb level.
	 */
	import Strip from './Strip.svelte';
	import PluginSlot from './PluginSlot.svelte';
	import MuteSoloButtons from './MuteSoloButtons.svelte';
	import ChannelFader from './ChannelFader.svelte';
	import ReverbPluginWindow from './ReverbPluginWindow.svelte';
	import { mixer, DEFAULT_REVERB_LEVEL_DB } from '../../playback/mixer.svelte.js';
	import { audioTaps } from '../../playback/mixerGraph.svelte.js';

	let pluginWindowOpen = $state(false);
</script>

<Strip id="reverb" name="Reverb" kind="aux">
	<PluginSlot
		name="Reverb"
		bind:enabled={mixer.reverb.plugin.enabled}
		windowOpen={pluginWindowOpen}
		onOpen={() => (pluginWindowOpen = !pluginWindowOpen)}
	/>
	<MuteSoloButtons settings={mixer.reverb} name="Reverb" />
	<ChannelFader
		level={mixer.reverb}
		reset={DEFAULT_REVERB_LEVEL_DB}
		label="Reverb"
		meter={audioTaps.current?.reverb ?? null}
	/>
</Strip>

<ReverbPluginWindow bind:open={pluginWindowOpen} settings={mixer.reverb.plugin} />
