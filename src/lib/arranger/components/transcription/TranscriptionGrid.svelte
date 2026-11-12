<script>
	/**
	 * The track grid, Logic's way: a bar ruler that follows the recording,
	 * the Beats row under it (drag a dot onto its hit; tap one for its menu),
	 * the recording bent onto the bars, the chords by beat, and a lane for
	 * each part being written (+ Lane adds the bass). Lane names stay put
	 * while the lanes scroll sideways together; tap a part to edit it in the
	 * piano roll below. Tap a bar number for its menu (its beats, Loop) and to
	 * play from it. The playhead follows the recording and the lanes scroll
	 * with it.
	 */
	import { useArranger } from '../../state/context.js';
	import { readWrittenBass } from '../../bass/readBass.js';
	import { trackScale } from '../../tracks/trackScale.js';
	import { rulerFromBars, rulerSpanWithRoom } from '../../transcription/rulerFromBars.js';
	import { ADDABLE_LANES, partLanes } from '../../transcription/partLanes.js';
	import { timeSignature } from '../../transcription/timeSignatures.js';
	import TrackRuler from '../tracks/TrackRuler.svelte';
	import BlockLane from '../tracks/BlockLane.svelte';
	import BeatDots from './BeatDots.svelte';
	import GridMenu from './GridMenu.svelte';
	import RecordingLane from './RecordingLane.svelte';
	import ChordLane from './ChordLane.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const { melody, bass } = useArranger();

	/** The names column (px); the lanes scroll under it. */
	const HEADER_WIDTH = 104;
	/** Room for a chord on every beat. */
	const PIXELS_PER_QUARTER = 44;
	/** The playhead sits this far across the lanes while following. */
	const FOLLOW_AT = 1 / 3;

	/** The written bass line, read from its ABC (null: none yet). */
	let writtenBass = $state.raw(
		/** @type {import('../../instruments/bassline.js').BassNote[] | null} */ (null)
	);
	$effect(() => {
		let current = true;
		readWrittenBass(bass.notation).then((notes) => {
			if (current) writtenBass = notes;
		});
		return () => (current = false);
	});

	const beatsPerBar = $derived(timeSignature(transcription.time).beatsPerBar);
	const ruler = $derived(
		rulerFromBars(transcription.bars, beatsPerBar, transcription.grid?.bars.firstBeat ?? 0)
	);
	const scale = $derived(trackScale(rulerSpanWithRoom(ruler, beatsPerBar), PIXELS_PER_QUARTER));
	const parts = $derived(
		transcription.linked ? partLanes(melody.line, writtenBass, transcription.addedLanes) : []
	);
	const addable = $derived(
		ADDABLE_LANES.filter((lane) => !parts.some((part) => part.id === lane.id))
	);
	const playheadX = $derived(scale.toX(transcription.quartersNow));

	let adding = $state(false);
	/** @type {HTMLDivElement | undefined} */
	let scroller = $state();
	let lanesHeight = $state(0);

	$effect(() => {
		if (!transcription.player.playing || !scroller) return;
		const { scrollLeft, clientWidth } = scroller;
		const lanesWidth = clientWidth - HEADER_WIDTH;
		if (playheadX < scrollLeft || playheadX > scrollLeft + lanesWidth - 24)
			scroller.scrollLeft = playheadX - lanesWidth * FOLLOW_AT;
	});

	/** @param {MouseEvent & { currentTarget: HTMLElement }} event */
	function pickBar(event) {
		const box = event.currentTarget.getBoundingClientRect();
		const quarters = scale.toQuarters(event.clientX - box.left) + scale.start;
		const bar = ruler.findLast((each) => each.number > 0 && each.start <= quarters);
		if (!bar) return;
		transcription.openBarMenu(bar.number);
		transcription.seekToQuarters(bar.start);
	}

	/** @param {string} id */
	function addLane(id) {
		adding = false;
		transcription.addLane(id);
	}
</script>

<div class="scroller" bind:this={scroller}>
	<div
		class="tracks"
		bind:clientHeight={lanesHeight}
		style:--header-width="{HEADER_WIDTH}px"
		style:--lanes-width="{scale.width}px"
		style:--lanes-height="{lanesHeight}px"
		style:--quarter="{PIXELS_PER_QUARTER}px"
		style:--grid-offset="{scale.toX(0)}px"
	>
		<div class="corner"></div>
		<!-- svelte-ignore a11y_click_events_have_key_events (← → pick beats on a computer) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="ruler" onclick={pickBar} use:tooltip={TIPS.transcription.ruler}>
			<TrackRuler bars={ruler} {scale} />
		</div>

		<div class="header quiet"><span class="name">Beats</span></div>
		<BeatDots {transcription} {scale} />

		<div class="header recording"><span class="name">Recording</span></div>
		<RecordingLane {transcription} {scale} />

		<div class="header"><span class="name">Chords</span></div>
		<ChordLane {transcription} {scale} />

		{#each parts as lane (lane.id)}
			<button
				type="button"
				class="header"
				class:picked-lane={transcription.lane === lane.id}
				onclick={() => (transcription.lane = lane.id)}
				aria-pressed={transcription.lane === lane.id}
				use:tooltip={TIPS.transcription.partLane}
			>
				<span class="name">{lane.name}</span>
			</button>
			<!-- svelte-ignore a11y_click_events_have_key_events (the lane's name is the button) -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="part"
				class:picked-lane={transcription.lane === lane.id}
				onclick={() => (transcription.lane = lane.id)}
			>
				<BlockLane {lane} {scale} />
			</div>
		{/each}

		{#if transcription.linked && addable.length > 0}
			<div class="header add">
				<button
					type="button"
					class="ui-button px-2 py-1 text-xs"
					onclick={() => (adding = !adding)}
					aria-expanded={adding}
					use:tooltip={TIPS.transcription.addLane}>+ Lane</button
				>
			</div>
			<div class="adding">
				{#if adding}
					{#each addable as lane (lane.id)}
						<button
							type="button"
							class="ui-button px-3 py-1 text-xs"
							onclick={() => addLane(lane.id)}>{lane.name}</button
						>
					{/each}
				{/if}
			</div>
		{/if}

		<div class="playhead" style:left="calc(var(--header-width) + {playheadX}px)"></div>
		<GridMenu {transcription} {scale} />
	</div>
</div>

<style>
	.scroller {
		overflow-x: auto;
		border: 1px solid var(--color-line);
		border-radius: var(--corner-card);
		background: var(--color-surface-deep);
		overscroll-behavior-x: contain;
	}

	.tracks {
		--ruler-height: 2.5rem;
		--beats-row-height: 1.5rem;
		--lane-height: 2.75rem;
		--recording-lane-height: 5rem;
		position: relative;
		display: grid;
		grid-template-columns: var(--header-width) var(--lanes-width);
		width: max-content;
	}

	.corner,
	.header {
		position: sticky;
		left: 0;
		z-index: 2;
		background: var(--color-surface);
		border-right: 1px solid var(--color-line);
		border-bottom: 1px solid var(--color-line);
	}

	.header {
		display: flex;
		align-items: center;
		padding: 0 0.5rem;
		text-align: left;
	}

	.header.quiet .name {
		font-weight: 400;
		color: var(--color-ink-soft);
	}

	.header.picked-lane {
		background: var(--color-raised);
		box-shadow: inset 3px 0 0 var(--color-accent);
	}

	.header.add {
		border-bottom: none;
		padding: 0.35rem 0.5rem;
	}

	.adding {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0.5rem;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.ruler {
		position: relative;
		cursor: pointer;
	}

	.part {
		cursor: pointer;
	}

	.part.picked-lane {
		background: color-mix(in oklch, var(--color-accent) 8%, transparent);
	}

	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		z-index: 1;
		width: 2px;
		margin-left: -1px;
		background: var(--color-danger);
		pointer-events: none;
	}
</style>
