<script>
	/**
	 * The Band lane's header: its name picks it (the chart as text below),
	 * its menu guesses or clears the chords, then mute, solo and volume.
	 */
	import LaneName from './LaneName.svelte';
	import BandMenu from '../BandMenu.svelte';
	import MuteSoloButtons from '../../mixer/MuteSoloButtons.svelte';
	import LaneVolume from '../LaneVolume.svelte';
	import { picksTheLane } from './pickingClick.js';
	import { BAND_LANE } from '../../../transcription/TranscriptionState.svelte.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const picked = $derived(transcription.lane === BAND_LANE);
	const pick = () => (transcription.lane = BAND_LANE);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events (the lane's name is the button) -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="ui-side-column ui-track-header cursor-pointer"
	class:picked
	onclick={(event) => picksTheLane(event) && pick()}
>
	<LaneName name="Band" tip={TIPS.transcription.bandLane} {picked} onpick={pick} />
	<BandMenu {transcription} />
	<MuteSoloButtons settings={transcription.band.lane} name="Band" />
	<LaneVolume level={transcription.band.lane} name="Band" />
</div>
