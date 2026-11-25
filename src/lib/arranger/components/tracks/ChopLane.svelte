<script>
	/**
	 * The mandolin's lane on the Tracks page: each chord as a chip as wide as
	 * it lasts, marked when its chop is yours. Tap one to see it and change it (`onPick`, with where
	 * it starts). The chords themselves are typed on the guitar's lane.
	 */
	import { writeFrets } from '../../voicings/typedFrets.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   chops: import('../../state/MandolinState.svelte.js').ChopInSong[],
	 *   picked: number | null,
	 *   onPick: (start: number) => void,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 *   picked: where the chop open in the editor starts (null: none open)
	 */
	let { chops, picked, onPick, scale } = $props();
</script>

<div class="lane">
	{#each chops as chop (chop.start)}
		{@const width = scale.toX(chop.start + chop.length) - scale.toX(chop.start) - 4}
		<button
			type="button"
			class="chip"
			class:edited={chop.edited}
			class:picked={picked === chop.start}
			style:left="{scale.toX(chop.start) + 2}px"
			style:width="{width}px"
			aria-label="{chop.name} in bar {chop.bar}: chop {writeFrets(chop.chop.frets)}{chop.edited
				? ', yours'
				: ''}"
			onclick={() => onPick(chop.start)}
			use:tooltip={TIPS.tracks.chop}
		>
			<span class="name">{chop.name}</span>
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

	.chip.picked {
		background: color-mix(in oklab, var(--color-accent) 16%, var(--color-raised));
		box-shadow: var(--shadow-sunk);
	}
</style>
