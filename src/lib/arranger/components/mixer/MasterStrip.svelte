<script>
	/** The master fader: everything you hear passes through it. */
	import Strip from './Strip.svelte';
	import ChannelFader from './ChannelFader.svelte';
	import { mixer, DEFAULT_MASTER_LEVEL_DB } from '../../playback/mixer.svelte.js';
	import { audioTaps } from '../../playback/mixerGraph.svelte.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<Strip id="master" name="Master" kind="master">
	<ChannelFader
		level={mixer.master}
		reset={DEFAULT_MASTER_LEVEL_DB}
		label="Master"
		meter={audioTaps.current?.master ?? null}
		variant="master"
		tip={TIPS.mixer.masterFader}
	/>
</Strip>
