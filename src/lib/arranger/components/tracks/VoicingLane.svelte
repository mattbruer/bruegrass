<script>
	/**
	 * An instrument's lane of chords on the Tracks page (the guitar's, the
	 * mandolin's): each chord as a chip as wide as it lasts, outlined when
	 * you've changed how it's played. Tap one to see and change it there
	 * (`onPick`, with where it starts). The chords themselves are typed on
	 * the Band lane.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';

	/**
	 * @type {{
	 *   chords: { start: number, length: number, bar: number, name: string, edited: boolean, fill?: string | null }[],
	 *   picked: number | null,
	 *   onPick: (start: number) => void,
	 *   tip: string,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 *   picked: where the chord open in the editor starts (null: none open);
	 *   fill: a part plays a fill there instead (the instrument rests)
	 */
	let { chords, picked, onPick, tip, scale } = $props();
</script>

<div class="lane">
	{#each chords as chord (chord.start)}
		<button
			type="button"
			class="chip"
			class:edited={chord.edited}
			class:fill={chord.fill}
			class:picked={picked === chord.start}
			style:left="{scale.toX(chord.start) + 2}px"
			style:width="{scale.toX(chord.start + chord.length) - scale.toX(chord.start) - 4}px"
			aria-label="{chord.name} in bar {chord.bar}{chord.fill
				? ', a fill'
				: chord.edited
					? ', changed by you'
					: ''}"
			onclick={() => onPick(chord.start)}
			use:tooltip={tip}
		>
			<span class="name">{chord.name}</span>
			{#if chord.fill}<span class="tag">fill</span>{/if}
		</button>
	{/each}
</div>

<style>
	.lane {
		position: relative;
		min-height: var(--lane-height);
		border-bottom: var(--lane-divider, 1px solid var(--color-line));
	}

	.chip {
		position: absolute;
		top: 0.35rem;
		bottom: 0.35rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0.35rem;
		overflow: hidden;
		white-space: nowrap;
		font-size: 0.8rem;
		border: 1px solid var(--color-line);
		border-radius: var(--corner-small);
		background: var(--color-raised);
		cursor: pointer;
	}

	@media (hover: hover) {
		.chip:hover {
			border-color: var(--color-accent);
		}
	}

	.chip:focus-visible {
		outline: 2px solid var(--color-accent);
	}

	.name {
		font-weight: 700;
	}

	.chip.edited {
		border-color: var(--color-accent);
		border-width: 2px;
	}

	.chip.fill {
		border-style: dashed;
	}

	.tag {
		margin-left: 0.4rem;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.chip.picked {
		background: color-mix(in oklab, var(--color-accent) 16%, var(--color-raised));
		box-shadow: var(--shadow-sunk);
	}
</style>
