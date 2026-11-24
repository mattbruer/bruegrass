<script>
	/**
	 * A part's lane header: its name picks it (the piano roll below), then
	 * mute, solo and volume (its mixer channel's), its instrument and its menu.
	 */
	import LaneName from './LaneName.svelte';
	import LaneMenu from '../LaneMenu.svelte';
	import MuteSoloButtons from '../../mixer/MuteSoloButtons.svelte';
	import LaneVolume from '../LaneVolume.svelte';
	import InstrumentButton from '../../mixer/instruments/InstrumentButton.svelte';
	import { isTuneChannel } from '../../../melody/harmony/partChannels.js';
	import { mixer } from '../../../mixer/mixer.svelte.js';
	import { picksTheLane } from './pickingClick.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, lane: import('../../../tracks/lanes.js').BandLane }} */
	let { transcription, lane } = $props();

	const channel = $derived(mixer.channels.find((each) => each.id === lane.id));
	const picked = $derived(transcription.lane === lane.id);
	const pick = () => (transcription.lane = lane.id);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events (the lane's name is the button) -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="ui-side-column ui-track-header cursor-pointer"
	class:picked
	onclick={(event) => picksTheLane(event) && pick()}
>
	<LaneName name={lane.name} tip={TIPS.transcription.partLane} {picked} onpick={pick} />
	{#if channel}
		<MuteSoloButtons settings={channel} name={lane.name} />
		<LaneVolume level={channel} name={lane.name} />
	{/if}
	<div class="instrument-row">
		{#if channel && isTuneChannel(lane.id)}<InstrumentButton {channel} />{/if}
		<LaneMenu {transcription} {lane} />
	</div>
</div>

<style>
	.instrument-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.375rem;
		width: 100%;
		margin: 0.25rem 0 0.35rem;
	}

	.instrument-row > :global(:first-child:not(:last-child)) {
		flex: 1;
		min-width: 0;
	}

	.instrument-row :global(.instrument) {
		padding: 0.45rem 0.6rem;
		font-size: 0.78rem;
	}
</style>
