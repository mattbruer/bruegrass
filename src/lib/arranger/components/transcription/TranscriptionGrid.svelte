<script>
	/**
	 * The track grid, Logic's way: the cycle strip (drag across it to play a
	 * stretch over and over), a bar ruler that follows the recording,
	 * the Beats row under it (a dot per beat), the recording bent onto the
	 * bars (its menu: beats, tuning, the slowed-down sound), the chords by beat, and a lane for
	 * each part being written (+ Lane adds the bass). Lane names stay put
	 * while the lanes scroll sideways together; tap a part to edit it in the
	 * piano roll below. Click the ruler to play from that spot; click a bar's
	 * number for its menu (its beats, Loop). The playhead follows the
	 * recording and the lanes scroll with it. Beside the ruler: + Marker
	 * (at the playhead's bar) and Zoom (settings.transcribe.zoom, which widens
	 * the quarters and heightens the lanes here and in the piano roll).
	 */
	import { useArranger } from '../../state/context.js';
	import { trackScale } from '../../tracks/trackScale.js';
	import {
		markersShown,
		rulerFromBars,
		rulerSpanWithRoom
	} from '../../transcription/rulerFromBars.js';
	import { partLanes } from '../../transcription/partLanes.js';
	import { isLaneId } from '../../melody/roll/extraLane.js';
	import { timeSignature } from '../../transcription/timeSignatures.js';
	import TrackRuler from '../tracks/TrackRuler.svelte';
	import BlockLane from '../tracks/BlockLane.svelte';
	import BeatDots from './BeatDots.svelte';
	import GridMenu from './GridMenu.svelte';
	import CycleStrip from './CycleStrip.svelte';
	import MuteSoloButtons from '../mixer/MuteSoloButtons.svelte';
	import LaneVolume from './LaneVolume.svelte';
	import { mixer } from '../../mixer/mixer.svelte.js';
	import RecordingLane from './RecordingLane.svelte';
	import ChordLane from './ChordLane.svelte';
	import { keepMiddleInView } from '$lib/components/zoom/zoomLevels.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import ToggleSwitch from '$lib/settings/controls/ToggleSwitch.svelte';
	import RecordingMenu from './RecordingMenu.svelte';
	import Popover from '$lib/components/Popover.svelte';
	import ZoomControl from '$lib/components/zoom/ZoomControl.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }}
	 */
	let { transcription } = $props();

	const { melody, bass } = useArranger();

	/** The names column (px); the lanes scroll under it. */
	const HEADER_WIDTH = 186;
	/** Room for a chord on every beat. */
	const PIXELS_PER_QUARTER = 44;
	/** The playhead sits this far across the lanes while following. */
	const FOLLOW_AT = 1 / 3;

	/** The written bass line (null: none yet). */
	const writtenBass = $derived(bass.written);

	const beatsPerBar = $derived(timeSignature(transcription.time).beatsPerBar);
	const ruler = $derived(
		rulerFromBars(
			transcription.bars,
			beatsPerBar,
			transcription.grid?.bars.firstBeat ?? 0,
			markersShown(transcription.markers, transcription.pickups)
		)
	);
	const zoom = $derived(settings.transcribe.zoom);
	const pixelsPerQuarter = $derived(PIXELS_PER_QUARTER * zoom.across);
	const scale = $derived(trackScale(rulerSpanWithRoom(ruler, beatsPerBar), pixelsPerQuarter));
	const parts = $derived(
		transcription.linked ? partLanes(melody.line, writtenBass, transcription.laneNotes) : []
	);
	const playheadX = $derived(scale.toX(transcription.quartersNow));

	// What the recording plays along with
	$effect(() => {
		transcription.parts = parts;
	});

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
</script>

<div class="ui-sunk-frame rounded-[var(--corner-card)]">
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
					class:ui-button-on={transcription.cycle.on}
					disabled={!transcription.cycle.region}
					aria-pressed={transcription.cycle.on}
					onclick={() => transcription.cycle.turn(!transcription.cycle.on)}
					use:tooltip={TIPS.transcription.cycle}>Cycle</button
				>
				<span class="flex items-center gap-1 text-xs text-ink-soft">
					<ToggleSwitch
						bind:on={settings.transcribe.snapCycle}
						labelledBy="snap-cycle"
						tip={TIPS.transcription.snapCycle}
					/>
					<span id="snap-cycle">Snap</span>
				</span>
			</div>
			<CycleStrip {transcription} {ruler} {scale} />

			<div class="corner ruler-corner">
				<button
					type="button"
					class="ui-button px-1.5 py-0.5 text-xs"
					onclick={() => transcription.markHere()}
					use:tooltip={TIPS.transcription.addMarker}>+ Marker</button
				>
				<Popover class="px-1.5 py-0.5 text-xs" tip={TIPS.zoom.folded}>
					{#snippet button()}Zoom <span aria-hidden="true">▾</span>{/snippet}
					<ZoomControl zoom={settings.transcribe.zoom} />
				</Popover>
			</div>
			<!-- svelte-ignore a11y_click_events_have_key_events (← → pick beats on a computer) -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="ruler" onclick={clickRuler} use:tooltip={TIPS.transcription.ruler}>
				<TrackRuler bars={ruler} {scale} />
			</div>

			<div class="header beats-header" class:quiet={!transcription.fixingBeats}>
				<span class="name">Beats</span>
				{#if transcription.fixingBeats}
					<button
						type="button"
						class="ui-button px-1.5 text-xs"
						disabled={!transcription.canUndoBeats}
						onclick={() => transcription.undoBeats()}
						use:tooltip={TIPS.transcription.undoBeats}>Undo</button
					>
					<button
						type="button"
						class="ui-button px-1.5 text-xs"
						onclick={() => transcription.fixBeats(false)}
						use:tooltip={TIPS.transcription.doneFixingBeats}>Done</button
					>
				{/if}
			</div>
			<BeatDots {transcription} {scale} />

			<div class="header recording">
				<span class="name">Recording</span>
				<RecordingMenu {transcription} />
				<MuteSoloButtons settings={transcription.recordingLane} name="Recording" />
				<LaneVolume level={transcription.recordingLane} name="Recording" />
			</div>
			<RecordingLane {transcription} {scale} />

			<div class="header">
				<span class="name" use:tooltip={TIPS.transcription.bandLane}>Band</span>
				<MuteSoloButtons settings={transcription.band.lane} name="Band" />
				<LaneVolume level={transcription.band.lane} name="Band" />
			</div>
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
					{#if isLaneId(lane.id)}
						<button
							type="button"
							class="ui-button px-2 py-0.5 text-xs"
							onclick={() => transcription.useLaneAsBass(lane.id)}
							use:tooltip={TIPS.transcription.laneBass}>Bass</button
						>
						<button
							type="button"
							class="ui-button px-2 py-0.5 text-xs"
							aria-label="Remove {lane.name}"
							onclick={() => transcription.removeLane(lane.id)}
							use:tooltip={TIPS.transcription.laneRemove}>×</button
						>
					{:else if channel}
						<MuteSoloButtons settings={channel} name={lane.name} />
						<LaneVolume level={channel} name={lane.name} />
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

			{#if transcription.linked}
				<div class="header add">
					<button
						type="button"
						class="ui-button px-2 py-1 text-xs"
						onclick={() => transcription.addLane()}
						use:tooltip={TIPS.transcription.addLane}>+ Lane</button
					>
				</div>
			{/if}

			{#if transcription.cycle.on && transcription.cycle.region}
				<div
					class="cycle-shade"
					style:left="calc(var(--header-width) + {scale.toX(transcription.cycle.region.from)}px)"
					style:width="{scale.toX(transcription.cycle.region.to) -
						scale.toX(transcription.cycle.region.from)}px"
				></div>
			{/if}
			<div class="playhead" style:left="calc(var(--header-width) + {playheadX}px)"></div>
			<GridMenu {transcription} {scale} />
		</div>
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
		--cycle-row-height: 2.5rem;
		--ruler-height: 2.5rem;
		--beats-row-height: 1.5rem;
		--lane-height: calc(2.75rem * var(--zoom-down));
		--recording-lane-height: calc(5rem * var(--zoom-down));
		--header-padding: 0.75rem;
		position: relative;
		display: grid;
		grid-template-columns: var(--header-width) var(--lanes-width);
		width: max-content;
	}

	.ruler-corner {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0 var(--header-padding);
		z-index: 3;
	}

	/* The lane names stand up off the lanes, which scroll under them: a raised
	   tone, and a shadow cast across the lanes (a slice per cell, so the
	   slices meet without seams) */
	.corner,
	.header {
		position: sticky;
		left: 0;
		z-index: 2;
		background: var(--color-raised);
		border-right: 1px solid var(--color-line);
		border-bottom: 1px solid var(--color-line);
		box-shadow: inset -1px 0 0 var(--shadow-light-edge);
	}

	.corner::after,
	.header::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: -1px;
		left: 100%;
		width: 16px;
		background: linear-gradient(
			to right,
			rgb(0 0 0 / calc(0.18 * var(--drop))),
			rgb(0 0 0 / calc(0.06 * var(--drop))) 35%,
			transparent
		);
		pointer-events: none;
	}

	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.15rem 0.3rem;
		padding: 0.3rem var(--header-padding);
		text-align: left;
	}

	.pick {
		flex: 1;
		min-width: 0;
		text-align: left;
	}

	.beats-header {
		padding-block: 0;
		flex-wrap: nowrap;
		justify-content: flex-start;
	}
	.beats-header .name {
		flex: 1;
	}

	.header.quiet .name {
		font-weight: 400;
		color: var(--color-ink-soft);
	}

	.header.picked-lane {
		background: var(--color-raised);
		box-shadow:
			inset 3px 0 0 var(--color-accent),
			inset -1px 0 0 var(--shadow-light-edge);
	}

	.header.add {
		border-bottom: none;
		padding: 0.35rem var(--header-padding);
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
		flex-wrap: nowrap;
		padding: 0 var(--header-padding);
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
