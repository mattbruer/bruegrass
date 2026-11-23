<script>
	/**
	 * The song as tracks, like a DAW, drawn like Transcribe's grid: the cycle
	 * strip (drag across it to play those bars round and round), a bar ruler
	 * at the song's steady tempo (click it to play from there), then the
	 * lanes: instrument lanes (the band, the tune's parts; + Inst adds a part
	 * to write) above audio lanes (what the mic recorded; + Audio adds one),
	 * until you move them: drag a lane by its grip, or Move up / down in its
	 * menu. Each lane's header has its menu (name, move, and more), mute,
	 * solo and volume; an audio lane's also has its record button. Names stay
	 * put while the lanes scroll sideways together under the playhead. A
	 * part's lane is picked by its name or a click on the lane: `onEdit`
	 * opens its editor.
	 */
	import { useArranger } from '../../state/context.js';
	import { bandLanes } from '../../tracks/lanes.js';
	import { orderedLanes, withLaneMoved, dropIndex } from '../../tracks/laneOrder.js';
	import { readChartOnBars } from '../../transcription/readChartOnBars.js';
	import { chartWithTypedBar, isHeld, slotsOf } from '../../transcription/barChords.js';
	import { onBarLines } from '../../transcription/cycle.js';
	import { bassPart } from '../../bass/songBass.js';
	import { voiceChannels } from '../../melody/harmony/partChannels.js';
	import { rulerBars, rulerSpan } from '../../tracks/ruler.js';
	import { PIXELS_PER_QUARTER, trackScale } from '../../tracks/trackScale.js';
	import { followPlayhead } from '../../tracks/followPlayhead.js';
	import { mixer } from '../../mixer/mixer.svelte.js';
	import { LANE_NAMES } from '../../transcription/laneNames.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import NameDialog from '$lib/components/NameDialog.svelte';
	import TrackRuler from './TrackRuler.svelte';
	import BlockLane from './BlockLane.svelte';
	import TakeClip from './TakeClip.svelte';
	import AudioLaneMenu from './AudioLaneMenu.svelte';
	import InstLaneMenu from './InstLaneMenu.svelte';
	import ChordLane from './ChordLane.svelte';
	import CycleStrip from './CycleStrip.svelte';
	import CycleSectionMenu from './CycleSectionMenu.svelte';
	import MuteSoloButtons from '../mixer/MuteSoloButtons.svelte';
	import LaneVolume from '../transcription/LaneVolume.svelte';

	/**
	 * @type {{
	 *   editing: string | null,
	 *   onEdit: (id: string | null) => void,
	 *   cycle: import('../../state/TracksCycleState.svelte.js').TracksCycleState
	 * }}
	 *   editing: the lane whose editor is open; onEdit(null) closes it
	 */
	let { editing, onEdit, cycle } = $props();

	const { arrangement, melody, recording, player, bass, song, parts } = useArranger();

	/** The names column (px); the lanes scroll under it. */
	const HEADER_WIDTH = 186;

	const bars = $derived(rulerBars(arrangement.sections));
	const band = $derived(
		bandLanes({
			bass: bassPart(arrangement.sections, {
				capo: arrangement.capoFret,
				transpose: arrangement.transpose,
				written: bass.written
			}).notes,
			melody: melody.line,
			voices: melody.tune ? voiceChannels(melody.tune) : [],
			names: song.partNames
		})
	);
	const audioLanes = $derived(recording.lanes);
	/** Every lane, top to bottom: yours, or instruments above audio. */
	const lanes = $derived(orderedLanes([...band, ...audioLanes], song.laneOrder));
	const zoom = $derived(settings.tracks.zoom);
	const scale = $derived(
		trackScale(spanWithClips(rulerSpan(bars), audioLanes), PIXELS_PER_QUARTER * zoom.across)
	);

	/** Which + button is asking for the new lane's name (null: neither). */
	let naming = $state(/** @type {'inst' | 'audio' | null} */ (null));

	// A part taken away while its editor is open: close the editor
	$effect(() => {
		if (editing && !lanes.some((lane) => lane.id === editing)) onEdit(null);
	});

	/** The chart's chords bar by bar, a slot per beat, for the chord lanes. */
	const chartOnBars = $derived(readChartOnBars(arrangement.text, arrangement.sections));
	const songBars = $derived(bars.filter((bar) => bar.number > 0));

	/** @param {{ number: number, beats: number }} bar */
	const slotsOfBar = (bar) => slotsOf(chartOnBars.chords[bar.number], bar.beats);
	/** @param {{ number: number }} bar */
	const isHeldBar = (bar) => isHeld(chartOnBars.chords[bar.number]);

	/**
	 * @param {{ number: number }} bar
	 * @param {(string | null)[]} typed
	 */
	function setChords(bar, typed) {
		const chart = chartWithTypedBar(arrangement.text, chartOnBars, bar.number, typed);
		if (chart !== null) arrangement.text = chart;
		return '';
	}

	/** @param {string} name */
	async function addInst(name) {
		const id = await parts.add(name);
		if (id) onEdit(id);
	}

	/** @type {HTMLDivElement | undefined} */
	let scroller = $state();
	/** @type {HTMLDivElement | undefined} */
	let grid = $state();

	/**
	 * The ruler's span, widened for a take that runs past the end.
	 * @param {{ start: number, end: number }} span
	 * @param {import('../../tracks/lanes.js').TakeLane[]} lanes
	 */
	function spanWithClips(span, lanes) {
		const clipEnds = lanes.map((lane) => (lane.clip ? lane.clip.start + lane.clip.length : 0));
		return { start: span.start, end: Math.max(span.end, ...clipEnds) };
	}

	/** @param {string} id */
	const channelOf = (id) => mixer.channels.find((each) => each.id === id);

	/** @param {MouseEvent & { currentTarget: HTMLElement }} event */
	function playFromHere(event) {
		const box = event.currentTarget.getBoundingClientRect();
		player.goTo(scale.toQuarters(event.clientX - box.left) + scale.start);
	}

	/** A lane being dragged by its grip: which, and where it would drop (an index, and its line's height). */
	let dragging = $state(/** @type {{ id: string, to: number, top: number } | null} */ (null));

	/** Each lane's row, top to bottom, on the screen and within the grid. */
	function laneRows() {
		const headers = /** @type {HTMLElement[]} */ ([
			...(grid?.querySelectorAll('[data-lane]') ?? [])
		]);
		return headers.map((header) => {
			const box = header.getBoundingClientRect();
			return { top: box.top, bottom: box.bottom, offset: header.offsetTop, height: box.height };
		});
	}

	/** @param {number} y */
	function dropAt(y) {
		const rows = laneRows();
		const to = dropIndex(y, rows);
		const row = rows[Math.min(to, rows.length - 1)];
		const top = to < rows.length ? row.offset : row.offset + row.height;
		return { to, top };
	}

	/**
	 * @param {PointerEvent & { currentTarget: HTMLElement }} event
	 * @param {string} id
	 */
	function grab(event, id) {
		if (event.button !== 0) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		dragging = { id, ...dropAt(event.clientY) };
	}

	/** @param {PointerEvent} event */
	function drag(event) {
		if (dragging) dragging = { id: dragging.id, ...dropAt(event.clientY) };
	}

	function drop() {
		if (dragging) parts.setOrder(withLaneMoved(lanes, dragging.id, dragging.to));
		dragging = null;
	}
</script>

<div class="ui-sunk-frame rounded-[var(--corner-card)]">
	<div class="scroller" bind:this={scroller}>
		<div
			class="tracks"
			bind:this={grid}
			style:--header-width="{HEADER_WIDTH}px"
			style:--lanes-width="{scale.width}px"
			style:--zoom-down={zoom.down}
		>
			<div class="header cycle-header ui-side-column">
				<button
					type="button"
					class="ui-button px-2 py-0.5 text-xs"
					class:ui-button-on={cycle.on}
					disabled={!cycle.region}
					aria-pressed={cycle.on}
					onclick={() => cycle.turn(!cycle.on)}
					use:tooltip={TIPS.tracks.cycle}>Cycle</button
				>
				<CycleSectionMenu {cycle} />
			</div>
			<CycleStrip {cycle} ruler={bars} {scale} fit={onBarLines} />

			<div class="corner ui-side-column"></div>
			<!-- svelte-ignore a11y_click_events_have_key_events (Home and the clock get there by keyboard) -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="ruler" onclick={playFromHere} use:tooltip={TIPS.tracks.ruler}>
				<TrackRuler {bars} {scale} />
			</div>

			{#each lanes as lane (lane.id)}
				{@const channel = channelOf(lane.id)}
				{@const picked = editing === lane.id}
				{@const armed = lane.kind === 'take' && recording.armedTrack === lane.id}
				{@const lifted = dragging?.id === lane.id}
				<div
					class="header ui-side-column"
					class:picked
					class:armed
					class:lifted
					data-lane={lane.id}
				>
					<button
						type="button"
						class="grip"
						aria-label="Drag {lane.name} up or down"
						onpointerdown={(event) => grab(event, lane.id)}
						onpointermove={drag}
						onpointerup={drop}
						onpointercancel={() => (dragging = null)}
						use:tooltip={TIPS.tracks.grip}
					>
						<span aria-hidden="true">⠿</span>
					</button>
					{#if lane.kind === 'take'}
						<button
							type="button"
							class="arm"
							class:on={armed}
							aria-pressed={armed}
							aria-label="Record on {lane.name}"
							disabled={recording.isRecording}
							onclick={() => (recording.trackId = lane.id)}
							use:tooltip={TIPS.tracks.arm}
						></button>
						<span class="name">{lane.name}</span>
						<AudioLaneMenu {lane} {lanes} />
					{:else if lane.kind === 'notes'}
						<button
							type="button"
							class="name pick"
							aria-pressed={picked}
							onclick={() => onEdit(lane.id)}
							use:tooltip={TIPS.tracks.editPart}>{lane.name}</button
						>
						<InstLaneMenu {lane} {lanes} />
					{:else}
						<span class="name">{lane.name}</span>
						<InstLaneMenu {lane} {lanes} />
					{/if}
					<span class="row-break"></span>
					{#if channel}
						<MuteSoloButtons settings={channel} name={lane.name} />
						<LaneVolume level={channel} name={lane.name} />
					{/if}
				</div>
				{#if lane.kind === 'take'}
					<div class="lane audio-lane" class:armed class:lifted>
						{#if lane.clip}
							<TakeClip clip={lane.clip} takes={lane.takes} {scale} />
						{:else}
							<span class="empty">Press Record to record on this lane</span>
						{/if}
					</div>
				{:else if lane.kind === 'chords'}
					<div class="lane" class:lifted>
						<ChordLane
							bars={songBars}
							slotsOf={slotsOfBar}
							isHeld={isHeldBar}
							{setChords}
							{scale}
						/>
					</div>
				{:else}
					<div class="lane" class:lifted>
						<!-- svelte-ignore a11y_click_events_have_key_events (the lane's name is the button) -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="part" class:picked onclick={() => onEdit(lane.id)}>
							<BlockLane {lane} {scale} />
						</div>
					</div>
				{/if}
			{/each}

			<div class="header add ui-side-column">
				<button
					type="button"
					class="ui-button px-2 py-1 text-xs"
					disabled={!parts.canAdd}
					onclick={() => (naming = 'inst')}
					use:tooltip={TIPS.tracks.addInst}>+ Inst</button
				>
				<button
					type="button"
					class="ui-button px-2 py-1 text-xs"
					disabled={!recording.canAddLane || recording.isRecording}
					onclick={() => (naming = 'audio')}
					use:tooltip={TIPS.tracks.addLane}>+ Audio</button
				>
			</div>

			{#if cycle.on && cycle.region}
				<div
					class="cycle-shade"
					style:left="calc(var(--header-width) + {scale.toX(cycle.region.from)}px)"
					style:width="{scale.toX(cycle.region.to) - scale.toX(cycle.region.from)}px"
				></div>
			{/if}

			{#if dragging}
				<div class="drop-line" style:top="{dragging.top}px"></div>
			{/if}

			<div
				class="playhead"
				hidden
				use:followPlayhead={{
					timeNow: player.melodyTimeNow,
					toX: scale.toX,
					scroller,
					headerWidth: HEADER_WIDTH
				}}
			></div>
		</div>
	</div>
</div>

<NameDialog
	bind:open={() => naming === 'inst', (open) => !open && (naming = null)}
	title="New instrument lane"
	suggestions={LANE_NAMES}
	hint="A part to write with the piano roll: a fiddle line, a mandolin break, a vocal…"
	saveLabel="Add lane"
	onsave={addInst}
/>

<NameDialog
	bind:open={() => naming === 'audio', (open) => !open && (naming = null)}
	title="New audio lane"
	suggestions={LANE_NAMES}
	hint="What will you record on it? The vocal, a mandolin break, a fiddle part…"
	saveLabel="Add lane"
	onsave={(name) => recording.addLane(name)}
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
		--cycle-row-height: 1.9rem;
		--ruler-height: 2.5rem;
		--lane-height: calc(2.75rem * var(--zoom-down));
		--take-lane-height: calc(4.5rem * var(--zoom-down));
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
		/* Raised: a lit top edge, a shaded bottom and a face curving away from the light */
		background: var(--face-3d), var(--color-raised);
		box-shadow:
			var(--shadow-bevel),
			inset -1px 0 0 var(--shadow-light-edge);
	}

	.header.armed {
		box-shadow:
			var(--shadow-bevel),
			inset 3px 0 0 var(--color-danger),
			inset -1px 0 0 var(--shadow-light-edge);
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.8rem;
		font-weight: 700;
	}

	/* A part's name is the button that opens its editor */
	.pick {
		text-align: left;
		cursor: pointer;
		border-radius: var(--corner-small);
		padding: 0.1rem 0.25rem;
		margin: -0.1rem -0.25rem;
	}

	@media (hover: hover) {
		.pick:hover {
			color: var(--color-accent);
		}
	}

	.pick:focus-visible {
		outline: 2px solid var(--color-accent);
	}

	.header.picked {
		box-shadow:
			var(--shadow-bevel),
			inset 3px 0 0 var(--color-accent),
			inset -1px 0 0 var(--shadow-light-edge);
	}

	.header.picked .name {
		color: var(--color-accent);
	}

	.part {
		display: flex;
		flex-direction: column;
		cursor: pointer;
	}

	.part > :global(*) {
		flex: 1;
	}

	.part.picked {
		background: color-mix(in oklch, var(--color-accent) 8%, transparent);
	}

	/* Record-enable, Logic's: a round button, its dot red while it's the lane Record records on */
	.arm {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
		border: 1px solid var(--color-line);
		background: var(--face-3d), var(--color-raised);
		box-shadow: var(--shadow-bevel);
		cursor: pointer;
	}

	.arm::after {
		content: '';
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 50%;
		background: var(--color-ink-soft);
	}

	.arm.on {
		border-color: var(--color-danger);
	}

	.arm.on::after {
		background: var(--color-danger);
	}

	.arm:disabled {
		cursor: default;
		opacity: 0.6;
	}

	/* An audio lane's name gets the whole first row; mute and solo go under it */
	.row-break {
		flex-basis: 100%;
		height: 0;
	}

	.header.add {
		justify-content: flex-start;
		border-bottom: none;
		padding: 0.35rem var(--header-padding);
	}

	.cycle-header {
		height: var(--cycle-row-height);
		flex-wrap: nowrap;
		justify-content: flex-start;
		column-gap: 0.15rem;
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

	/* Drag a lane by this: it takes the touch, so a phone doesn't scroll instead */
	.grip {
		flex-shrink: 0;
		/* A finger-sized target around a small mark */
		width: 1.6rem;
		padding: 0.5rem 0;
		margin: -0.5rem -0.25rem -0.5rem -0.7rem;
		color: var(--color-ink);
		font-size: 1rem;
		line-height: 1;
		cursor: grab;
		touch-action: none;
	}

	.grip:active {
		cursor: grabbing;
	}

	.lifted {
		opacity: 0.45;
	}

	.drop-line {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 3;
		height: 3px;
		margin-top: -1.5px;
		background: var(--color-accent);
		pointer-events: none;
	}

	.ruler {
		position: relative;
		cursor: pointer;
	}

	/* A lane fills its row, which is as tall as its header, so the dividers line up */
	.lane {
		display: flex;
		flex-direction: column;
	}

	.lane > :global(*) {
		flex: 1;
	}

	.audio-lane {
		position: relative;
		min-height: var(--take-lane-height);
		border-bottom: var(--lane-divider);
	}

	.audio-lane.armed {
		background: color-mix(in oklch, var(--color-danger) 6%, transparent);
	}

	.empty {
		position: sticky;
		left: calc(var(--header-width) + 0.75rem);
		align-self: flex-start;
		flex: 0 !important;
		margin: auto 0.75rem;
		font-size: 0.8rem;
		color: var(--color-ink-soft);
		white-space: nowrap;
	}

	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--header-width);
		z-index: 1;
		width: 2px;
		margin-left: -1px;
		background: var(--color-danger);
		pointer-events: none;
	}

	.playhead[hidden] {
		display: none;
	}
</style>
