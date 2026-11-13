<script>
	/**
	 * The track grid, Logic's way: the cycle strip (drag across it to play a
	 * stretch over and over), a bar ruler that follows the recording,
	 * the Beats row under it (drag a dot onto its hit; tap one for its menu),
	 * the recording bent onto the bars, the chords by beat, and a lane for
	 * each part being written (+ Lane adds the bass). Lane names stay put
	 * while the lanes scroll sideways together; tap a part to edit it in the
	 * piano roll below. Click the ruler to play from that spot; click a bar's
	 * number for its menu (its beats, Loop). The playhead follows the
	 * recording and the lanes scroll with it. Zoom (settings.transcribe.zoom)
	 * widens the quarters and heightens the lanes.
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
	import CycleStrip from './CycleStrip.svelte';
	import MuteSoloButtons from '../mixer/MuteSoloButtons.svelte';
	import { mixer } from '../../playback/mixer.svelte.js';
	import RecordingLane from './RecordingLane.svelte';
	import ChordLane from './ChordLane.svelte';
	import { keepMiddleInView } from '$lib/components/zoom/zoomLevels.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const { melody, bass } = useArranger();

	/** The names column (px); the lanes scroll under it. */
	const HEADER_WIDTH = 150;
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
		rulerFromBars(
			transcription.bars,
			beatsPerBar,
			transcription.grid?.bars.firstBeat ?? 0,
			transcription.markers
		)
	);
	const zoom = $derived(settings.transcribe.zoom);
	const pixelsPerQuarter = $derived(PIXELS_PER_QUARTER * zoom.across);
	const scale = $derived(trackScale(rulerSpanWithRoom(ruler, beatsPerBar), pixelsPerQuarter));
	const parts = $derived(
		transcription.linked ? partLanes(melody.line, writtenBass, transcription.addedLanes) : []
	);
	const addable = $derived(
		ADDABLE_LANES.filter((lane) => !parts.some((part) => part.id === lane.id))
	);
	const playheadX = $derived(scale.toX(transcription.quartersNow));

	// What the recording plays along with
	$effect(() => {
		transcription.parts = parts;
	});

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

	// Zooming keeps the middle of the view where it was
	let shownPixelsPerQuarter = pixelsPerQuarter;
	$effect(() => {
		const change = pixelsPerQuarter / shownPixelsPerQuarter;
		shownPixelsPerQuarter = pixelsPerQuarter;
		if (scroller && change !== 1)
			keepMiddleInView(scroller, { across: change, down: 1 }, { left: HEADER_WIDTH });
	});

	/**
	 * A click on a bar's number opens its menu; anywhere else plays from that spot.
	 * @param {MouseEvent & { currentTarget: HTMLElement }} event
	 */
	function clickRuler(event) {
		const number = /** @type {HTMLElement} */ (event.target).closest('[data-bar]');
		const bar = Number(/** @type {HTMLElement | null} */ (number)?.dataset.bar);
		if (bar > 0) return transcription.openBarMenu(bar);
		const box = event.currentTarget.getBoundingClientRect();
		transcription.seekToQuarters(scale.toQuarters(event.clientX - box.left) + scale.start);
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
		style:--quarter="{pixelsPerQuarter}px"
		style:--zoom-down={zoom.down}
		style:--grid-offset="{scale.toX(0)}px"
	>
		<div class="header cycle-header">
			<button
				type="button"
				class="ui-button px-2 py-0.5 text-xs"
				class:ui-button-on={transcription.cycling}
				disabled={!transcription.cycle}
				aria-pressed={transcription.cycling}
				onclick={() => transcription.setCycling(!transcription.cycling)}
				use:tooltip={TIPS.transcription.cycle}>Cycle</button
			>
		</div>
		<CycleStrip {transcription} {ruler} {scale} />

		<div class="corner"></div>
		<!-- svelte-ignore a11y_click_events_have_key_events (← → pick beats on a computer) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="ruler" onclick={clickRuler} use:tooltip={TIPS.transcription.ruler}>
			<TrackRuler bars={ruler} {scale} />
		</div>

		<div class="header quiet"><span class="name">Beats</span></div>
		<BeatDots {transcription} {scale} />

		<div class="header recording">
			<span class="name">Recording</span>
			<MuteSoloButtons settings={transcription.recordingLane} name="Recording" />
		</div>
		<RecordingLane {transcription} {scale} />

		<div class="header"><span class="name">Chords</span></div>
		<ChordLane {transcription} {scale} />

		{#each parts as lane (lane.id)}
			{@const channel = mixer.channels.find((each) => each.id === lane.id)}
			<div class="header" class:picked-lane={transcription.lane === lane.id}>
				<button
					type="button"
					class="name pick"
					onclick={() => (transcription.lane = lane.id)}
					aria-pressed={transcription.lane === lane.id}
					use:tooltip={TIPS.transcription.partLane}>{lane.name}</button
				>
				{#if channel}
					<MuteSoloButtons settings={channel} name={lane.name} />
				{/if}
			</div>
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

		{#if transcription.cycling && transcription.cycle}
			<div
				class="cycle-shade"
				style:left="calc(var(--header-width) + {scale.toX(transcription.cycle.from)}px)"
				style:width="{scale.toX(transcription.cycle.to) - scale.toX(transcription.cycle.from)}px"
			></div>
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
		--cycle-row-height: 1.25rem;
		--ruler-height: 2.5rem;
		--beats-row-height: 1.5rem;
		--lane-height: calc(2.75rem * var(--zoom-down));
		--recording-lane-height: calc(5rem * var(--zoom-down));
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
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.15rem 0.3rem;
		padding: 0 0.4rem;
		text-align: left;
	}

	.pick {
		flex: 1;
		min-width: 0;
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

	.cycle-header {
		height: var(--cycle-row-height);
		padding: 0 0.35rem;
	}

	.cycle-shade {
		position: absolute;
		top: var(--cycle-row-height);
		bottom: 0;
		z-index: 1;
		background: color-mix(in oklch, var(--color-accent) 10%, transparent);
		border-inline: 1px solid color-mix(in oklch, var(--color-accent) 50%, transparent);
		pointer-events: none;
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
