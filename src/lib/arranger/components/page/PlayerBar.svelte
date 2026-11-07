<script>
	/**
	 * The bar fixed to the bottom of the screen, the same on phone and
	 * desktop: a few big keys, each a picture (its name is in the tooltip and
	 * for screen readers). Which tiles it shows is in playerBarTiles.js; how
	 * they look is here, in one place (the --tile-* variables and the raised
	 * key style). Each picture moves on hover, or once on a tap (animateKeys.js).
	 * It steps aside while the phone keypad is up.
	 */
	import { useArranger } from '../../state/context.js';
	import { PLAYER_BAR_TILES } from './playerBarTiles.js';
	import { animateKeys } from './animateKeys.js';

	const { layout } = useArranger();
</script>

<div class="bar" class:hidden-by-keypad={layout.keypadVisible} bind:offsetHeight={layout.barHeight}>
	<div class="bar-content mx-auto max-w-5xl px-3 sm:px-8" use:animateKeys>
		{#each PLAYER_BAR_TILES.start as Tile, i (i)}
			<Tile />
		{/each}
		<div class="end">
			{#each PLAYER_BAR_TILES.end as Tile, i (i)}
				<Tile />
			{/each}
		</div>
	</div>
</div>

<style>
	/* The faceplate the keys stand in: lit along its top edge, darkening towards the bottom */
	.bar {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 25; /* over a drawer sliding down behind it */
		background:
			linear-gradient(
				to bottom,
				oklch(from var(--player-bar) calc(l + 0.06) c h),
				var(--player-bar) 35%,
				oklch(from var(--player-bar) calc(l - 0.07) c h)
			),
			var(--player-bar); /* solid underneath: the theme's shadow colours are partly see-through */
		border-top: 1px solid var(--shadow-light-edge);
		padding-bottom: env(safe-area-inset-bottom, 0px);
		box-shadow:
			inset 0 1px 0 var(--shadow-light-edge),
			0 -4px 14px var(--shadow-dark-edge);
	}

	.hidden-by-keypad {
		visibility: hidden;
	}

	.bar-content {
		--tile-height: 5rem;
		--tile-width: 5.5rem;
		--tile-art: 4rem; /* every tile is a picture this tall */
		--key-depth: 9px; /* how far a key stands up off the bar: its side wall */

		/* A key's colours, all from the theme (solid, by lightness): a convex face lit from above, a side wall in shade */
		--key-face-top: oklch(from var(--color-raised) calc(l + 0.05) c h);
		--key-face-bottom: oklch(from var(--color-raised) calc(l - 0.07) c h);
		--key-edge: oklch(from var(--color-raised) calc(l - 0.2) c h);
		--key-side-1: oklch(from var(--color-raised) calc(l - 0.12) c h);
		--key-side-2: oklch(from var(--color-raised) calc(l - 0.17) c h);
		--key-side-3: oklch(from var(--color-raised) calc(l - 0.22) c h);
		--key-side-4: oklch(from var(--color-raised) calc(l - 0.28) c h);

		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding-block: 0.6rem calc(0.6rem + var(--key-depth));
	}

	.end {
		display: flex;
		gap: 0.85rem;
		margin-left: auto;
	}

	/*
	 * A key, like an old telephone's: a glossy convex face, bevelled edges,
	 * a thick side wall that darkens towards the bar (stacked shadows, one per
	 * quarter of its depth), then its shadow on the bar, close and soft.
	 */
	.bar-content :global(.bar-tile) {
		position: relative;
		height: var(--tile-height);
		min-width: var(--tile-width);
		padding: 0.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--corner-card);
		border: 1px solid var(--key-edge);
		background:
			radial-gradient(
				120% 65% at 50% 0%,
				color-mix(in oklab, var(--shadow-light-edge), transparent 15%),
				transparent 70%
			),
			linear-gradient(
				to bottom,
				var(--key-face-top),
				var(--color-raised) 50%,
				var(--key-face-bottom)
			),
			var(--color-raised);
		box-shadow:
			inset 0 2px 1px var(--shadow-light-edge),
			inset 2px 0 3px color-mix(in oklab, var(--shadow-light-edge), transparent 40%),
			inset -2px 0 3px color-mix(in oklab, var(--shadow-dark-edge), transparent 70%),
			inset 0 -5px 7px color-mix(in oklab, var(--shadow-dark-edge), transparent 55%),
			0 calc(var(--key-depth) * 0.25) 0 var(--key-side-1),
			0 calc(var(--key-depth) * 0.5) 0 var(--key-side-2),
			0 calc(var(--key-depth) * 0.75) 0 var(--key-side-3),
			0 var(--key-depth) 0 var(--key-side-4),
			0 calc(var(--key-depth) + 3px) 5px var(--shadow-dark-edge),
			0 calc(var(--key-depth) + 12px) 22px
				color-mix(in oklab, var(--shadow-dark-edge), transparent 35%);
		transform: translateY(0);
		transition:
			transform 0.07s ease,
			box-shadow 0.07s ease;
	}

	/* Pressed, or on (playing, clicking, its drawer open): the key sinks almost flush with the bar */
	.bar-content :global(.bar-tile:active),
	.bar-content :global(.bar-tile.ui-button-on) {
		transform: translateY(calc(var(--key-depth) - 2px));
		box-shadow:
			inset 0 3px 8px var(--shadow-dark-edge),
			inset 0 -1px 0 var(--shadow-light-edge),
			0 2px 0 var(--key-side-4),
			0 3px 4px var(--shadow-dark-edge);
	}

	/* On: the face glows with the accent */
	.bar-content :global(.bar-tile.ui-button-on) {
		border-color: var(--color-accent);
		background:
			radial-gradient(
				120% 70% at 50% 0%,
				color-mix(in oklab, var(--color-accent) 30%, transparent),
				transparent 75%
			),
			linear-gradient(
				to bottom,
				color-mix(in oklab, var(--color-accent) 22%, var(--color-raised)),
				color-mix(in oklab, var(--color-accent) 10%, var(--key-face-bottom))
			),
			var(--color-raised);
	}

	.bar-content :global(.bar-tile svg) {
		display: block;
		height: var(--tile-art);
		width: auto;
	}

	/* Names are for the tooltip and screen readers; the picture says it */
	.bar-content :global(.tile-label) {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	/* Phones upright: narrower keys, still big to tap */
	@media (max-width: 639px) {
		.bar-content {
			--tile-height: 4.25rem;
			--tile-width: 4.5rem;
			--tile-art: 3.4rem;
			gap: 0.5rem;
		}

		.end {
			gap: 0.5rem;
		}
	}

	/* A phone on its side: a slim bar (43px), so the mixer above it still fits without scrolling (measured at 812×375) */
	@media (max-height: 600px) {
		.bar-content {
			--tile-height: 2.1rem;
			--tile-width: 3.25rem;
			--tile-art: 1.8rem;
			--key-depth: 2px;
			padding-block: 0.2rem calc(0.2rem + var(--key-depth));
		}

		.bar-content :global(.bar-tile) {
			padding: 0.1rem;
		}
	}
</style>
