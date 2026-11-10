<script>
	/**
	 * The piano roll: time across, pitch up. Notes in the key are on the
	 * lighter rows; the chart's chords run along the bottom.
	 *
	 * Mouse: drag on an empty spot to draw a note as long as you drag; drag a
	 * note to move it, or its right end to make it longer or shorter;
	 * double-click to delete. Touch: tap an empty spot to add a note (a
	 * swipe scrolls), drag a note or its right end, double-tap to delete.
	 * Keys, once a note is picked: arrows move it (Shift: an octave),
	 * Delete removes it.
	 *
	 * The tune's other voices show faintly behind the one being edited. A
	 * picked harmony note shows dots on the chord's other notes: tap one to
	 * move the note there.
	 *
	 * While the band plays, a line shows where it is and the roll scrolls
	 * with it (it lets go for a moment when you scroll it yourself).
	 */
	import { onMount, tick as rendered, untrack } from 'svelte';
	import { onEveryFrame } from '../../playback/analysis/frameLoop.js';
	import { addNote, changeNote, deleteNote, noteAt } from '../../melody/roll/editNotes.js';
	import { snapDown, snapNearest, TICKS_PER_QUARTER } from '../../melody/roll/ticks.js';
	import { pitchRows } from '../../melody/roll/pitchRows.js';

	/* Size */
	const LABEL_WIDTH = 44;
	const RULER_HEIGHT = 22;
	const CHORD_HEIGHT = 28;
	const ROW_HEIGHT = { mouse: 22, touch: 32 };
	/** Pixels per quarter note: wider when the grid is finer. */
	const QUARTER_WIDTH = { coarse: 64, fine: 96 };
	/* Gestures */
	const MOVE_THRESHOLD = 6; // px before a press counts as a drag
	const DOUBLE_TAP_MS = 350;
	const EDGE_MIN = 10; // px of a note's right end that resizes it
	const EDGE_MAX = 24;
	/* Following the band */
	const FOLLOW_AT = 1 / 3; // the playhead sits this far across the view
	const FOLLOW_PAUSE_MS = 3000; // after you scroll the roll yourself

	/**
	 * @type {{
	 *   score: import('../../melody/roll/readScore.js').Score,
	 *   notes: import('../../melody/roll/editNotes.js').DrawnNote[],
	 *   chordsUnder: import('../../melody/roll/chordsUnderBars.js').ChordUnder[],
	 *   chordName: (name: string) => string,
	 *   spelling: import('../../theory/musicInKey.js').Key,
	 *   tonic: number,
	 *   range: import('../../melody/roll/pitchRows.js').RowRange,
	 *   end: number,
	 *   gridStep: number,
	 *   drawLength: number,
	 *   readOnly: boolean,
	 *   selected: number,
	 *   colour: number,
	 *   others: { colour: number, notes: import('../../melody/roll/editNotes.js').DrawnNote[] }[],
	 *   options: number[],
	 *   playing: boolean,
	 *   playhead: () => number | null,
	 *   onCommit: (notes: import('../../melody/roll/editNotes.js').DrawnNote[], length?: number) => void,
	 *   onSound: (midi: number) => void
	 * }}
	 */
	let {
		score,
		notes,
		chordsUnder,
		chordName,
		spelling,
		tonic,
		range,
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
		onSound
	} = $props();

	let touchScreen = $state(false);
	/** @type {HTMLElement | undefined} */
	let scroller = $state();
	/** @type {HTMLElement | undefined} */
	let surface = $state();
	/** The notes while a drag is under way (null when none is). */
	let preview = $state.raw(/** @type {typeof notes | null} */ (null));

	let rowHeight = $derived(touchScreen ? ROW_HEIGHT.touch : ROW_HEIGHT.mouse);
	let tickWidth = $derived(
		(gridStep < TICKS_PER_QUARTER / 2 ? QUARTER_WIDTH.fine : QUARTER_WIDTH.coarse) /
			TICKS_PER_QUARTER
	);
	let rows = $derived(pitchRows(spelling, tonic, range));
	let shown = $derived(preview ?? notes);
	let width = $derived(end * tickWidth);
	let height = $derived(rows.length * rowHeight);
	let firstIsPickup = $derived(isShort(score.bars[0]));

	onMount(() => {
		touchScreen = matchMedia('(pointer: coarse)').matches;
		requestAnimationFrame(scrollToTune);
	});

	// Another voice's rows (the bass sits lower): show its notes
	$effect(() => {
		void range;
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

		scroller.scrollLeft = Math.max(0, x - (scroller.clientWidth - LABEL_WIDTH) * FOLLOW_AT);
		const sounding = notes.find((note) => note.start <= tick && tick < note.start + note.length);
		if (!sounding) return;
		const y = (range.highest - sounding.midi) * rowHeight;
		const view = scroller.clientHeight - RULER_HEIGHT - CHORD_HEIGHT;
		if (y < scroller.scrollTop || y + rowHeight > scroller.scrollTop + view) {
			scroller.scrollTop = Math.max(0, y - view / 2);
		}
	}

	function pauseFollowing() {
		followPausedUntil = performance.now() + FOLLOW_PAUSE_MS;
	}

	/** Show the tune's middle (or the home note near middle C) when the roll opens. */
	function scrollToTune() {
		if (!scroller) return;
		const pitches = notes.map((note) => note.midi);
		const middle = pitches.length
			? (Math.min(...pitches) + Math.max(...pitches)) / 2
			: 60 + ((tonic + 7) % 12);
		const y = (range.highest - middle) * rowHeight + RULER_HEIGHT - scroller.clientHeight / 2;
		scroller.scrollTop = Math.max(0, y);
	}

	/** @param {import('../../melody/roll/readScore.js').ScoreBar | undefined} bar */
	function isShort(bar) {
		return Boolean(bar) && bar.length < (bar.meter.num * 4 * TICKS_PER_QUARTER) / bar.meter.den;
	}

	/** @param {number} index */
	function barNumber(index) {
		if (firstIsPickup && index === 0) return '';
		return String(firstIsPickup ? index : index + 1);
	}

	/** @param {PointerEvent} event */
	function locate(event) {
		const rect = /** @type {HTMLElement} */ (surface).getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		const midi = range.highest - Math.floor(y / rowHeight);
		return {
			x,
			y,
			tick: x / tickWidth,
			midi: Math.min(range.highest, Math.max(range.lowest, midi))
		};
	}

	/**
	 * @typedef {{
	 *   kind: 'draw' | 'move' | 'resize' | 'tap', x: number, y: number, moved: boolean,
	 *   index: number, start: number, midi: number, length: number,
	 *   now: { start: number, midi: number, length: number }
	 * }} Gesture
	 *   start/midi/length: where the note was when pressed; now: where it is
	 */
	/** @type {Gesture | null} */
	let gesture = null;
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
		const index = noteAt(notes, at.tick, at.midi);
		scroller?.focus({ preventScroll: true });

		if (index >= 0) {
			const now = performance.now();
			if (lastTap.index === index && now - lastTap.time < DOUBLE_TAP_MS) {
				lastTap = { index: -1, time: 0 };
				selected = -1;
				onCommit(deleteNote(notes, index));
				return;
			}
			lastTap = { index, time: now };
			const note = notes[index];
			const noteWidth = note.length * tickWidth;
			const edge = Math.min(EDGE_MAX, Math.max(EDGE_MIN, noteWidth * 0.35));
			const onEdge = at.x > (note.start + note.length) * tickWidth - edge;
			selected = index;
			onSound(note.midi);
			gesture = {
				kind: onEdge ? 'resize' : 'move',
				x: at.x,
				y: at.y,
				moved: false,
				index,
				...note,
				now: { ...note }
			};
			surface?.setPointerCapture(event.pointerId);
			event.preventDefault();
			return;
		}

		selected = -1;
		const start = snapDown(at.tick, gridStep);
		if (event.pointerType === 'touch') {
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

	/** @param {PointerEvent} event */
	function drag(event) {
		if (!gesture) return;
		const at = locate(event);
		const dx = at.x - gesture.x;
		const dy = at.y - gesture.y;
		if (Math.hypot(dx, dy) > MOVE_THRESHOLD) gesture.moved = true;
		if (!gesture.moved || gesture.kind === 'tap') return;

		if (gesture.kind === 'draw') {
			const length = Math.max(gridStep, snapNearest(at.tick, gridStep) - gesture.start);
			preview = addNote(notes, { midi: gesture.midi, start: gesture.start, length }, end);
		} else if (gesture.kind === 'move') {
			const shift = snapNearest(dx / tickWidth, gridStep);
			const start = Math.min(Math.max(0, gesture.start + shift), end - gesture.length);
			const midi = Math.min(
				range.highest,
				Math.max(range.lowest, gesture.midi - Math.round(dy / rowHeight))
			);
			if (midi !== gesture.now.midi) onSound(midi);
			gesture.now = { ...gesture.now, start, midi };
			preview = changeNote(notes, gesture.index, gesture.now, end);
		} else {
			const length = Math.max(gridStep, snapNearest(gesture.length + dx / tickWidth, gridStep));
			gesture.now = { ...gesture.now, length };
			preview = changeNote(notes, gesture.index, gesture.now, end);
		}
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
		const edited = preview;
		preview = null;
		if (!done) return;

		if (done.kind === 'tap') {
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
		preview = null;
	}

	/** @param {KeyboardEvent} event */
	function keys(event) {
		if (readOnly || selected < 0 || !notes[selected]) return;
		const note = notes[selected];
		const steps = { ArrowUp: 1, ArrowDown: -1 };
		const moves = { ArrowLeft: -gridStep, ArrowRight: gridStep };
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			const index = selected;
			selected = -1;
			onCommit(deleteNote(notes, index));
		} else if (event.key in steps) {
			event.preventDefault();
			const step = steps[/** @type {keyof typeof steps} */ (event.key)] * (event.shiftKey ? 12 : 1);
			const midi = Math.min(range.highest, Math.max(range.lowest, note.midi + step));
			onSound(midi);
			nudge({ midi });
		} else if (event.key in moves) {
			event.preventDefault();
			const shift = moves[/** @type {keyof typeof moves} */ (event.key)];
			nudge({ start: Math.min(Math.max(0, note.start + shift), end - note.length) });
		}
	}

	/** @param {{ midi?: number, start?: number }} change */
	function nudge(change) {
		const list = changeNote(notes, selected, change, end);
		const moved = { ...notes[selected], ...change };
		finish(list, noteIn(list, moved));
	}
</script>

<div
	bind:this={scroller}
	class="roll relative h-72 overflow-auto ui-well outline-offset-2 pointer-coarse:h-80"
	role="application"
	aria-label="Piano roll: draw the melody"
	tabindex="0"
	onkeydown={keys}
	onwheel={pauseFollowing}
	ontouchstart={pauseFollowing}
>
	<div class="relative" style:width="{LABEL_WIDTH + width}px">
		<div class="sticky top-0 z-20 flex" style:height="{RULER_HEIGHT}px">
			<div class="corner sticky left-0 z-10 shrink-0" style:width="{LABEL_WIDTH}px"></div>
			<div class="ruler relative" style:width="{width}px">
				{#each score.bars as bar, index (index)}
					<span class="bar-number" style:left="{bar.start * tickWidth}px">{barNumber(index)}</span>
				{/each}
			</div>
		</div>

		<div class="flex">
			<div class="labels sticky left-0 z-10 shrink-0" style:width="{LABEL_WIDTH}px">
				{#each rows as row (row.midi)}
					<div class="label" class:home={row.home} style:height="{rowHeight}px">
						{row.inKey ? row.name : ''}
					</div>
				{/each}
			</div>

			<div
				bind:this={surface}
				class="surface relative"
				class:editable={!readOnly}
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
						class:in-key={row.inKey}
						class:home={row.home}
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
						style:left="{note.start * tickWidth}px"
						style:top="{(range.highest - note.midi) * rowHeight}px"
						style:width="{note.length * tickWidth}px"
						style:height="{rowHeight}px"
					></div>
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
			<div class="corner sticky left-0 z-10 shrink-0" style:width="{LABEL_WIDTH}px"></div>
			<div class="chords relative" style:width="{width}px">
				{#each chordsUnder as chord, index (index)}
					<span
						class="chord"
						style:left="{chord.at * tickWidth}px"
						style:width="{chord.length * tickWidth}px">{chordName(chord.name)}</span
					>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.roll {
		padding: 0;
		touch-action: pan-x pan-y;
	}
	.corner,
	.ruler,
	.labels,
	.chords {
		background: var(--color-surface-deep);
	}
	.ruler,
	.chords {
		font-size: 0.75rem;
		color: var(--color-ink-soft);
	}
	.bar-number {
		position: absolute;
		top: 0.15rem;
		padding-left: 0.25rem;
	}
	.label {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: 0.35rem;
		font-size: 0.7rem;
		color: var(--color-ink-soft);
		border-bottom: 1px solid transparent;
	}
	.label.home {
		font-weight: 700;
		color: var(--color-ink);
	}
	.surface.editable {
		cursor: crosshair;
	}
	.row {
		position: absolute;
		left: 0;
		right: 0;
		background: var(--color-surface-deep);
		border-bottom: 1px solid color-mix(in oklab, var(--color-line) 50%, transparent);
	}
	.row.in-key {
		background: var(--color-raised);
	}
	.row.home {
		background: color-mix(in oklab, var(--color-accent-soft) 45%, var(--color-raised));
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
		touch-action: none;
		background: var(--voice-colour);
		border: 1px solid color-mix(in oklab, var(--voice-colour) 60%, var(--color-ink));
		border-radius: var(--corner-small);
		/* the right end resizes */
		background-image: linear-gradient(
			to left,
			color-mix(in oklab, var(--voice-colour) 70%, var(--color-ink)) 0 4px,
			transparent 4px
		);
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
	.note.other {
		opacity: 0.3;
		pointer-events: none;
		background-image: none;
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
	.note.selected {
		outline: 2px solid var(--color-ink);
		outline-offset: 1px;
		z-index: 1;
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
