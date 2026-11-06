<script>
	/**
	 * How loud it sounds, in LUFS: "Now" (the last 3 seconds) and "Song"
	 * (everything since Play, the number Match uses), beside the target.
	 * The numbers update ten times a second (the meter's own rate).
	 */
	import { onMount } from 'svelte';
	import { audioTaps } from '../../../playback/mixerGraph.svelte.js';
	import { onEveryFrame } from '../../../playback/analysis/frameLoop.js';
	import { TARGET_LUFS } from '../../../playback/output/outputSettings.js';
	import { formatLufs } from './formatReadings.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** Readings change ten times a second; redrawing faster than this is wasted. */
	const UPDATE_SECONDS = 0.1;

	let now = $state('–');
	let song = $state('–');

	onMount(() => {
		let sinceUpdate = UPDATE_SECONDS;
		return onEveryFrame((_now, elapsed) => {
			sinceUpdate += elapsed;
			if (sinceUpdate < UPDATE_SECONDS) return;
			sinceUpdate = 0;
			const readings = audioTaps.current?.output.read();
			now = formatLufs(readings?.shortTerm ?? -Infinity);
			song = formatLufs(readings?.integrated ?? -Infinity);
		});
	});
</script>

<div class="readout ui-well" aria-label="Loudness in LUFS" use:tooltip={TIPS.loudness.readout}>
	<span class="unit">LUFS</span>
	<span class="label">Now</span><span class="value">{now}</span>
	<span class="label">Song</span><span class="value">{song}</span>
	<span class="label">Target</span><span class="value target">{formatLufs(TARGET_LUFS)}</span>
</div>

<style>
	.readout {
		display: grid;
		grid-template-columns: auto auto;
		gap: 0.1rem 0.5rem;
		align-items: baseline;
		width: 100%;
		padding: 0.4rem 0.5rem;
		font-size: 0.65rem;
	}

	.unit {
		grid-column: 1 / -1;
		text-align: center;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--color-ink-soft);
	}

	.label {
		color: var(--color-ink-soft);
	}

	.value {
		text-align: right;
		font-family: ui-monospace, monospace;
		color: var(--color-ink);
	}

	.target {
		color: var(--color-accent);
	}
</style>
