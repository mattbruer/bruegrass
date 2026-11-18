<script>
	/**
	 * The part as TAB, on its own: the chart's chords over the notes they
	 * go with, the TAB, and the bars numbered under it (click to play from
	 * there, where the page can), all scrolling sideways together at the piano roll's scale.
	 * While playing, a line shows where the band is and the view follows it
	 * (it lets go for a moment when you scroll it yourself).
	 */
	import { onEveryFrame } from '../../../audio/analysis/frameLoop.js';
	import { followScroll } from '../../melody/roll/followView.js';
	import { barLabel, tickWidthFor } from '../../melody/roll/rollLayout.js';
	import { tabX, tickAtTabX } from '../../tab/tabLayout.js';
	import TabStrip from './TabStrip.svelte';

	const LABEL_WIDTH = 44;
	const FOLLOW_PAUSE_MS = 3000;

	/**
	 * @type {{
	 *   tabNotes: import('../../tab/fingering.js').TabNote[],
	 *   board: import('../../tab/fretboards.js').Fretboard,
	 *   score: import('../../melody/roll/readScore.js').Score,
	 *   chordsUnder: import('../../melody/roll/chordsUnderBars.js').ChordUnder[],
	 *   chordName: (name: string, place?: import('../../chart/chartAnalysis.js').ChordPlace) => string,
	 *   end: number,
	 *   gridStep: number,
	 *   zoom?: { across: number, down: number },
	 *   selected: import('../../melody/roll/editNotes.js').DrawnNote | null,
	 *   playing: boolean,
	 *   playhead: () => number | null,
	 *   onSeek?: (ticks: number) => void,
	 *   onSelect: (tabNote: import('../../tab/fingering.js').TabNote) => void,
	 *   onFret: (tabNote: import('../../tab/fingering.js').TabNote, fret: number) => void,
	 *   onString: (tabNote: import('../../tab/fingering.js').TabNote, direction: -1 | 1) => void,
	 *   onDelete: (tabNote: import('../../tab/fingering.js').TabNote) => void
	 * }}
	 */
	let {
		tabNotes,
		board,
		score,
		chordsUnder,
		chordName,
		end,
		gridStep,
		zoom = { across: 1, down: 1 },
		selected,
		playing,
		playhead,
		onSeek,
		onSelect,
		onFret,
		onString,
		onDelete
	} = $props();

	const tickWidth = $derived(tickWidthFor(gridStep, zoom.across));
	const width = $derived(end * tickWidth);

	/** @type {HTMLElement | undefined} */
	let scroller = $state();
	/** @type {HTMLElement | undefined} */
	let playheadLine = $state();
	let followPausedUntil = 0;

	$effect(() => {
		if (!playing) return;
		const stop = onEveryFrame(followBand);
		return () => {
			stop();
			if (playheadLine) playheadLine.style.display = 'none';
		};
	});

	function followBand() {
		const tick = playhead();
		if (!playheadLine || !scroller) return;
		if (tick === null || !Number.isFinite(tick)) {
			playheadLine.style.display = 'none';
			return;
		}
		playheadLine.style.display = 'block';
		playheadLine.style.transform = `translateX(${LABEL_WIDTH + tabX(tick, score.bars, tickWidth)}px)`;
		if (performance.now() < followPausedUntil) return;
		const view = { width: scroller.clientWidth - LABEL_WIDTH, height: 0, top: 0 };
		scroller.scrollLeft = followScroll(tick, [], view, {
			tickWidth,
			rowHeight: 0,
			highest: 0
		}).left;
	}

	function pauseFollowing() {
		followPausedUntil = performance.now() + FOLLOW_PAUSE_MS;
	}

	/** @param {MouseEvent & { currentTarget: HTMLElement }} event */
	function seekFromRuler(event) {
		const box = event.currentTarget.getBoundingClientRect();
		onSeek?.(tickAtTabX(event.clientX - box.left, score.bars, tickWidth));
	}
</script>

<div
	bind:this={scroller}
	class="tab-view relative overflow-x-auto ui-well"
	role="region"
	aria-label="{board.name} TAB"
	onwheel={pauseFollowing}
	ontouchstart={pauseFollowing}
>
	<div class="relative" style:width="{LABEL_WIDTH + width}px">
		<div class="flex">
			<div class="corner sticky left-0 z-10 shrink-0" style:width="{LABEL_WIDTH}px"></div>
			<div class="chords relative" style:width="{width}px">
				{#each chordsUnder as chord (`${chord.at}:${chord.name}`)}
					<span class="chord" style:left="{tabX(chord.at, score.bars, tickWidth)}px"
						>{chordName(chord.name, chord.place)}</span
					>
				{/each}
			</div>
		</div>

		<div class="flex">
			<TabStrip
				{tabNotes}
				{board}
				bars={score.bars}
				{tickWidth}
				{width}
				labelWidth={LABEL_WIDTH}
				{selected}
				{onSelect}
				{onFret}
				{onString}
				{onDelete}
			/>
		</div>

		<div class="flex">
			<div class="corner sticky left-0 z-10 shrink-0" style:width="{LABEL_WIDTH}px"></div>
			<!-- svelte-ignore a11y_click_events_have_key_events (the page's own keys move around) -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="ruler relative"
				class:seeks={onSeek}
				style:width="{width}px"
				onclick={onSeek ? seekFromRuler : undefined}
			>
				{#each score.bars as bar, index (bar.start)}
					<span class="bar-number" style:left="{bar.start * tickWidth}px"
						>{barLabel(score.bars, index)}</span
					>
				{/each}
			</div>
		</div>

		<div bind:this={playheadLine} class="playhead"></div>
	</div>
</div>

<style>
	.tab-view {
		padding: 0;
	}
	.corner,
	.ruler,
	.chords {
		background: var(--color-surface-deep);
	}
	.ruler,
	.chords {
		font-size: 0.75rem;
		color: var(--color-ink-soft);
	}
	.ruler {
		height: 22px;
	}
	.ruler.seeks {
		cursor: pointer;
	}
	.bar-number {
		position: absolute;
		top: 0.15rem;
		padding-left: 0.25rem;
	}
	.chords {
		height: 26px;
	}
	/* Over its first note: the name starts a little left of the fret number's middle */
	.chord {
		position: absolute;
		bottom: 0;
		transform: translateX(-0.4rem);
		white-space: nowrap;
		color: var(--color-ink);
		font-size: 0.85rem;
		font-weight: 700;
	}
	.playhead {
		display: none;
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 2px;
		z-index: 5;
		pointer-events: none;
		background: var(--color-ink);
	}
</style>
