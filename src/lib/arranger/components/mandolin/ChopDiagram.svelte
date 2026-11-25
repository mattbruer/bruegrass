<script>
	/**
	 * A mandolin chord diagram, G to E left to right, the nut (or the first
	 * fret shown) at the top. Each fretted note is a dot naming what it is in
	 * the chord (R, 3, ♭7), filled for the chord's own notes. Tap a place to
	 * put a finger there, tap the dot again to mute the course; above the
	 * nut, tap to play a course open or mute it.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   frets: (number | null)[],
	 *   marks: (string | null)[],
	 *   inChord: boolean[],
	 *   courses: string[],
	 *   maxFret: number,
	 *   onChange: (frets: (number | null)[]) => void
	 * }}
	 *   marks: what each course's note is (R, 3, ♭7), null when muted;
	 *   inChord: whether each course's note is one of the chord's own
	 */
	let { frets, marks, inChord, courses, maxFret, onChange } = $props();

	/** How many frets show at once: enough that most chops sit under the nut. */
	const ROWS = 7;
	const STRING_GAP = 34;
	const FRET_GAP = 36;
	const LEFT = 34;
	const TOP = 34;
	const DOT = 13;

	const fretted = $derived(frets.filter((fret) => fret !== null && fret > 0));
	/** The first fret shown: 1 while the shape fits under the nut. */
	const firstFret = $derived(
		fretted.length === 0 || Math.max(...fretted) < ROWS
			? 1
			: Math.min(Math.min(...fretted), maxFret - ROWS + 1)
	);
	const rows = $derived(Array.from({ length: ROWS }, (_, i) => firstFret + i));
	const width = LEFT * 2 + STRING_GAP * (courses.length - 1);
	const height = TOP + FRET_GAP * ROWS + 22;

	/** @param {number} course */
	const xOf = (course) => LEFT + course * STRING_GAP;
	/** @param {number} fret the middle of its space */
	const yOf = (fret) => TOP + (fret - firstFret + 0.5) * FRET_GAP;

	/**
	 * @param {number} course
	 * @param {number | null} fret
	 */
	function set(course, fret) {
		onChange(frets.map((each, i) => (i === course ? fret : each)));
	}
</script>

<svg
	viewBox="0 0 {width} {height}"
	width={width * 1.15}
	class="diagram"
	role="group"
	aria-label="Mandolin chord diagram"
>
	{#if firstFret === 1}
		<rect class="nut" x={LEFT - 2} y={TOP - 4} width={width - 2 * LEFT + 4} height="5" />
	{:else}
		<text class="first-fret" x={LEFT - 18} y={yOf(firstFret) + 4} text-anchor="end"
			>{firstFret}</text
		>
	{/if}
	{#each { length: ROWS + 1 }, i (i)}
		<line
			class="fret"
			x1={LEFT}
			x2={width - LEFT}
			y1={TOP + i * FRET_GAP}
			y2={TOP + i * FRET_GAP}
		/>
	{/each}
	{#each courses as name, course (name)}
		<line class="string" x1={xOf(course)} x2={xOf(course)} y1={TOP} y2={TOP + ROWS * FRET_GAP} />
		<text class="course" x={xOf(course)} y={height - 4} text-anchor="middle">{name}</text>

		<!-- Above the nut: open or muted -->
		<g
			class="tap"
			role="button"
			tabindex="0"
			aria-label="{name} course: {frets[course] === null
				? 'muted, tap to play it open'
				: 'tap to mute'}"
			onclick={() => set(course, frets[course] === null ? 0 : null)}
			onkeydown={(event) => event.key === 'Enter' && set(course, frets[course] === null ? 0 : null)}
			use:tooltip={TIPS.chopEditor.openOrMute}
		>
			<rect x={xOf(course) - STRING_GAP / 2} y="0" width={STRING_GAP} height={TOP - 6} />
			{#if frets[course] === null}
				<text class="mute" x={xOf(course)} y={TOP - 12} text-anchor="middle">×</text>
			{:else if frets[course] === 0}
				<circle
					class="open"
					class:outside={!inChord[course]}
					cx={xOf(course)}
					cy={TOP - 16}
					r="11"
				/>
				<text
					class="open-mark"
					class:outside={!inChord[course]}
					x={xOf(course)}
					y={TOP - 12}
					text-anchor="middle">{marks[course]}</text
				>
			{/if}
		</g>

		{#each rows as fret (fret)}
			{@const here = frets[course] === fret}
			<g
				class="tap"
				role="button"
				tabindex="0"
				aria-label="{name} course, fret {fret}{here ? ': tap to mute' : ''}"
				aria-pressed={here}
				onclick={() => set(course, here ? null : fret)}
				onkeydown={(event) => event.key === 'Enter' && set(course, here ? null : fret)}
			>
				<rect
					x={xOf(course) - STRING_GAP / 2}
					y={yOf(fret) - FRET_GAP / 2}
					width={STRING_GAP}
					height={FRET_GAP}
				/>
				{#if here}
					<circle
						class="dot"
						class:outside={!inChord[course]}
						cx={xOf(course)}
						cy={yOf(fret)}
						r={DOT}
					/>
					<text
						class="mark"
						class:outside={!inChord[course]}
						x={xOf(course)}
						y={yOf(fret) + 4.5}
						text-anchor="middle">{marks[course]}</text
					>
				{/if}
			</g>
		{/each}
	{/each}
</svg>

<style>
	.diagram {
		max-width: 100%;
		height: auto;
		user-select: none;
	}

	.nut {
		fill: var(--color-ink);
	}

	.fret {
		stroke: var(--color-ink-soft);
		stroke-width: 1.5;
	}

	.string {
		stroke: var(--color-ink);
		stroke-width: 1.5;
	}

	.course,
	.first-fret {
		fill: var(--color-ink-soft);
		font-size: 12px;
		font-weight: 700;
	}

	.tap {
		cursor: pointer;
		outline: none;
	}

	.tap rect {
		fill: transparent;
	}

	@media (hover: hover) {
		.tap:hover rect {
			fill: color-mix(in oklch, var(--color-accent) 12%, transparent);
		}
	}

	.tap:focus-visible rect {
		fill: color-mix(in oklch, var(--color-accent) 20%, transparent);
	}

	.dot {
		fill: var(--color-accent);
		stroke: var(--color-accent);
		stroke-width: 2;
	}

	.mark {
		fill: var(--color-surface);
		font-size: 11px;
		font-weight: 800;
	}

	.dot.outside,
	.open.outside {
		fill: var(--color-surface);
		stroke: var(--color-danger);
	}

	.mark.outside {
		fill: var(--color-danger);
	}

	.open {
		fill: var(--color-surface);
		stroke: var(--color-accent);
		stroke-width: 2;
	}

	.open-mark {
		fill: var(--color-accent);
		font-size: 11px;
		font-weight: 800;
	}

	.open-mark.outside {
		fill: var(--color-danger);
	}

	.mute {
		fill: var(--color-ink);
		font-size: 18px;
		font-weight: 700;
	}
</style>
