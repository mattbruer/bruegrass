<script>
	/**
	 * The arrangement as a horizontal chart of measures that scrolls past a
	 * fixed playhead while playing. It's a loop, so the chart repeats end to
	 * end and wraps seamlessly.
	 */

	/** @typedef {Awaited<ReturnType<typeof import('../../playback/livePlayback.js').playArrangement>>} Playback */

	/** @typedef {import('../../chart/chartAnalysis.js').ChordPlace} ChordPlace */

	/**
	 * @type {{
	 *   sections: import('../../chart/loop.js').LoopSection[],
	 *   playback: Playback | null,
	 *   restAt?: number,
	 *   label?: (chord: string, place: ChordPlace) => string,
	 *   onChordTap?: (place: ChordPlace) => void,
	 *   onSpotTap?: (spot: import('../../chart/chordSpot.js').ChordSpot) => void
	 * }}
	 *   restAt: while stopped, rest here (quarters in) rather than on the last
	 *   edit: where Play carries on; onChordTap: given, chords are buttons (tap to change one);
	 *   onSpotTap: given, every place in a bar a chord can go is a button too (a bar holding
	 *   the chord before, the second half of a bar); a written chord there opens as itself
	 */
	let {
		sections,
		playback,
		restAt = 0,
		label = (chord) => chord,
		onChordTap,
		onSpotTap
	} = $props();

	import { namesChord } from '../../chart/chordChanges.js';
	import { barsInPlayOrder } from '../../chart/chartBars.js';
	import { placeInSong } from '../../chart/loop.js';
	import GlassPlayhead from './GlassPlayhead.svelte';
	import { chordPlaces } from '../../chart/chordPlaces.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

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

	/** The chord names bar by bar, to find what an edit changed. */
	let chordsByBar = $derived(
		measures.map((bar) => bar.chords.map((chord) => chord.name).join(','))
	);
	/** Where the strip rests while stopped: the first bar the last edit changed. */
	let restingBar = $state(0);
	let previousChords = /** @type {string[]} */ ([]);

	$effect(() => {
		const changed = chordsByBar.findIndex((chords, index) => chords !== previousChords[index]);
		const firstTime = previousChords.length === 0;
		previousChords = chordsByBar;
		if (changed >= 0 && !firstTime) restingBar = changed;
	});

	/**
	 * A tap on a place in a bar: the chord written there, if one starts
	 * there, else the spot.
	 * @param {import('../../chart/chartBars.js').ChartBar} bar
	 * @param {number} beat
	 */
	function tapSpot(bar, beat) {
		let at = 0;
		for (const chord of bar.chords) {
			if (at === beat && !bar.held)
				return onChordTap?.({ ...placeInSong(sections, bar), chord: chord.chord });
			at += chord.length;
		}
		onSpotTap?.({ ...placeInSong(sections, bar), beat });
	}

	/**
	 * Where a bar's tap areas go: one per place a chord can change, each up to the next.
	 * @param {number} beats
	 */
	function spotsIn(beats) {
		const places = chordPlaces(beats);
		return places.map((beat, i) => ({ beat, length: (places[i + 1] ?? beats) - beat }));
	}

	/** @param {number} bar */
	function progressAtBar(bar) {
		const beats = measures.slice(0, bar).reduce((sum, each) => sum + each.beats, 0);
		return passWidth > 0 ? (beats * BEAT_PX) / passWidth : 0;
	}

	// The playhead marks where you are; the chart just slides under it
	$effect(() => {
		if (!playback) {
			scrollTo(restAt > 0 ? (restAt * BEAT_PX) / passWidth : progressAtBar(restingBar));
			return;
		}
		const active = playback;
		restingBar = 0;
		let frame = requestAnimationFrame(function tick() {
			scrollTo(active.position()?.progress ?? 0);
			frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	});
</script>

<div class="window">
	<div class="stage">
		<div class="chart" bind:clientWidth={width}>
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
							{#if onSpotTap}
								{#each spotsIn(bar.beats) as spot (spot.beat)}
									<button
										type="button"
										class="spot"
										style="left: {spot.beat * BEAT_PX}px; width: {spot.length * BEAT_PX}px"
										aria-label="Bar {bar.index + 1}, beat {spot.beat + 1}: put a chord here"
										onclick={() => tapSpot(bar, spot.beat)}
										use:tooltip={TIPS.player.editSpot}
									></button>
								{/each}
							{/if}
							{#each bar.chords as chord, slot (chord.chord)}
								{@const place = { ...placeInSong(sections, bar), chord: chord.chord }}
								{@const text = label(chord.name, place)}
								<div class="slot" style="width: {chord.length * BEAT_PX}px">
									{#if !namesChord(measures, bar.index, slot)}
										<span class="chord" aria-hidden="true">&nbsp;</span>
									{:else if onChordTap}
										<button
											type="button"
											class="chord tappable"
											class:long={text.length > 4}
											class:longer={text.length > 7}
											onclick={() => onChordTap(place)}
											use:tooltip={TIPS.player.editChord}>{text}</button
										>
									{:else}
										<span class="chord" class:long={text.length > 4} class:longer={text.length > 7}
											>{text}</span
										>
									{/if}
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
			<div class="sheen" aria-hidden="true"></div>
		</div>
		<GlassPlayhead x={playheadX} />
	</div>
</div>

<style>
	/*
	 * Black ink, whatever the theme: the chart reads like a printed lead sheet.
	 * The paper and the frame around it: plain colours, set here.
	 */
	.window {
		--strip-ink: #000000;
		--strip-ink-faint: #6b6b6b;

		/* A dark bezel, the music behind glass inside it */
		border-radius: calc(var(--corner-card) * 0.7);
		background: var(--strip-bezel, #18191c);
		padding: 7px;
		text-shadow: none;
		box-shadow:
			inset 0 2px 5px rgb(0 0 0 / calc(0.8 * var(--depth-on))),
			var(--shadow-sunk-deep),
			0 1px 0 rgb(255 255 255 / calc(0.5 * var(--depth-on)));
	}

	.stage {
		position: relative;
	}

	.chart {
		position: relative;
		overflow: hidden;
		border-radius: calc(var(--corner-card) * 0.4);
		background: var(--strip-paper, #ffffff);
		/* Set back behind the bezel's lip, lit from behind when the look glows */
		box-shadow:
			inset 0 0 28px var(--strip-glow, transparent),
			inset 0 7px 10px -5px rgb(0 0 0 / calc(0.45 * var(--depth-on)));
		padding: 1.75rem 0 0.75rem;
	}

	/* The window's glass, catching the light from above */
	.sheen {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(172deg, rgb(255 255 255 / 0.32), rgb(255 255 255 / 0) 38%);
	}

	.track {
		display: flex;
		width: max-content;
		will-change: transform;
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

	/* A place in the bar a chord can go: under the chord names, the whole height of the bar */
	.spot {
		position: absolute;
		inset-block: 0;
		border-radius: var(--corner-small);
	}

	@media (hover: hover) {
		.spot:hover {
			background: rgb(0 0 0 / 0.06);
		}
	}

	.spot:focus-visible {
		outline: 2px solid var(--strip-ink);
		outline-offset: -2px;
	}

	.slot {
		position: relative;
		pointer-events: none;
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

	/* Function labels (subV7/V) are longer than chord names */
	.chord.long {
		font-size: 1rem;
	}

	.chord.longer {
		font-size: 0.8rem;
	}

	.tappable {
		position: relative;
		pointer-events: auto;
		align-self: flex-start;
		border-radius: var(--corner-small);
		text-align: left;
		text-decoration: underline dotted;
		text-underline-offset: 0.2em;
	}

	@media (hover: hover) {
		.tappable:hover {
			background: rgb(0 0 0 / 0.08);
		}
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
