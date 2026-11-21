<script>
	/**
	 * The recording's menu, on its lane: the whole song's beats (Move beat
	 * 1, counting twice or half as fast, finding them again) and how the slowed-down sound is made.
	 */
	import Popover from '$lib/components/Popover.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { SOUNDS } from '$lib/slowDowner/sounds.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();
</script>

<Popover class="px-1.5 text-xs" tip={TIPS.transcription.more}>
	{#snippet button()}<span aria-hidden="true">⋯</span><span class="sr-only"
			>The recording's menu</span
		>{/snippet}
	<span class="heading">Beats</span>
	<button
		type="button"
		class="ui-button px-3 py-1.5 text-left text-sm"
		onclick={() => transcription.setDownbeatAgain()}
		use:tooltip={TIPS.transcription.moveDownbeat}>Move beat 1…</button
	>
	<button
		type="button"
		class="ui-button px-3 py-1.5 text-left text-sm"
		onclick={() => transcription.doubleBeats()}
		use:tooltip={TIPS.transcription.doubleBeats}>Count twice as fast</button
	>
	<button
		type="button"
		class="ui-button px-3 py-1.5 text-left text-sm"
		onclick={() => transcription.halveBeats()}
		use:tooltip={TIPS.transcription.halveBeats}>Count half as fast</button
	>
	<button
		type="button"
		class="ui-button px-3 py-1.5 text-left text-sm"
		onclick={() => transcription.findBeatsAgain()}
		use:tooltip={TIPS.transcription.findAgain}>Find the beats again</button
	>
	<span class="heading">Slowed-down sound</span>
	<TabSwitch
		tabs={SOUNDS}
		bind:value={settings.transcribe.sound}
		tips={TIPS.transcribe.sounds}
		label="Sound"
	/>
</Popover>

<style>
	.heading {
		margin-top: 0.25rem;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}
</style>
