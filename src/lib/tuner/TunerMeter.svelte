<script>
	/**
	 * The tuner's screen: a meter of ±50 cents with a needle (1° a cent),
	 * the note big in the middle with lamps for flat and sharp, the cents and
	 * Hz, a strobe band that stands still when you're in tune, and the notes
	 * on a wheel that turns with the pitch. Everything that moves is drawn
	 * straight to the page on the shared frame loop.
	 */
	import { onEveryFrame } from '$lib/audio/analysis/frameLoop.js';
	import { createNeedleFilter } from './needleFilter.js';
	import { noteName } from './noteNames.js';

	/** Within this many cents is in tune (the needle's centre lamp lights). */
	const IN_TUNE = 2;
	/** The strobe's stripes move this many pixels a second per cent off. */
	const STROBE_SPEED = 6;
	/** Space between notes on the wheel (px). */
	const WHEEL_SPACING = 56;
	const WHEEL_NOTES = 5;
	const TICKS = Array.from({ length: 21 }, (_, i) => -50 + i * 5);

	/** @type {{ tuner: import('./TunerState.svelte.js').TunerState }} */
	let { tuner } = $props();

	/** @type {Record<string, HTMLElement | SVGElement | undefined>} */
	const parts = $state({});

	const shown = $derived(tuner.note === null ? null : noteName(tuner.note));
	const wheel = $derived(
		tuner.note === null
			? []
			: Array.from({ length: WHEEL_NOTES * 2 + 1 }, (_, i) => {
					const midi = /** @type {number} */ (tuner.note) + i - WHEEL_NOTES;
					return { midi, ...noteName(midi) };
				})
	);

	/** @param {number} cents */
	function pointAt(cents, radius) {
		const angle = (cents * Math.PI) / 180;
		return { x: radius * Math.sin(angle), y: -radius * Math.cos(angle) };
	}

	/** @param {number} cents */
	const signed = (cents) =>
		`${cents > 0.05 ? '+' : cents < -0.05 ? '−' : ''}${Math.abs(cents).toFixed(1)}`;

	$effect(() => {
		const needle = createNeedleFilter();
		let lastNote = /** @type {number | null} */ (null);
		let strobeAt = 0;

		const stop = onEveryFrame((_, elapsed) => {
			const reading = tuner.latest;
			const { screen, needleArm, cents, hz, strobe, names } = parts;
			if (!screen || !needleArm || !cents || !hz || !strobe || !names) return;
			if (!reading || reading.note === null || reading.cents === null) {
				screen.classList.remove('in-tune', 'flat', 'sharp');
				return;
			}
			if (reading.note !== lastNote) needle.reset();
			lastNote = reading.note;

			const off = needle.next(reading.cents, elapsed);
			const inTune = reading.sounding && Math.abs(off) < IN_TUNE;
			needleArm.setAttribute('transform', `rotate(${Math.max(-55, Math.min(55, off))})`);
			screen.classList.toggle('in-tune', inTune);
			screen.classList.toggle('flat', reading.sounding && !inTune && off < 0);
			screen.classList.toggle('sharp', reading.sounding && !inTune && off > 0);
			cents.textContent = signed(off);
			hz.textContent = reading.hz === null ? '' : reading.hz.toFixed(2);
			names.style.transform = `translateX(${(-off / 100) * WHEEL_SPACING}px)`;
			if (reading.sounding) strobeAt += off * STROBE_SPEED * elapsed;
			strobe.style.backgroundPositionX = `${strobeAt}px`;
		});
		return stop;
	});
</script>

<div class="screen" class:quiet={!tuner.sounding} bind:this={parts.screen}>
	<div class="dial">
		<svg
			class="meter"
			viewBox="-118 -116 236 128"
			preserveAspectRatio="xMidYMax meet"
			aria-hidden="true"
		>
			<path
				class="scale"
				d="M {pointAt(-50, 92).x} {pointAt(-50, 92).y} A 92 92 0 0 1 {pointAt(50, 92).x} {pointAt(
					50,
					92
				).y}"
			/>
			<path
				class="zone"
				d="M {pointAt(-IN_TUNE, 97).x} {pointAt(-IN_TUNE, 97).y} A 97 97 0 0 1 {pointAt(IN_TUNE, 97)
					.x} {pointAt(IN_TUNE, 97).y}"
			/>
			{#each TICKS as cents (cents)}
				{@const long = cents % 25 === 0}
				{@const from = pointAt(cents, long ? 80 : 85)}
				{@const to = pointAt(cents, 90)}
				<line class="tick" class:long x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
				{#if long}
					{@const label = pointAt(cents, 105)}
					<text x={label.x} y={label.y + 4}
						>{cents > 0 ? `+${cents}` : cents < 0 ? `−${-cents}` : '0'}</text
					>
				{/if}
			{/each}
			<g class="needle" bind:this={parts.needleArm}>
				<line x1="0" y1="6" x2="0" y2="-94" />
			</g>
			<circle class="pivot" r="6" />
		</svg>
	</div>

	<div class="note-row">
		<span class="lamp flat-lamp" aria-hidden="true">◀</span>
		<div class="note" aria-live="polite">
			{#if shown}
				<span class="letter">{shown.letter}</span><span class="marks"
					><span class="accidental">{shown.accidental}</span><span class="octave"
						>{shown.octave}</span
					></span
				>
			{:else}
				<span class="letter waiting">–</span>
			{/if}
		</div>
		<span class="lamp sharp-lamp" aria-hidden="true">▶</span>
	</div>

	<div class="readouts">
		{#if shown}
			<span><span bind:this={parts.cents}>0.0</span> cents</span>
			<span><span bind:this={parts.hz}></span> Hz</span>
		{:else}
			<span>Play a note</span>
		{/if}
	</div>

	<div class="strobe" bind:this={parts.strobe} aria-hidden="true"></div>

	<div class="wheel" aria-hidden="true">
		<div class="names" bind:this={parts.names}>
			{#each wheel as note (note.midi)}
				<span
					class:current={note.midi === tuner.note}
					style:left="{(note.midi - (tuner.note ?? 0)) * WHEEL_SPACING}px"
					>{note.letter}<small>{note.accidental}</small></span
				>
			{/each}
		</div>
		<div class="marker"></div>
	</div>
</div>

<style>
	/* An instrument's screen: a deeper tone of the page, its own lamps */
	.screen {
		--screen: var(--tuner-screen);
		--lit: color-mix(in oklab, var(--meter-safe), var(--color-ink) 18%);
		--off: var(--color-accent);
		display: flex;
		flex-direction: column;
		justify-content: center;
		container-type: size;
		min-height: 22rem;
		gap: 0.25rem;
		padding: 1rem 1rem 0.75rem;
		border-radius: var(--corner-panel);
		background: radial-gradient(
			120% 90% at 50% 0%,
			oklch(from var(--screen) calc(l + 0.04) c h),
			var(--screen)
		);
		border: 1px solid var(--color-line);
		box-shadow: inset 0 2px 10px oklch(0 0 0 / calc(0.35 * var(--depth-on)));
		user-select: none;
	}

	/* The dial grows into what the rest leaves, up to its full width; on a tall
	   screen the spare space goes above and below the whole screen's contents */
	.dial {
		position: relative;
		flex: 1 1 0;
		min-height: 6rem;
		max-height: calc((100cqw - 2rem) * 128 / 236);
	}
	.meter {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.scale {
		fill: none;
		stroke: var(--color-ink-faint);
		stroke-width: 1;
	}
	.zone {
		fill: none;
		stroke: var(--color-ink-faint);
		stroke-width: 5;
		stroke-linecap: round;
		transition: stroke 0.15s;
	}
	.tick {
		stroke: var(--color-ink-faint);
		stroke-width: 1;
	}
	.tick.long {
		stroke: var(--color-ink-soft);
		stroke-width: 1.6;
	}
	text {
		fill: var(--color-ink-soft);
		font-size: 9px;
		text-anchor: middle;
		font-variant-numeric: tabular-nums;
	}
	.needle line {
		stroke: var(--off);
		stroke-width: 2.4;
		stroke-linecap: round;
		filter: drop-shadow(0 0 3px color-mix(in oklab, var(--off) 70%, transparent));
		transition: stroke 0.15s;
	}
	.pivot {
		fill: var(--color-ink-soft);
	}
	.screen:global(.in-tune) .zone,
	.screen:global(.in-tune) .needle line {
		stroke: var(--lit);
	}
	.screen:global(.in-tune) .needle line {
		filter: drop-shadow(0 0 5px var(--lit));
	}
	.quiet .needle line {
		stroke: var(--color-ink-faint);
		filter: none;
	}

	.note-row {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		margin-top: -0.5rem;
	}
	.lamp {
		font-size: clamp(1.4rem, 5cqmin, 3rem);
		color: var(--color-ink-faint);
		opacity: 0.45;
		transition:
			color 0.1s,
			opacity 0.1s;
	}
	.flat-lamp {
		justify-self: end;
		margin-right: 1rem;
	}
	.sharp-lamp {
		justify-self: start;
		margin-left: 1rem;
	}
	.screen:global(.flat) .flat-lamp,
	.screen:global(.sharp) .sharp-lamp {
		color: var(--off);
		opacity: 1;
		text-shadow: 0 0 10px var(--off);
	}

	.note {
		--letter: clamp(5.5rem, 20cqmin, 14rem);
		display: flex;
		align-items: flex-start;
		min-width: calc(var(--letter) * 1.1);
		justify-content: center;
		font-weight: 700;
		line-height: 1;
		transition: color 0.15s;
	}
	.letter {
		font-size: var(--letter);
		letter-spacing: -0.03em;
	}
	.waiting {
		color: var(--color-ink-faint);
	}
	.marks {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: calc(var(--letter) * 0.84);
		margin-top: calc(var(--letter) * 0.11);
		margin-left: 0.15rem;
		font-size: calc(var(--letter) * 0.29);
	}
	.octave {
		font-size: 0.75em;
		color: var(--color-ink-soft);
	}
	.screen:global(.in-tune) .note {
		color: var(--lit);
		text-shadow: 0 0 18px color-mix(in oklab, var(--lit) 55%, transparent);
	}
	.quiet .note {
		color: var(--color-ink-soft);
	}

	.readouts {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		font-size: clamp(0.85rem, 3cqmin, 1.5rem);
		color: var(--color-ink-soft);
		font-variant-numeric: tabular-nums;
	}

	/* Stripes that drift left when flat and right when sharp, and stand still in tune */
	.strobe {
		height: clamp(0.9rem, 3cqmin, 2rem);
		margin: 0.5rem 0 0.25rem;
		border-radius: 999px;
		background-image: repeating-linear-gradient(
			90deg,
			color-mix(in oklab, var(--off) 85%, transparent) 0 10px,
			transparent 10px 20px
		);
		opacity: 0.9;
		mask-image: linear-gradient(90deg, transparent, black 18%, black 82%, transparent);
	}
	.screen:global(.in-tune) .strobe {
		background-image: repeating-linear-gradient(
			90deg,
			color-mix(in oklab, var(--lit) 85%, transparent) 0 10px,
			transparent 10px 20px
		);
	}
	.quiet .strobe {
		opacity: 0.3;
	}

	/* The notes on a wheel, turning with the pitch, fading at its edges */
	.wheel {
		position: relative;
		height: 2.6rem;
		overflow: hidden;
		mask-image: linear-gradient(90deg, transparent, black 30%, black 70%, transparent);
	}
	.names {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
	}
	.names span {
		position: absolute;
		top: 50%;
		translate: -50% -50%;
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--color-ink-faint);
	}
	.names span.current {
		color: var(--color-ink);
		font-size: 1.35rem;
	}
	.names small {
		font-size: 0.7em;
	}
	.marker {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 2px;
		translate: -50% 0;
		background: var(--off);
		opacity: 0.7;
	}
	.screen:global(.in-tune) .marker {
		background: var(--lit);
	}
</style>
