<script>
	/**
	 * The recording's menu, on its lane: its tuning (how far from A = 440),
	 * the whole song's beats and how the slowed-down sound is made. It stays
	 * open while the recording plays, so the tuning can be nudged by ear.
	 */
	import Popover from '$lib/components/Popover.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import TuningControl from './TuningControl.svelte';
	import DoubleBeatsButton from './actions/DoubleBeatsButton.svelte';
	import HalveBeatsButton from './actions/HalveBeatsButton.svelte';
	import FindBeatsAgainButton from './actions/FindBeatsAgainButton.svelte';
	import { SOUNDS } from '$lib/slowDowner/sounds.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();
</script>

<Popover class="px-1.5 text-xs" tip={TIPS.transcription.more}>
	{#snippet button()}<span aria-hidden="true">⋯</span><span class="sr-only"
			>The recording's menu</span
		>{/snippet}
	<span class="ui-menu-heading">Tuning</span>
	<TuningControl {transcription} />
	<span class="ui-menu-heading">Beats</span>
	<DoubleBeatsButton {transcription} class="ui-menu-item" />
	<HalveBeatsButton {transcription} class="ui-menu-item" />
	<FindBeatsAgainButton {transcription} class="ui-menu-item" />
	<span class="ui-menu-heading">Slowed-down sound</span>
	<TabSwitch
		tabs={SOUNDS}
		bind:value={settings.transcribe.sound}
		tips={TIPS.transcribe.sounds}
		label="Sound"
	/>
</Popover>
