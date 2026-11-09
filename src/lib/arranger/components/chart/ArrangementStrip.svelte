<script>
	/**
	 * The arrangement as a horizontal chart of measures that scrolls past a
	 * fixed playhead while playing. It's a loop, so the chart repeats end to
	 * end and wraps seamlessly.
	 */

	/** @typedef {Awaited<ReturnType<typeof import('../../playback/livePlayback.js').playArrangement>>} Playback */

	/**
	 * @type {{
	 *   sections: { name?: string, measures: string[][] }[],
	 *   playback: Playback | null,
	 *   label?: (chord: string) => string
	 * }}
	 */
	let { sections, playback, label = (chord) => chord } = $props();

	import { barsInPlayOrder } from '../../chart/chartBars.js';

	/** Width of one beat (quarter note); chords and bars are sized by their beats. */
	const BEAT_PX = 40;
	/** The playhead sits this far in from the left (at most a quarter of the view). */
	const PLAYHEAD_PX = 160;

	let width = $state(0);
	/** @type {HTMLDivElement | undefined} */
	let track = $state();

	/** Bars in play order, each with its chords and their lengths in beats. */
	let measures = $derived(barsInPlayOrder(sections));
	let passWidth = $derived(measures.reduce((sum, measure) => sum + measure.beats, 0) * BEAT_PX);
	let playheadX = $derived(Math.min(PLAYHEAD_PX, width / 4));
	// Enough copies to fill the view on both sides of the playhead
	let copies = $derived(passWidth > 0 ? Math.ceil(width / passWidth) + 2 : 0);

	/** @param {number} progress 0–1 through the pass */
	function scrollTo(progress) {
		// Copy 1 is the pass being played; copy 0 is the one just before it
		if (track) track.style.transform = `translateX(${playheadX - passWidth * (1 + progress)}px)`;
	}

	// The playhead marks where you are; the chart just slides under it
	$effect(() => {
		if (!playback) {
			scrollTo(0);
			return;
		}
		const active = playback;
		let frame = requestAnimationFrame(function tick() {
			scrollTo(active.position()?.progress ?? 0);
			frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	});
</script>

<div class="chart" bind:clientWidth={width}>
	<div class="playhead" style="left: {playheadX}px" aria-hidden="true"></div>

	<div class="track" bind:this={track}>
		{#each { length: copies }, copy (copy)}
			{#each measures as bar (bar.section + ':' + bar.measure)}
				<div
					class="measure"
					class:section-start={bar.sectionStart}
					style="width: {bar.beats * BEAT_PX}px"
				>
					{#if bar.sectionStart || bar.meter}
						<span class="bar-label">
							{#if bar.sectionStart}<span class="section-name">{bar.sectionName}</span>{/if}
							{#if bar.meter}<span class="meter">{bar.meter}</span>{/if}
						</span>
					{/if}
					{#each bar.chords as chord (chord.chord)}
						<div class="slot" style="width: {chord.length * BEAT_PX}px">
							<span class="chord">{label(chord.name)}</span>
							<span class="beats">
								{#each { length: chord.length }, beat (beat)}
									<span>/</span>
								{/each}
							</span>
						</div>
					{/each}
				</div>
			{/each}
		{/each}
	</div>
</div>

<style>
	/*
	 * Always black and white, whatever the theme: the chart reads like a printed
	 * lead sheet. These are the only colours in this file that aren't theme tokens.
	 */
	.chart {
		--strip-paper: #ffffff;
		--strip-ink: #000000;
		--strip-ink-faint: #6b6b6b;

		position: relative;
		overflow: hidden;
		/* A well sunk into the player card, the music sliding through it */
		border-radius: var(--corner-card);
		background: var(--strip-paper);
		box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.25);
		padding: 1.75rem 0 0.75rem;
	}

	.track {
		display: flex;
		width: max-content;
		will-change: transform;
	}

	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		z-index: 1;
		width: 2px;
		background: var(--strip-ink);
		pointer-events: none;
	}

	.measure {
		position: relative;
		display: flex;
		flex-shrink: 0;
		/* Barline at the start of every measure, like the pipes in the arrangement */
		border-left: 2px solid var(--strip-ink);
		height: 4.5rem;
	}

	/* Double barline where a new section starts */
	.measure.section-start {
		border-left: 6px double var(--strip-ink);
	}

	.bar-label {
		position: absolute;
		top: -1.5rem;
		left: 0.25rem;
		display: flex;
		gap: 0.4rem;
		align-items: baseline;
		white-space: nowrap;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.section-name {
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--strip-ink);
	}

	/* Time signature, shown at the top and wherever it changes */
	.meter {
		border-radius: var(--corner-small);
		background: var(--strip-ink);
		padding: 0 0.3rem;
		font-family: ui-monospace, monospace;
		color: var(--strip-paper);
	}

	.slot {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding-block: 0.4rem;
		overflow: hidden;
	}

	.chord {
		padding-left: 0.5rem;
		white-space: nowrap;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--strip-ink);
	}

	.beats {
		display: flex;
		font-family: ui-monospace, monospace;
		font-weight: 700;
		color: var(--strip-ink-faint);
	}

	/* One slash per beat, each in its own beat-wide cell */
	.beats > span {
		display: inline-block;
		width: 40px;
		padding-left: 0.6rem;
	}
</style>
