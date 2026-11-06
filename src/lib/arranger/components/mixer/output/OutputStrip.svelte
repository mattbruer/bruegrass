<script>
	/**
	 * The output stage's strip, after the master: how loud it sounds (LUFS),
	 * how hard the limiter is working, the output gain, Match (set the gain
	 * so this song hits the loudness target), and a level-matched Compare.
	 */
	import Strip from '../Strip.svelte';
	import Slider from '../Slider.svelte';
	import LoudnessReadout from './LoudnessReadout.svelte';
	import LimiterMeter from './LimiterMeter.svelte';
	import CompareButtons from './CompareButtons.svelte';
	import { OUTPUT_GAIN_SCALE } from '../controlScales.js';
	import { mixer, DEFAULT_OUTPUT_GAIN } from '../../../playback/mixer.svelte.js';
	import { audioTaps } from '../../../playback/mixerGraph.svelte.js';
	import { matchTargetLoudness } from '../../../playback/output/outputStage.svelte.js';
	import { TARGET_LUFS } from '../../../playback/output/outputSettings.js';
	import { formatLufs } from './formatReadings.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** What Match last did, shown briefly under it. */
	let matchNote = $state('');

	function match() {
		const result = matchTargetLoudness(audioTaps.current?.output.read() ?? null);
		if (!result.ok) matchNote = result.reason;
		else if (Math.abs(result.changeDb) < 0.1) matchNote = 'Already on target.';
		else
			matchNote = `Gain ${result.changeDb > 0 ? 'up' : 'down'} ${Math.abs(result.changeDb).toFixed(1)} dB.`;
	}
</script>

<Strip id="output" name="Loudness" kind="master" hasEq={false}>
	<div class="flex w-28 flex-col items-center gap-3">
		<LoudnessReadout />
		<LimiterMeter />

		<Slider
			name="Gain"
			bind:value={mixer.output.gain}
			{...OUTPUT_GAIN_SCALE}
			reset={DEFAULT_OUTPUT_GAIN}
			label="Output gain"
			tip={TIPS.loudness.gain}
		/>

		<button
			type="button"
			class="w-full ui-button px-2 py-1 text-xs ui-button-primary"
			use:tooltip={TIPS.loudness.match}
			onclick={match}
		>
			Match {formatLufs(TARGET_LUFS)}
		</button>
		{#if matchNote}
			<p class="text-center text-[0.65rem] text-ink-soft" aria-live="polite">{matchNote}</p>
		{/if}

		<CompareButtons />
	</div>
</Strip>
