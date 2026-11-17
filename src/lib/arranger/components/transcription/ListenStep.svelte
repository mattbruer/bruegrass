<script>
	/**
	 * Setup's last step: listen through with the count clicks (higher on
	 * ONE). Where "one" drifts (a crooked bar in a live solo, or a beat the
	 * finder got wrong), put the playhead on the real "one", or tap it while
	 * it plays, and press "One" is here: nothing to count. Done whenever it
	 * sounds right. Parts are named later, in the workspace.
	 */
	import TranscriptionGrid from './TranscriptionGrid.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import ZoomControl from '$lib/components/zoom/ZoomControl.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { formatClock } from '$lib/utils/formatClock.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1 text-lg">
		<p>Play and listen. The high click should land on “one” of every bar.</p>
		<p>
			Where it doesn’t, put the playhead on the real “one”, or tap it while it plays, and press
			“One” is here.
		</p>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<button
			type="button"
			class="big ui-button"
			onclick={() => (player.playing ? player.pause() : player.play())}
			use:tooltip={TIPS.transcription.play}
		>
			{player.playing ? '❚❚ Pause' : '▶ Play'}
		</button>
		<button
			type="button"
			class="ui-button px-4 py-2"
			onclick={() => player.seek(0)}
			use:tooltip={TIPS.transcription.fromTheStart}>⏮ From the start</button
		>
		<span class="text-lg text-ink-soft tabular-nums"
			>{formatClock(player.time, { tenths: true })} / {formatClock(player.duration)}</span
		>
		<SpeedControl {player} />
		<ZoomControl zoom={settings.transcribe.zoom} />
	</div>

	<div class="flex flex-wrap gap-3">
		<button
			type="button"
			class="big ui-button"
			onclick={() => transcription.oneIsHere()}
			use:tooltip={TIPS.transcription.oneIsHere}>“One” is here</button
		>
	</div>

	<TranscriptionGrid {transcription} view="setup" />

	<div class="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
		<button
			type="button"
			class="big ui-button ui-button-primary"
			onclick={() => transcription.doneListening()}
			use:tooltip={TIPS.transcription.doneListening}>Done</button
		>
	</div>
</div>

<style>
	.big {
		min-height: 3.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1.15rem;
		font-weight: 600;
	}
</style>
