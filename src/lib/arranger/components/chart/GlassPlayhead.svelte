<script>
	/**
	 * The playhead: a red-tinted slip of glass floating just above the music,
	 * casting its shadow on the paper, with a red hairline at the exact spot.
	 * The music shows through it as it scrolls by.
	 */

	/** @type {{ x: number }} x is the hairline's distance from the left, in px */
	let { x } = $props();
</script>

<div class="glass" style:left="{x}px" aria-hidden="true"></div>

<style>
	.glass {
		--width: 22px;
		--tint: 225 35 35;

		position: absolute;
		top: -7px;
		bottom: -7px;
		z-index: 2;
		width: var(--width);
		margin-left: calc(var(--width) / -2);
		border-radius: 6px;
		pointer-events: none;
		background: linear-gradient(
			90deg,
			rgb(var(--tint) / 0.14),
			rgb(var(--tint) / 0.3) 50%,
			rgb(var(--tint) / 0.14)
		);
		/* Edges, then it floats: a soft shadow well off to the side, and a sharper one close in */
		box-shadow:
			inset 0 0 0 1px rgb(255 255 255 / 0.6),
			0 0 0 1px rgb(110 0 0 / 0.35),
			9px 11px 12px rgb(0 0 0 / 0.28),
			2px 3px 3px rgb(0 0 0 / 0.2);
		backdrop-filter: saturate(1.35) brightness(1.04);
	}

	/* The highlight down the glass's edge */
	.glass::before {
		content: '';
		position: absolute;
		top: 5px;
		bottom: 5px;
		left: 3px;
		width: 4px;
		border-radius: 2px;
		background: linear-gradient(
			180deg,
			rgb(255 255 255 / 0.9),
			rgb(255 255 255 / 0.12) 55%,
			rgb(255 255 255 / 0.45)
		);
	}

	/* The hairline: where the band is, exactly */
	.glass::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 2px;
		transform: translateX(-50%);
		background: rgb(205 20 20 / 0.9);
		box-shadow: 0 0 5px rgb(255 40 40 / 0.55);
	}
</style>
