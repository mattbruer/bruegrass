<script>
	/**
	 * The piano roll: time across, pitch up, the rows a piano's keys (black
	 * keys dark) whatever the song's key; the key's notes are marked on their
	 * names. The chart's chords run along the bottom.
	 *
	 * Mouse: drag on an empty spot to draw a note as long as you drag; drag a
	 * note to move it, or its right end to make it longer or shorter;
	 * double-click to delete. Touch: a swipe always scrolls, over notes too;
	 * only the picked note moves. Tap an empty spot to add a note, tap a note
	 * to pick it, then drag it, or drag the handle on its right end to change
	 * its length; the note bar under the roll steps it by the grid
	 * (NoteEditBar); double-tap deletes. Decided per press, so an iPad with
	 * a trackpad gets the mouse's way. Keys, once a note is picked: arrows
	 * move it (Shift: an octave), Delete removes it.
	 *
	 * The tune's other voices show faintly behind the one being edited. A
	 * picked harmony note shows dots on the chord's other notes: tap one to
	 * move the note there.
	 *
	 * While the band plays, a line shows where it is and the roll scrolls
	 * with it (it lets go for a moment when you scroll it yourself).
	 *
	 * `lane`: a lane of the page's own under the ruler (the tempo lane),
	 * scrolling across with the roll; it's given the roll's width and scale.
	 */
	import { onMount, tick as rendered, untrack } from 'svelte';
	import { onEveryFrame } from '../../../audio/analysis/frameLoop.js';
	import { addNote, changeNote, deleteNote, noteAt } from '../../melody/roll/editNotes.js';
	import { snapDown, TICKS_PER_QUARTER } from '../../melody/roll/ticks.js';
	import {
		drawnLength,
		grabbedPart,
		resizeEdge,
		keyEdit,
		stepEdit,
		movedNote,
		resizedNote,
		withinRange
	} from '../../melody/roll/noteGestures.js';
	import { followScroll, middlePitch } from '../../melody/roll/followView.js';
	import { PIANO_ROWS, pitchRows } from '../../melody/roll/pitchRows.js';
	import { isOutside } from '../../instruments/instrumentRanges.js';
	import { barLabel, isShortBar, tickWidthFor } from '../../melody/roll/rollLayout.js';
	import { keepMiddleInView } from '$lib/components/zoom/zoomLevels.js';
	import NoteEditBar from './NoteEditBar.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/* Size */
	const LABEL_WIDTH = 44;
	const RULER_HEIGHT = 22;
	const CHORD_HEIGHT = 28;
	const LANE_HEIGHT = 56;
	const ROW_HEIGHT = { mouse: 22, touch: 32 };
	/* Gestures */
	const MOVE_THRESHOLD = 6; // px before a press counts as a drag
	const DOUBLE_TAP_MS = 350;
	/* Following the band */
	const FOLLOW_PAUSE_MS = 3000; // after you scroll the roll yourself

	/**
	 * @type {{
	 *   score: import('../../melody/roll/readScore.js').Score,
	 *   notes: import('../../melody/roll/editNotes.js').DrawnNote[],
	 *   chordsUnder: import('../../melody/roll/chordsUnderBars.js').ChordUnder[],
	 *   chordName: (name: string, place?: import('../../chart/chartAnalysis.js').ChordPlace) => string,
	 *   spelling: import('../../theory/musicInKey.js').Key,
	 *   tonic: number,
	 *   usualRange: import('../../melody/roll/pitchRows.js').RowRange,
	 *   playable?: import('../../melody/roll/pitchRows.js').RowRange | null,
	 *   end: number,
	 *   gridStep: number,
	 *   drawLength: number,
	 *   readOnly: boolean,
	 *   selected: number,
	 *   colour: number,
	 *   others: { colour: number, notes: import('../../melody/roll/editNotes.js').DrawnNote[], given?: boolean }[],
	 *   options: number[],
	 *   playing: boolean,
	 *   playhead: () => number | null,
	 *   onCommit: (notes: import('../../melody/roll/editNotes.js').DrawnNote[], length?: number) => void,
	 *   onSound: (midi: number) => void,
	 *   onSeek?: (ticks: number) => void,
	 *   zoom?: { across: number, down: number },
	 *   lane?: { name: string, draw: import('svelte').Snippet<[{ width: number, height: number, tickWidth: number }]> }
	 * }}
	 */
	let {
		score,
		notes,
		chordsUnder,
		chordName,
		spelling,
		tonic,
		usualRange,
		playable = null,
		end,
		gridStep,
		drawLength,
		readOnly,
		selected = $bindable(),
		colour,
		others,
		options,
		playing,
		playhead,
		onCommit,
		onSound,
		onSeek,
		zoom = { across: 1, down: 1 },
		lane
	} = $props();
	/** Everything that stays at the top while the rows scroll: the ruler, and the lane if any. */
	let headHeight = $derived(RULER_HEIGHT + (lane ? LANE_HEIGHT : 0));

	let touchScreen = $state(false);
	/** @type {HTMLElement | undefined} */
	let scroller = $state();
	/** @type {HTMLElement | undefined} */
	let surface = $state();
	/** The notes while a drag is under way (null when none is). */
	let preview = $state.raw(/** @type {typeof notes | null} */ (null));

	let rowHeight = $derived((touchScreen ? ROW_HEIGHT.touch : ROW_HEIGHT.mouse) * zoom.down);
	let tickWidth = $derived(tickWidthFor(gridStep, zoom.across));

	// Zooming keeps the middle of the view where it was
	let shownSize = { tickWidth, rowHeight };
	$effect(() => {
		const change = {
			across: tickWidth / shownSize.tickWidth,
			down: rowHeight / shownSize.rowHeight
		};
		shownSize = { tickWidth, rowHeight };
		if (!scroller || (change.across === 1 && change.down === 1)) return;
		keepMiddleInView(scroller, change, { left: LABEL_WIDTH, top: headHeight });
		pauseFollowing();
	});

	/** @param {MouseEvent & { currentTarget: HTMLElement }} event a click on the ruler: play from there */
	function seekFromRuler(event) {
		const box = event.currentTarget.getBoundingClientRect();
		onSeek?.((event.clientX - box.left) / tickWidth);
	}
	const range = PIANO_ROWS;
	let rows = $derived(pitchRows(spelling, range));
	let shown = $derived(preview ?? notes);
	let width = $derived(end * tickWidth);
	let height = $derived(rows.length * rowHeight);
	let firstIsPickup = $derived(isShortBar(score.bars[0]));
	let grid = $derived({ tickWidth, rowHeight, gridStep, end, range });

	onMount(() => {
		touchScreen = matchMedia('(pointer: coarse)').matches;
		requestAnimationFrame(scrollToTune);
	});

	// Another voice (the bass sits lower): show its notes
	$effect(() => {
		void usualRange;
		untrack(() => rendered().then(scrollToTune));
	});

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

	/** Move the playhead to where the band is, and keep it (and the note sounding) in view. */
	function followBand() {
		const tick = playhead();
		if (!playheadLine || !scroller) return;
		if (tick === null || !Number.isFinite(tick)) {
			playheadLine.style.display = 'none';
			return;
		}
		const x = tick * tickWidth;
		playheadLine.style.display = 'block';
		playheadLine.style.transform = `translateX(${x}px)`;
		if (gesture || performance.now() < followPausedUntil) return;

		const view = {
			width: scroller.clientWidth - LABEL_WIDTH,
			height: scroller.clientHeight - headHeight - CHORD_HEIGHT,
			top: scroller.scrollTop
		};
		const { left, top } = followScroll(tick, notes, view, {
			tickWidth,
			rowHeight,
			highest: range.highest
		});
		scroller.scrollLeft = left;
		if (top !== null) scroller.scrollTop = top;
	}

	function pauseFollowing() {
		followPausedUntil = performance.now() + FOLLOW_PAUSE_MS;
	}

	/** Show the tune's middle (or the home note near middle C) when the roll opens. */
	function scrollToTune() {
		if (!scroller) return;
		const middle = middlePitch(notes, tonic, usualRange);
		const y = (range.highest - middle) * rowHeight + headHeight - scroller.clientHeight / 2;
		scroller.scrollTop = Math.max(0, y);
	}

	/** @param {PointerEvent} event */
	function locate(event) {
		const rect = /** @type {HTMLElement} */ (surface).getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		const midi = withinRange(range.highest - Math.floor(y / rowHeight), range);
		return { x, y, tick: x / tickWidth, midi };
	}

	/**
	 * @typedef {{
	 *   kind: 'draw' | 'move' | 'resize' | 'tap' | 'pick', x: number, y: number, moved: boolean,
	 *   index: number, start: number, midi: number, length: number,
	 *   now: { start: number, midi: number, length: number }
	 * }} Gesture
	 *   start/midi/length: where the note was when pressed; now: where it is
	 */
	/** @type {Gesture | null} */
	let gesture = null;
	/** A note's length is being dragged: the ↔ cursor stays on until it's let go. */
	let resizing = $state(false);
	let lastTap = { index: -1, time: 0 };

	/** @param {PointerEvent} event */
	function press(event) {
		if (readOnly || event.button !== 0) return;
		const option = /** @type {HTMLElement} */ (event.target).dataset?.option;
		if (option !== undefined && selected >= 0) {
			event.preventDefault();
			onSound(Number(option));
			nudge({ midi: Number(option) });
			return;
		}
		const at = locate(event);
		const touch = event.pointerType === 'touch';
		scroller?.focus({ preventScroll: true });
		const onHandle = /** @type {HTMLElement} */ (event.target).dataset?.handle !== undefined;
		if (onHandle && notes[selected]) {
			grab(event, selected, 'resize', at);
			return;
		}
		const index = noteAt(notes, at.tick, at.midi);

		if (index >= 0) {
			if (lastTap.index === index && performance.now() - lastTap.time < DOUBLE_TAP_MS) {
				lastTap = { index: -1, time: 0 };
				selected = -1;
				onCommit(deleteNote(notes, index));
				return;
			}
			if (touch && index !== selected) {
				// Not held: a swipe from here still scrolls; a tap picks it
				gesture = {
					kind: 'pick',
					x: at.x,
					y: at.y,
					moved: false,
					index,
					...notes[index],
					now: notes[index]
				};
				return;
			}
			grab(event, index, touch ? 'move' : grabbedPart(notes[index], at.x, tickWidth), at);
			return;
		}

		selected = -1;
		const start = snapDown(at.tick, gridStep);
		if (touch) {
			// Leave the swipe to the browser (it scrolls); a tap adds a note
			const note = { start, midi: at.midi, length: drawLength };
			gesture = { kind: 'tap', x: at.x, y: at.y, moved: false, index: -1, ...note, now: note };
			return;
		}
		const note = { start, midi: at.midi, length: gridStep };
		gesture = { kind: 'draw', x: at.x, y: at.y, moved: false, index: -1, ...note, now: note };
		preview = addNote(notes, { midi: at.midi, start, length: gridStep }, end);
		onSound(at.midi);
		surface?.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	/**
	 * Hold a note to move it or change its length.
	 * @param {PointerEvent} event
	 * @param {number} index
	 * @param {'move' | 'resize'} kind
	 * @param {{ x: number, y: number }} at
	 */
	function grab(event, index, kind, at) {
		const note = notes[index];
		selected = index;
		onSound(note.midi);
		gesture = { kind, x: at.x, y: at.y, moved: false, index, ...note, now: { ...note } };
		resizing = kind === 'resize';
		surface?.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	/** @param {PointerEvent} event */
	function drag(event) {
		if (!gesture) return;
		const at = locate(event);
		const dx = at.x - gesture.x;
		const dy = at.y - gesture.y;
		if (Math.hypot(dx, dy) > MOVE_THRESHOLD) gesture.moved = true;
		if (!gesture.moved || gesture.kind === 'tap' || gesture.kind === 'pick') return;

		const grabbed = { start: gesture.start, midi: gesture.midi, length: gesture.length };
		if (gesture.kind === 'draw') {
			const length = drawnLength(gesture.start, at.tick, gridStep);
			preview = addNote(notes, { ...grabbed, length }, end);
			return;
		}
		const now =
			gesture.kind === 'move' ? movedNote(grabbed, dx, dy, grid) : resizedNote(grabbed, dx, grid);
		if (now.midi !== gesture.now.midi) onSound(now.midi);
		gesture.now = now;
		preview = changeNote(notes, gesture.index, now, end);
	}

	/**
	 * The edited note in a list of notes.
	 * @param {typeof notes} list
	 * @param {{ start: number, midi: number }} place
	 */
	function noteIn(list, place) {
		return list.find((note) => note.start === place.start && note.midi === place.midi);
	}

	function release() {
		const done = gesture;
		gesture = null;
		resizing = false;
		const edited = preview;
		preview = null;
		if (!done) return;
		// Only two taps make a double-tap: a swipe or drag before a tap mustn't delete
		const tapped = !done.moved && (done.kind === 'pick' || done.kind === 'move');
		lastTap = tapped ? { index: done.index, time: performance.now() } : { index: -1, time: 0 };

		if (done.kind === 'pick') {
			if (done.moved) return;
			selected = done.index;
			onSound(done.midi);
		} else if (done.kind === 'tap') {
			if (done.moved) return;
			const added = addNote(notes, { midi: done.midi, start: done.start, length: drawLength }, end);
			onSound(done.midi);
			finish(added, noteIn(added, done));
		} else if (done.kind === 'draw' && edited) {
			const drawn = noteIn(edited, done);
			finish(edited, drawn, drawn?.length);
		} else if (done.moved && edited) {
			const changed = noteIn(edited, done.now);
			finish(edited, changed, done.kind === 'resize' ? changed?.length : undefined);
		}
	}

	/**
	 * @param {typeof notes} list
	 * @param {(typeof notes)[number] | undefined} picked the note to leave selected
	 * @param {number} [length] the length to draw new notes at from now on
	 */
	function finish(list, picked, length) {
		selected = picked ? list.indexOf(picked) : -1;
		onCommit(list, length);
	}

	function cancel() {
		gesture = null;
		lastTap = { index: -1, time: 0 };
		resizing = false;
		preview = null;
	}

	/** @param {KeyboardEvent} event */
	function keys(event) {
		if (readOnly || selected < 0 || !notes[selected]) return;
		const edit = keyEdit(event.key, event.shiftKey, notes[selected], grid);
		if (!edit) return;
		event.preventDefault();
		applyEdit(edit);
	}

	/** @param {import('../../melody/roll/noteGestures.js').NoteStep} step a button on the note bar */
	function stepPicked(step) {
		if (readOnly || !notes[selected]) return;
		applyEdit(stepEdit(step, notes[selected], grid));
	}

	/** @param {import('../../melody/roll/noteGestures.js').NoteEdit} edit */
	function applyEdit(edit) {
		if (edit === 'delete') {
			const index = selected;
			selected = -1;
			onCommit(deleteNote(notes, index));
			return;
		}
		if ('midi' in edit) onSound(edit.midi);
		nudge(edit);
	}

	/** @param {{ midi?: number, start?: number, length?: number }} change */
	function nudge(change) {
		const list = changeNote(notes, selected, change, end);
		const moved = { ...notes[selected], ...change };
		finish(list, noteIn(list, moved), change.length);
	}
</script>

<div class="ui-sunk-frame rounded-[var(--corner-card)]">
	<div
		bind:this={scroller}
		class="roll relative h-[calc(18rem+var(--lane-height))] overflow-auto ui-well outline-offset-2 pointer-coarse:h-[calc(20rem+var(--lane-height))]"
		style:--lane-height="{lane ? LANE_HEIGHT : 0}px"
		role="application"
		aria-label="Piano roll: draw the melody"
		tabindex="0"
		onkeydown={keys}
		onwheel={pauseFollowing}
		ontouchstart={pauseFollowing}
	>
		<div class="relative" style:width="{LABEL_WIDTH + width}px">
			<div class="sticky top-0 z-20 flex" style:height="{RULER_HEIGHT}px">
				<div
					class="corner ui-side-column sticky left-0 z-10 shrink-0"
					style:width="{LABEL_WIDTH}px"
				></div>
				<!-- svelte-ignore a11y_click_events_have_key_events (the page's own keys move around) -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="ruler relative"
					class:seeks={onSeek}
					style:width="{width}px"
					onclick={onSeek ? seekFromRuler : undefined}
				>
					{#each score.bars as bar, index (index)}
						<span class="bar-number" style:left="{bar.start * tickWidth}px"
							>{barLabel(score.bars, index)}</span
						>
					{/each}
				</div>
			</div>

			{#if lane}
				<div class="sticky z-20 flex" style:top="{RULER_HEIGHT}px" style:height="{LANE_HEIGHT}px">
					<div
						class="lane-name ui-side-column sticky left-0 z-10 shrink-0"
						style:width="{LABEL_WIDTH}px"
					>
						{lane.name}
					</div>
					{@render lane.draw({ width, height: LANE_HEIGHT, tickWidth })}
				</div>
			{/if}

			<div class="flex">
				<div
					class="labels ui-side-column sticky left-0 z-10 shrink-0"
					style:width="{LABEL_WIDTH}px"
				>
					{#each rows as row (row.midi)}
						<div
							class="label"
							class:in-key={row.inKey}
							class:white-key-below={row.whiteKeyBelow}
							style:height="{rowHeight}px"
						>
							{row.name}
						</div>
					{/each}
				</div>

				<div
					bind:this={surface}
					class="surface relative"
					class:editable={!readOnly}
					class:resizing
					style:width="{width}px"
					style:height="{height}px"
					onpointerdown={press}
					onpointermove={drag}
					onpointerup={release}
					onpointercancel={cancel}
					role="presentation"
				>
					{#each rows as row, i (row.midi)}
						<div
							class="row"
							class:black={row.black}
							class:white-key-below={row.whiteKeyBelow}
							style:top="{i * rowHeight}px"
							style:height="{rowHeight}px"
						></div>
					{/each}
					{#each score.bars as bar, index (index)}
						<div
							class="bar"
							class:pickup={index === 0 && firstIsPickup}
							style:left="{bar.start * tickWidth}px"
							style:width="{bar.length * tickWidth}px"
							style:--beat="{TICKS_PER_QUARTER * tickWidth}px"
							style:--step="{gridStep * tickWidth}px"
						></div>
					{/each}
					{#each others as voice, v (v)}
						{#each voice.notes as note (`${note.start}-${note.midi}`)}
							<div
								class="note other voice-colour"
								class:given={voice.given}
								style:--voice={voice.colour}
								style:left="{note.start * tickWidth}px"
								style:top="{(range.highest - note.midi) * rowHeight}px"
								style:width="{note.length * tickWidth}px"
								style:height="{rowHeight}px"
							></div>
						{/each}
					{/each}
					{#each shown as note, index (`${note.start}-${note.midi}`)}
						<div
							class="note voice-colour"
							style:--voice={colour}
							class:selected={!preview && index === selected}
							class:echo={'echo' in note && note.echo}
							class:outside={playable && isOutside(note.midi, playable)}
							style:left="{note.start * tickWidth}px"
							style:top="{(range.highest - note.midi) * rowHeight}px"
							style:width="{note.length * tickWidth}px"
							style:height="{rowHeight}px"
						>
							{#if !readOnly}
								<span class="grip" style:width="{resizeEdge(note, tickWidth)}px"></span>
								{#if !preview && index === selected}
									<span class="handle" data-handle use:tooltip={TIPS.melody.roll.lengthHandle}
									></span>
								{/if}
							{/if}
						</div>
					{/each}
					<div bind:this={playheadLine} class="playhead"></div>
					{#if !preview && notes[selected]}
						{@const picked = notes[selected]}
						{#each options as midi (midi)}
							<button
								type="button"
								class="option voice-colour"
								style:--voice={colour}
								data-option={midi}
								style:left="{picked.start * tickWidth}px"
								style:top="{(range.highest - midi) * rowHeight}px"
								style:width="{Math.max(picked.length * tickWidth, rowHeight)}px"
								style:height="{rowHeight}px"
								aria-label="Move the note here"
							></button>
						{/each}
					{/if}
				</div>
			</div>

			<div class="sticky bottom-0 z-20 flex" style:height="{CHORD_HEIGHT}px">
				<div
					class="corner ui-side-column sticky left-0 z-10 shrink-0"
					style:width="{LABEL_WIDTH}px"
				></div>
				<div class="chords relative" style:width="{width}px">
					{#each chordsUnder as chord, index (index)}
						<span
							class="chord"
							style:left="{chord.at * tickWidth}px"
							style:width="{chord.length * tickWidth}px">{chordName(chord.name, chord.place)}</span
						>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
{#if !readOnly}
	<NoteEditBar picked={!!notes[selected]} onStep={stepPicked} />
{/if}

<style>
	.roll {
		padding: 0;
		touch-action: pan-x pan-y;
	}
	.ruler,
	.chords {
		background: var(--color-surface-deep);
	}
	.ruler,
	.chords {
		font-size: 0.75rem;
		color: var(--color-ink-soft);
	}
	.ruler.seeks {
		cursor: pointer;
	}
	.bar-number {
		position: absolute;
		top: 0.15rem;
		padding-left: 0.25rem;
	}
	.lane-name {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: 0.35rem;
		font-size: 0.7rem;
		color: var(--color-ink-soft);
		border-bottom: 1px solid var(--color-line);
	}
	.label {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: 0.35rem;
		font-size: 0.7rem;
		color: var(--color-ink-faint);
		border-bottom: 1px solid transparent;
	}
	/* The song's key is shown on the names, never by the rows (they're the piano's) */
	.label.in-key {
		color: var(--color-ink);
	}
	.label.white-key-below {
		border-bottom-color: color-mix(in oklab, var(--color-ink) 35%, transparent);
	}
	.surface.editable {
		cursor: crosshair;
	}
	/* Over a note: a hand moves it, and its right end (the grip) stretches it */
	.surface.editable .note {
		cursor: grab;
	}
	.grip {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		cursor: ew-resize;
	}
	.surface.resizing,
	.surface.resizing * {
		cursor: ew-resize;
	}
	/* The picked note's length, as a tab off its right end: big enough for a finger, beside the
	   note rather than on it, so the finger doesn't hide the end it's moving */
	.handle {
		position: absolute;
		top: -1px;
		bottom: -1px;
		left: 100%;
		width: 14px;
		touch-action: none;
		cursor: ew-resize;
		background:
			linear-gradient(var(--color-ink), var(--color-ink)) center / 2px 50% no-repeat,
			var(--color-raised);
		border: 2px solid var(--color-ink);
		border-left: none;
		border-radius: 0 var(--corner-control) var(--corner-control) 0;
	}
	@media (pointer: coarse) {
		.handle {
			width: 1.75rem;
		}
	}
	.row {
		position: absolute;
		left: 0;
		right: 0;
		background: var(--color-raised);
		border-bottom: 1px solid color-mix(in oklab, var(--color-line) 50%, transparent);
	}
	.row.black {
		background: var(--color-surface-deep);
	}
	/* Logic's line between B and C, and E and F: two white keys side by side */
	.row.white-key-below {
		border-bottom-color: color-mix(in oklab, var(--color-ink) 35%, transparent);
	}
	.bar {
		position: absolute;
		top: 0;
		bottom: 0;
		pointer-events: none;
		border-left: 1px solid color-mix(in oklab, var(--color-ink) 40%, transparent);
		background-image:
			repeating-linear-gradient(to right, var(--color-line) 0 1px, transparent 1px var(--beat)),
			repeating-linear-gradient(
				to right,
				color-mix(in oklab, var(--color-line) 45%, transparent) 0 1px,
				transparent 1px var(--step)
			);
	}
	.bar.pickup {
		background-position: right;
	}
	.note {
		position: absolute;
		background: var(--voice-colour);
		border: 1px solid color-mix(in oklab, var(--voice-colour) 60%, var(--color-ink));
		/* square whatever the theme's roundness: a note's ends mark its exact start and length */
		border-radius: 0;
		/* the right end resizes */
		background-image: linear-gradient(
			to left,
			color-mix(in oklab, var(--voice-colour) 70%, var(--color-ink)) 0 4px,
			transparent 4px
		);
		box-shadow: var(--shadow-bevel), var(--shadow-drop-small);
	}
	.playhead {
		display: none;
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 2px;
		z-index: 3;
		pointer-events: none;
		background: var(--color-ink);
	}
	/* The pickup again, leading back to bar 1: the same notes, edited either place */
	.note.echo {
		border: 2px dashed var(--color-ink);
		background-color: color-mix(in oklab, var(--voice-colour) 65%, var(--color-raised));
	}
	/* Outside the instrument's natural range: striped */
	.note.outside {
		background-image:
			linear-gradient(
				to left,
				color-mix(in oklab, var(--voice-colour) 70%, var(--color-ink)) 0 4px,
				transparent 4px
			),
			repeating-linear-gradient(-45deg, var(--color-ink) 0 2px, transparent 2px 6px);
	}
	.note.other {
		opacity: 0.3;
		pointer-events: none;
		background-image: none;
		box-shadow: none;
	}
	/* The given melody, which the line being edited is worked out from: kept in sight */
	.note.other.given {
		opacity: 0.75;
		outline: 2px solid var(--color-ink);
		outline-offset: -2px;
	}
	.option {
		position: absolute;
		z-index: 2;
		touch-action: none;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		padding: 0;
		background: transparent;
		cursor: pointer;
	}
	/* a dot at the start of the slot: a target for a finger, small to the eye */
	.option::before {
		content: '';
		width: 0.7rem;
		height: 0.7rem;
		margin-left: 0.15rem;
		border-radius: 999px;
		border: 2px solid var(--voice-colour);
		background: var(--color-raised);
	}
	/* picked up: it rises off the grid, and a finger on it moves it */
	.note.selected {
		touch-action: none;
		outline: 2px solid var(--color-ink);
		outline-offset: 1px;
		z-index: 1;
		box-shadow: var(--shadow-bevel), var(--shadow-drop-floating);
	}
	.chord {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		padding-left: 0.3rem;
		overflow: hidden;
		white-space: nowrap;
		border-left: 1px solid var(--color-line);
		color: var(--color-ink);
		font-weight: 600;
	}
</style>
