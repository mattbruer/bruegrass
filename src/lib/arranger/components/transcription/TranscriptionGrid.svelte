<script>
	/**
	 * The track grid, Logic's way: the cycle strip (drag across it to play a
	 * stretch over and over), a bar ruler that follows the recording,
	 * the Beats row under it (a dot per beat), the recording bent onto the
	 * bars (its menu: beats, tuning, the slowed-down sound), the chords by beat, and a lane for
	 * each part being written (+ Lane adds another line of the tune; its menu
	 * names it, or makes it the bass). Lane names stay put while the lanes
	 * scroll sideways together; tap anywhere on a part's lane to edit it in
	 * the piano roll below. Click the ruler to play from that spot; click a bar's
	 * number for its menu (its beats, Loop). The playhead follows the
	 * recording and the lanes scroll with it. Beside the ruler: + Marker
	 * (at the playhead's bar). Zoom (settings.transcribe.zoom, in the control
	 * bar) widens the quarters and heightens the lanes; the piano roll below
	 * has its own.
	 */
	import { useArranger } from '../../state/context.js';
	import { trackScale } from '../../tracks/trackScale.js';
	import { gridSpan, markersShown, rulerFromBars } from '../../transcription/rulerFromBars.js';
	import { quartersAt } from '../../transcription/tempoMap.js';
	import { partLanes } from '../../transcription/partLanes.js';
	import { timeSignature } from '../../transcription/timeSignatures.js';
	import TrackRuler from '../tracks/TrackRuler.svelte';
	import BlockLane from '../tracks/BlockLane.svelte';
	import BeatDots from './BeatDots.svelte';
	import GridMenu from './GridMenu.svelte';
	import CycleStrip from './CycleStrip.svelte';
	import CycleSectionMenu from './CycleSectionMenu.svelte';
	import MuteSoloButtons from '../mixer/MuteSoloButtons.svelte';
	import LaneVolume from './LaneVolume.svelte';
	import InstrumentButton from '../mixer/instruments/InstrumentButton.svelte';
	import { isTuneChannel } from '../../melody/harmony/partChannels.js';
	import LaneColour from './LaneColour.svelte';
	import LaneMenu from './LaneMenu.svelte';
	import NameDialog from '$lib/components/NameDialog.svelte';
	import { LANE_NAMES } from '../../transcription/laneNames.js';
	import { voiceChannels } from '../../melody/harmony/partChannels.js';
	import { mixer } from '../../mixer/mixer.svelte.js';
	import ReferenceLane from './ReferenceLane.svelte';
	import ChordLane from './ChordLane.svelte';
	import { keepMiddleInView } from '$lib/components/zoom/zoomLevels.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import ToggleSwitch from '$lib/settings/controls/ToggleSwitch.svelte';
	import ReferenceMenu from './ReferenceMenu.svelte';
	import GuessChordsButton from './GuessChordsButton.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }}
	 */
	let { transcription } = $props();

	const { melody, bass, song } = useArranger();

	/** The names column (px); the lanes scroll under it. */
	const HEADER_WIDTH = 186;
	/** Room for a chord on every beat. */
	const PIXELS_PER_QUARTER = 44;
	/** The playhead sits this far across the lanes while following. */
	const FOLLOW_AT = 1 / 3;

	/** The written bass line (null: none yet). */
	const writtenBass = $derived(bass.written);

	const beatsPerBar = $derived(timeSignature(transcription.time).beatsPerBar);
	/** Bars only once the time is chosen: before, the recording shows just its beats. */
	const ruler = $derived(
		transcription.timeChosen
			? rulerFromBars(
					transcription.bars,
					markersShown(transcription.markers, transcription.pickups)
				)
			: []
	);
	/** The trimmed recording, in quarters from bar 1. */
	const clip = $derived.by(() => {
		const grid = transcription.grid;
		if (!grid) return { from: 0, to: 0 };
		return { from: quartersAt(grid, grid.trim.from), to: quartersAt(grid, grid.trim.to) };
	});
	const zoom = $derived(settings.transcribe.zoom);
	const pixelsPerQuarter = $derived(PIXELS_PER_QUARTER * zoom.across);
	const span = $derived(gridSpan(ruler, clip, beatsPerBar));
	const scale = $derived(trackScale(span, pixelsPerQuarter));
	const parts = $derived(
		transcription.linked
			? partLanes({
					melody: melody.line,
					voices: melody.tune ? voiceChannels(melody.tune) : [],
					bass: writtenBass,
					names: song.partNames
				})
			: []
	);
	const playheadX = $derived(scale.toX(transcription.quartersNow));

	// What the recording plays along with
	$effect(() => {
		transcription.parts = parts;
	});

	/** + Lane asks for the new lane's name first. */
	let namingLane = $state(false);

	/** @type {HTMLDivElement | undefined} */
	let scroller = $state();
	let lanesHeight = $state(0);
	let scrollLeft = $state(0);
	let scrollerWidth = $state(0);
	/** The stretch of the lanes on screen (px), for what draws only that. */
	const lanesView = $derived({ left: scrollLeft, width: scrollerWidth - HEADER_WIDTH });

	$effect(() => {
		if (!transcription.player.playing || !scroller) return;
		const { scrollLeft, clientWidth } = scroller;
		const lanesWidth = clientWidth - HEADER_WIDTH;
		if (playheadX < scrollLeft || playheadX > scrollLeft + lanesWidth - 24)
			scroller.scrollLeft = playheadX - lanesWidth * FOLLOW_AT;
	});

	// Zoom out can go as far as the whole song in view
	$effect(() => {
		const songWidth = (span.end - span.start) * PIXELS_PER_QUARTER;
		const lanesWidth = scrollerWidth - HEADER_WIDTH;
		if (songWidth > 0 && lanesWidth > 0)
			transcription.wholeSongZoom = Math.min(1, lanesWidth / songWidth);
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

	/**
	 * A click on a part's header picks the part, unless it was on one of its controls.
	 * @param {MouseEvent} event
	 * @param {string} id
	 */
	function pickFromHeader(event, id) {
		const target = /** @type {HTMLElement} */ (event.target);
		if (target.closest('.pick') || !target.closest('button, input, select, label, [role="slider"]'))
			transcription.lane = id;
	}
</script>

<div class="ui-sunk-frame rounded-[var(--corner-card)]">
	<div
		class="scroller"
		bind:this={scroller}
		bind:clientWidth={scrollerWidth}
		onscroll={() => (scrollLeft = scroller?.scrollLeft ?? 0)}
	>
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
			{#if transcription.timeChosen}
				<div class="header cycle-header ui-side-column">
					<button
						type="button"
						class="ui-button px-2 py-0.5 text-xs"
						class:ui-button-on={transcription.cycle.on}
						disabled={!transcription.cycle.region}
						aria-pressed={transcription.cycle.on}
						onclick={() => transcription.cycle.turn(!transcription.cycle.on)}
						use:tooltip={TIPS.transcription.cycle}>Cycle</button
					>
					<CycleSectionMenu {transcription} />
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
			{/if}

			<div class="corner ruler-corner ui-side-column">
				{#if transcription.timeChosen}
					<button
						type="button"
						class="ui-button px-1.5 py-0.5 text-xs font-semibold tabular-nums"
						onclick={() => transcription.openBarHere()}
						use:tooltip={TIPS.transcription.barHere}>Bar {transcription.barHere ?? ''} ▾</button
					>
				{/if}
			</div>
			<!-- svelte-ignore a11y_click_events_have_key_events (← → pick beats on a computer) -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="ruler" onclick={clickRuler} use:tooltip={TIPS.transcription.ruler}>
				<TrackRuler bars={ruler} {scale} />
			</div>

			<div class="header beats-header ui-side-column" class:quiet={!transcription.fixingBeats}>
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

			<div class="header reference ui-side-column">
				<span class="name">Reference</span>
				<ReferenceMenu {transcription} />
				<span class="lane-buttons">
					<MuteSoloButtons settings={transcription.referenceLane} name="Reference" />
					<LaneColour
						bind:color={settings.appearance.waveform}
						label="Waveform colour"
						tip={TIPS.transcription.waveformColour}
					/>
				</span>
				<LaneVolume level={transcription.referenceLane} name="Reference" />
			</div>
			<ReferenceLane {transcription} {scale} view={lanesView} />

			{#if transcription.timeChosen}
				<div class="header ui-side-column">
					<span class="name" use:tooltip={TIPS.transcription.bandLane}>Band</span>
					<GuessChordsButton {transcription} />
					<MuteSoloButtons settings={transcription.band.lane} name="Band" />
					<LaneVolume level={transcription.band.lane} name="Band" />
				</div>
				<ChordLane {transcription} {scale} />

				{#each parts as lane (lane.id)}
					{@const channel = mixer.channels.find((each) => each.id === lane.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events (the lane's name is the button) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="header part-header ui-side-column"
						class:picked-lane={transcription.lane === lane.id}
						onclick={(event) => pickFromHeader(event, lane.id)}
					>
						<button
							type="button"
							class="name pick"
							onclick={() => (transcription.lane = lane.id)}
							aria-pressed={transcription.lane === lane.id}
							use:tooltip={TIPS.transcription.partLane}>{lane.name}</button
						>
						{#if channel}
							<MuteSoloButtons settings={channel} name={lane.name} />
							<LaneVolume level={channel} name={lane.name} />
						{/if}
						<div class="instrument-row">
							{#if channel && isTuneChannel(lane.id)}<InstrumentButton {channel} />{/if}
							<LaneMenu {transcription} {lane} />
						</div>
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
			{/if}

			{#if transcription.linked && transcription.timeChosen}
				<div class="header add ui-side-column">
					<button
						type="button"
						class="ui-button px-2 py-1 text-xs"
						disabled={!transcription.canAddLane}
						onclick={() => (namingLane = true)}
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

<NameDialog
	bind:open={namingLane}
	title="New lane"
	suggestions={LANE_NAMES}
	hint="What will you write in it? The vocal, a mandolin break, a fiddle part…"
	saveLabel="Add lane"
	onsave={(name) => transcription.addLane(name)}
/>

<style>
	.scroller {
		overflow-x: auto;
		border: 1px solid var(--color-line);
		border-radius: var(--corner-card);
		background: var(--color-surface-deep);
		overscroll-behavior-x: contain;
	}

	.tracks {
		--cycle-row-height: calc(2.5rem + var(--sunk-rim));
		--ruler-height: 2.5rem;
		--beats-row-height: 1.5rem;
		--lane-height: calc(2.75rem * var(--zoom-down));
		--reference-lane-height: calc(5rem * var(--zoom-down));
		--header-padding: 0.75rem;
		/* Between rows, across the names and the lanes: a groove cut between raised cells
		   (the cell below gives it its lit lip); with 3D off, a plain line */
		--lane-divider: 2px solid
			color-mix(in oklab, var(--edge-dark) calc(var(--depth-on) * 100%), var(--color-line));
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

	.corner,
	.header {
		position: sticky;
		left: 0;
		z-index: 2;
		border-bottom: var(--lane-divider);
	}

	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 0.3rem;
		padding: 0.55rem var(--header-padding) 0.65rem;
		text-align: left;
		/* Raised: a lit top edge, a shaded bottom and a face curving away from the light */
		background: var(--face-3d), var(--color-raised);
		box-shadow:
			var(--shadow-bevel),
			inset -1px 0 0 var(--shadow-light-edge);
	}

	.lane-buttons {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.pick {
		flex: 1;
		min-width: 0;
		text-align: left;
	}

	.part-header {
		cursor: pointer;
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
		background: var(--face-3d), var(--color-raised);
		box-shadow:
			var(--shadow-bevel),
			inset 3px 0 0 var(--color-accent),
			inset -1px 0 0 var(--shadow-light-edge);
	}

	.instrument-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.375rem;
		width: 100%;
		margin: 0.25rem 0 0.35rem;
	}

	.instrument-row > :global(:first-child:not(:last-child)) {
		flex: 1;
		min-width: 0;
	}

	.instrument-row :global(.instrument) {
		padding: 0.45rem 0.6rem;
		font-size: 0.78rem;
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

	/* A lane fills its row, which is as tall as its header, so the dividers line up */
	.part {
		display: flex;
		flex-direction: column;
		cursor: pointer;
	}

	.part > :global(*) {
		flex: 1;
	}

	.part.picked-lane {
		background: color-mix(in oklch, var(--color-accent) 8%, transparent);
	}

	.cycle-header {
		height: var(--cycle-row-height);
		flex-wrap: nowrap;
		column-gap: 0.15rem;
		padding: var(--sunk-rim) var(--header-padding) 0;
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
