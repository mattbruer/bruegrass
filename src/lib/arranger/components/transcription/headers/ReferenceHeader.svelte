<script>
	/** The recording's lane header: its menu, mute and solo, waveform colour and volume. */
	import LaneName from './LaneName.svelte';
	import ReferenceMenu from '../ReferenceMenu.svelte';
	import MuteSoloButtons from '../../mixer/MuteSoloButtons.svelte';
	import LaneColour from '../LaneColour.svelte';
	import LaneVolume from '../LaneVolume.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();
</script>

<div class="ui-side-column ui-track-header">
	<LaneName name="Reference" />
	<ReferenceMenu {transcription} />
	<span class="flex items-center gap-1.5">
		<MuteSoloButtons settings={transcription.referenceLane} name="Reference" />
		<LaneColour
			bind:color={settings.appearance.waveform}
			label="Waveform colour"
			tip={TIPS.transcription.waveformColour}
		/>
	</span>
	<LaneVolume level={transcription.referenceLane} name="Reference" />
</div>
