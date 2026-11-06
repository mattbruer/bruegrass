<script>
	/**
	 * A strip's EQ button: a tiny picture of its EQ curve (like Logic's EQ
	 * thumbnail on each channel strip). Tap it to open that strip's EQ.
	 */
	import { eqResponseDb } from '../../../playback/eq/eqResponse.js';
	import { curveFrequencies, xForFrequency, yForGain } from './eqGraphScale.js';
	import { eqStrip, eqWindow, openEq } from './eqWindowState.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** The thumbnail's curve is worked out at a typical sample rate (it's only a picture). */
	const THUMBNAIL_SAMPLE_RATE = 48000;
	/** The thumbnail's size, in its own drawing units (SVG viewBox). */
	const WIDTH = 64;
	const HEIGHT = 20;

	/** @type {{ stripId: string }} */
	let { stripId } = $props();

	let eq = $derived(eqStrip(stripId).eq);
	let isOpen = $derived(eqWindow.stripId === stripId);

	/** The curve as an SVG path, redrawn only when the EQ changes. */
	let curvePath = $derived.by(() => {
		const frequencies = curveFrequencies(WIDTH * 2);
		const response = eqResponseDb(eq, frequencies, THUMBNAIL_SAMPLE_RATE);
		return frequencies
			.map((hz, i) => {
				const x = xForFrequency(hz, WIDTH).toFixed(1);
				const y = Math.min(HEIGHT, yForGain(response[i], HEIGHT)).toFixed(1);
				return `${i === 0 ? 'M' : 'L'}${x},${y}`;
			})
			.join(' ');
	});
</script>

<button
	type="button"
	class="eq-button"
	class:open={isOpen}
	class:bypassed={!eq.enabled}
	aria-label="Open {eqStrip(stripId).name} EQ"
	aria-haspopup="dialog"
	aria-expanded={isOpen}
	onclick={() => openEq(stripId)}
	use:tooltip={TIPS.mixer.stripEq}
>
	<svg viewBox="0 0 {WIDTH} {HEIGHT}" preserveAspectRatio="none" aria-hidden="true">
		<line x1="0" y1={HEIGHT / 2} x2={WIDTH} y2={HEIGHT / 2} class="zero" />
		<path d={curvePath} />
	</svg>
	<span>EQ</span>
</button>

<style>
	.eq-button {
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		border-radius: var(--corner-small);
		background: var(--mixer-tray);
		padding: 0.25rem;
		box-shadow: var(--shadow-inset-small);
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--color-ink-soft);
	}

	.eq-button.open {
		color: var(--color-accent);
	}

	/* Only with a real hover: on a touch screen a tapped :hover sticks until the next tap */
	@media (hover: hover) {
		.eq-button:hover {
			color: var(--color-accent);
		}
	}

	svg {
		width: 100%;
		height: 1.25rem;
		overflow: visible;
	}

	path {
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 1.5;
		vector-effect: non-scaling-stroke;
	}

	.zero {
		stroke: var(--color-ink-faint);
		stroke-width: 0.5;
		vector-effect: non-scaling-stroke;
	}

	.bypassed path {
		stroke: var(--color-ink-faint);
	}
</style>
