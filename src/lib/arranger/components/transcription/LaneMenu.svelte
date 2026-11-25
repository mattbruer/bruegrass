<script>
	/**
	 * A part lane's menu (⋯ beside its name): a name of your own for it, and,
	 * for a lane added with + Lane, making it the bass line (rare: most
	 * people never write a bass) or taking it away.
	 */
	import Popover from '$lib/components/Popover.svelte';
	import LaneNameField from './actions/LaneNameField.svelte';
	import MakeLaneBassButton from './actions/MakeLaneBassButton.svelte';
	import UseBandsBassButton from './actions/UseBandsBassButton.svelte';
	import RemoveLaneButton from './actions/RemoveLaneButton.svelte';
	import { isExtraPart } from '../../melody/extraParts.js';
	import { BASS_VOICE } from '../../bass/readBass.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState,
	 *   lane: import('../../tracks/lanes.js').BandLane
	 * }}
	 */
	let { transcription, lane } = $props();

	const added = $derived(isExtraPart(lane.id));
	const bassWritten = $derived(transcription.arranger.bass.isWritten);
	const bassLane = $derived(lane.id === BASS_VOICE);
</script>

<Popover class="px-1.5 text-xs" tip={TIPS.transcription.laneMenu}>
	{#snippet button()}<span aria-hidden="true">⋯</span><span class="sr-only">{lane.name}'s menu</span
		>{/snippet}
	<LaneNameField {transcription} {lane} />
	{#if bassLane && bassWritten}<UseBandsBassButton {transcription} class="ui-menu-item" />{/if}
	{#if added}
		{#if !bassWritten}<MakeLaneBassButton {transcription} {lane} class="ui-menu-item" />{/if}
		<RemoveLaneButton {transcription} {lane} class="ui-menu-item" />
	{/if}
</Popover>
