<script>
	/**
	 * Setup's step between beat 1 and naming the parts: check the bars. Play
	 * with the count clicks (higher on ONE); where ONE falls wrong, Fix this
	 * bar pauses and opens the bar under the playhead with only its beats
	 * − / + (the bars after it move along). The beat dots' menus are there
	 * too (A bar starts here). A change of time for a stretch is fixed a bar
	 * at a time, for now.
	 */
	import TranscriptionGrid from './TranscriptionGrid.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import ZoomControl from '$lib/components/zoom/ZoomControl.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);

	/** @param {number} seconds */
	function clock(seconds) {
		const whole = Math.max(0, Math.floor(seconds));
		return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-lg">
		Play and listen. The high click should land on “one” of every bar. Where it doesn’t, press Fix
		this bar and give it more or fewer beats.
	</p>

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
			>{clock(player.time)} / {clock(player.duration)}</span
		>
		<SpeedControl {player} />
		<ZoomControl zoom={settings.transcribe.zoom} />
	</div>

	<div>
		<button
			type="button"
			class="big ui-button"
			onclick={() => transcription.fixBarHere()}
			use:tooltip={TIPS.transcription.fixBar}>Fix this bar</button
		>
	</div>

	<TranscriptionGrid {transcription} view="bars" />

	<div class="flex justify-end border-t border-line pt-4">
		<button
			type="button"
			class="big ui-button ui-button-primary"
			onclick={() => transcription.doneCheckingBars()}
			use:tooltip={TIPS.transcription.barsRight}>The bars sound right</button
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
