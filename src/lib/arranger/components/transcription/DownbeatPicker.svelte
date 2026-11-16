<script>
	/**
	 * The step before the beats are found: say where beat 1 of bar 1 is.
	 * The whole recording as a waveform with its hits; click it to move the
	 * playhead (the controls above play, slow down and zoom), and when the
	 * playhead is on the first full bar's first beat, Set as beat 1 (it snaps
	 * to the hit nearest). A song that starts with a pickup: the downbeat
	 * after it. The pickup stays as the lead-in before bar 1.
	 */
	import { waveformPath } from '../../takes/waveformPeaks.js';
	import { spikesPath } from '../../transcription/recordingShape.js';
	import { PEAKS_PER_SECOND } from '../../transcription/TranscriptionState.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { keepMiddleInView } from '$lib/components/zoom/zoomLevels.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	/** At the usual zoom. */
	const BASE_PIXELS_PER_SECOND = 100;
	/** Peaks and hits are drawn this many to a pixel column, to keep the drawing light. */
	const VALUES_PER_COLUMN = 4;
	const TICK_SECONDS = 5;
	/** At the usual zoom. */
	const BASE_HEIGHT = 120;

	const player = transcription.player;
	const zoom = $derived(settings.transcribe.zoom);
	const pixelsPerSecond = $derived(BASE_PIXELS_PER_SECOND * zoom.across);
	const height = $derived(BASE_HEIGHT * zoom.down);
	const width = $derived(player.duration * pixelsPerSecond);
	const wave = $derived(
		transcription.peaks ? waveformPath(loudestPer(transcription.peaks, VALUES_PER_COLUMN)) : ''
	);
	const waveColumns = $derived(Math.ceil((transcription.peaks?.length ?? 0) / VALUES_PER_COLUMN));
	const hits = $derived(
		transcription.hits ? spikesPath(loudestPer(transcription.hits.values, VALUES_PER_COLUMN)) : ''
	);
	const hitColumns = $derived(
		Math.ceil((transcription.hits?.values.length ?? 0) / VALUES_PER_COLUMN)
	);
	const hitsWidth = $derived(
		transcription.hits
			? (hitColumns * VALUES_PER_COLUMN * pixelsPerSecond) / transcription.hits.perSecond
			: 0
	);
	const ticks = $derived(
		Array.from(
			{ length: Math.floor(player.duration / TICK_SECONDS) + 1 },
			(_, i) => i * TICK_SECONDS
		)
	);
	const playheadX = $derived(player.time * pixelsPerSecond);

	/** @type {HTMLDivElement | undefined} */
	let scroller = $state();

	$effect(() => {
		if (!player.playing || !scroller) return;
		if (
			playheadX < scroller.scrollLeft ||
			playheadX > scroller.scrollLeft + scroller.clientWidth - 40
		)
			scroller.scrollLeft = playheadX - scroller.clientWidth / 3;
	});

	let shownPixelsPerSecond = 0;
	$effect(() => {
		const change = shownPixelsPerSecond ? pixelsPerSecond / shownPixelsPerSecond : 1;
		shownPixelsPerSecond = pixelsPerSecond;
		if (scroller && change !== 1) keepMiddleInView(scroller, { across: change, down: 1 });
	});

	/**
	 * @param {Float32Array} values
	 * @param {number} count
	 */
	function loudestPer(values, count) {
		const columns = new Float32Array(Math.ceil(values.length / count));
		for (let i = 0; i < values.length; i++)
			columns[Math.floor(i / count)] = Math.max(columns[Math.floor(i / count)], values[i]);
		return columns;
	}

	/** @param {number} seconds */
	function clock(seconds) {
		return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
	}

	/** @param {MouseEvent & { currentTarget: HTMLElement }} event */
	function moveTo(event) {
		const box = event.currentTarget.getBoundingClientRect();
		player.seek((event.clientX - box.left) / pixelsPerSecond);
	}
</script>

<section class="flex flex-col gap-3 ui-card p-4">
	<div>
		<h2 class="text-lg font-bold">Where is beat 1?</h2>
		<p class="text-sm text-ink-soft">
			Find the first full bar’s first beat, the first “boom”: click the recording to move the
			playhead, slow it down and zoom in above. When the playhead is on it, press Set as beat 1. If
			the song starts with a pickup, it’s the downbeat after it: the pickup is kept before bar 1.
		</p>
	</div>

	<div bind:this={scroller} class="scroller ui-well">
		<!-- svelte-ignore a11y_click_events_have_key_events (Space plays; the button below finds the beats) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="strip"
			style:width="{width}px"
			style:height="{height}px"
			onclick={moveTo}
			use:tooltip={TIPS.transcription.downbeatStrip}
		>
			{#each ticks as tick (tick)}
				<span class="tick" style:left="{tick * pixelsPerSecond}px">{clock(tick)}</span>
			{/each}
			<svg
				class="wave"
				style:width="{waveColumns * VALUES_PER_COLUMN * (pixelsPerSecond / PEAKS_PER_SECOND)}px"
				viewBox="0 -1 {waveColumns} 2"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path d={wave} />
			</svg>
			<svg
				class="hits"
				style:left="{(transcription.hits?.offset ?? 0) * pixelsPerSecond}px"
				style:width="{hitsWidth}px"
				viewBox="0 0 {hitColumns} 1"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path d={hits} />
			</svg>
			{#if transcription.downbeat !== null}
				<span class="downbeat" style:left="{transcription.downbeat * pixelsPerSecond}px"
					><b>1</b></span
				>
			{/if}
			<span class="playhead" style:left="{playheadX}px"></span>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<button
			type="button"
			class="ui-button px-4 py-2"
			onclick={() => transcription.setDownbeatHere()}
			use:tooltip={TIPS.transcription.setDownbeat}>Set as beat 1</button
		>
		<button
			type="button"
			class="ui-button px-4 py-2 ui-button-primary"
			disabled={transcription.downbeat === null}
			onclick={() => transcription.findBeatsFromDownbeat()}
			use:tooltip={TIPS.transcription.findFromDownbeat}>Find the beats</button
		>
		{#if transcription.grid}
			<button
				type="button"
				class="ui-button px-4 py-2"
				onclick={() => transcription.cancelSettingDownbeat()}
				use:tooltip={TIPS.transcription.keepBeats}>Keep the beats I have</button
			>
		{/if}
		<span class="text-sm text-ink-soft tabular-nums">
			{transcription.downbeat === null
				? 'Beat 1 not placed yet'
				: `Beat 1 at ${transcription.downbeat.toFixed(3)} s`}
		</span>
	</div>
</section>

<style>
	.scroller {
		overflow-x: auto;
		overflow-y: hidden;
	}

	.strip {
		position: relative;
		cursor: crosshair;
	}

	.tick {
		position: absolute;
		top: 0;
		height: 100%;
		padding-left: 0.2rem;
		border-left: 1px solid var(--color-line);
		font-size: 0.7rem;
		color: var(--color-ink-soft);
		pointer-events: none;
	}

	.wave,
	.hits {
		position: absolute;
		top: 0;
		height: 100%;
		pointer-events: none;
	}

	.wave {
		fill: var(--color-ink-soft);
		opacity: 0.35;
	}

	.hits {
		fill: var(--color-accent);
		opacity: 0.85;
	}

	.downbeat,
	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		pointer-events: none;
	}

	.downbeat {
		border-left: 2px solid var(--color-accent);
	}

	.downbeat b {
		display: block;
		padding: 0 0.3rem;
		background: var(--color-accent);
		color: var(--color-raised);
		font-size: 0.75rem;
		width: fit-content;
	}

	.playhead {
		border-left: 1px solid var(--color-ink);
	}
</style>
