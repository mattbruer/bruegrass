<script module>
	/** Where the rod rests when the metronome is off (degrees; negative leans left). */
	export const PENDULUM_REST_DEGREES = -14;

	/** The rod's pivot, in the drawing's own units. */
	const PIVOT = { x: 30, y: 60 };

	/**
	 * Lean the pendulum (the element bound as `pendulum`) to an angle. Called
	 * every frame while it swings, so it writes the attribute directly.
	 * @param {SVGGElement | undefined} pendulum
	 * @param {number} degrees
	 */
	export function tiltPendulum(pendulum, degrees) {
		pendulum?.setAttribute('transform', `rotate(${degrees} ${PIVOT.x} ${PIVOT.y})`);
	}
</script>

<script>
	/**
	 * A wooden pyramid metronome, drawn like the real thing: a mahogany case
	 * with grain, an ivory tempo scale in its well, a steel rod with a brass
	 * weight, a winding key, and a walnut plinth with a soft shadow under it.
	 *
	 * The weight sits higher for slower tempos, as on a real metronome. The
	 * rod's angle is set from outside (tiltPendulum), so it can swing on the beat.
	 */
	import { TEMPO_MAX, TEMPO_MIN } from '../../chart/tempo.js';

	/** @type {{ tempo?: number, pendulum?: SVGGElement }} */
	let { tempo = 120, pendulum = $bindable() } = $props();

	const id = $props.id();

	/* The weight's centre on the rod: high (slow) to low (fast) */
	const WEIGHT_SLOW_Y = 22;
	const WEIGHT_FAST_Y = 46;

	const weightY = $derived.by(() => {
		const share = (tempo - TEMPO_MIN) / (TEMPO_MAX - TEMPO_MIN);
		const clamped = Math.min(1, Math.max(0, share));
		return WEIGHT_SLOW_Y + clamped * (WEIGHT_FAST_Y - WEIGHT_SLOW_Y);
	});

	/* The scale plate's ticks: the plate narrows towards the top, and every other tick is long */
	const PLATE = { top: 17.5, bottom: 53, topHalf: 1.5, bottomHalf: 3.4 };
	const TICKS = Array.from({ length: 14 }, (_, i) => {
		const y = PLATE.top + 1.6 + i * 2.45;
		const share = (y - PLATE.top) / (PLATE.bottom - PLATE.top);
		const half = PLATE.topHalf + share * (PLATE.bottomHalf - PLATE.topHalf);
		const left = 30 - half + 0.35;
		return { y, x1: left, x2: left + (i % 2 ? 1.1 : half * 1.25) };
	});
</script>

<svg viewBox="0 0 60 80" aria-hidden="true">
	<defs>
		<linearGradient id="{id}-front" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#d08a55" />
			<stop offset="0.32" stop-color="#ad602d" />
			<stop offset="0.72" stop-color="#87431b" />
			<stop offset="1" stop-color="#6b3212" />
		</linearGradient>
		<linearGradient id="{id}-shade" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fff" stop-opacity="0.14" />
			<stop offset="0.5" stop-color="#fff" stop-opacity="0" />
			<stop offset="1" stop-color="#000" stop-opacity="0.22" />
		</linearGradient>
		<linearGradient id="{id}-side" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#5a280c" />
			<stop offset="1" stop-color="#2a1004" />
		</linearGradient>
		<linearGradient id="{id}-well" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#120702" />
			<stop offset="1" stop-color="#341707" />
		</linearGradient>
		<linearGradient id="{id}-plate" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#e3d3ae" />
			<stop offset="0.4" stop-color="#fbf5e4" />
			<stop offset="1" stop-color="#cfbb8e" />
		</linearGradient>
		<linearGradient id="{id}-steel" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#596067" />
			<stop offset="0.45" stop-color="#f5f7f9" />
			<stop offset="0.6" stop-color="#d9dee3" />
			<stop offset="1" stop-color="#737a82" />
		</linearGradient>
		<linearGradient id="{id}-brass" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#7a4c0e" />
			<stop offset="0.28" stop-color="#f8e08e" />
			<stop offset="0.52" stop-color="#e0b04a" />
			<stop offset="1" stop-color="#83540f" />
		</linearGradient>
		<radialGradient id="{id}-hub" cx="0.38" cy="0.35" r="0.7">
			<stop offset="0" stop-color="#fff6cf" />
			<stop offset="0.5" stop-color="#dcaa44" />
			<stop offset="1" stop-color="#714709" />
		</radialGradient>
		<linearGradient id="{id}-plinth" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#6b3b18" />
			<stop offset="1" stop-color="#341906" />
		</linearGradient>
		<linearGradient id="{id}-bevel" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#c68c57" />
			<stop offset="1" stop-color="#8b562a" />
		</linearGradient>
		<radialGradient id="{id}-ground" cx="0.5" cy="0.5" r="0.5">
			<stop offset="0" stop-color="#000" stop-opacity="0.45" />
			<stop offset="1" stop-color="#000" stop-opacity="0" />
		</radialGradient>
		<clipPath id="{id}-face">
			<path d="M13 64.2 26.4 9.6h7.2L47 64.2z" />
		</clipPath>
	</defs>

	<!-- Shadow on the table -->
	<ellipse cx="30" cy="76.4" rx="28" ry="3.2" fill="url(#{id}-ground)" />

	<!-- Plinth -->
	<rect x="5.5" y="66.8" width="49" height="8.8" rx="1.8" fill="url(#{id}-plinth)" />
	<path d="M7.2 67.6h45.6" stroke="#fff" stroke-opacity="0.28" stroke-width="0.5" />
	<path d="M7 67.2h46l-2.8-3H9.8z" fill="url(#{id}-bevel)" />

	<!-- Case: the right side in shadow, then the lit front -->
	<path d="M47 64.2 33.6 9.6l1.1 1 15.2 53.6z" fill="url(#{id}-side)" />
	<path d="M13 64.2 26.4 9.6h7.2L47 64.2z" fill="url(#{id}-front)" />
	<g
		clip-path="url(#{id}-face)"
		fill="none"
		stroke="#3a1606"
		stroke-opacity="0.2"
		stroke-width="0.45"
	>
		<path d="M18 63c3-14 6-31 9.6-52" />
		<path d="M22.8 63c2.2-13 4.2-30 6.4-50" />
		<path d="M38.2 63c-2.4-14-4.2-31-6.6-51" />
		<path d="M42.6 63c-3-14-6-32-9.8-52" />
		<path d="M15.6 50c1.6-2.4 3.4-2.6 4.6-.4" stroke-opacity="0.14" />
	</g>
	<path d="M13 64.2 26.4 9.6h7.2L47 64.2z" fill="url(#{id}-shade)" />
	<path
		d="M13.7 63.6 26.9 10.3"
		stroke="#fff"
		stroke-opacity="0.38"
		stroke-width="0.7"
		stroke-linecap="round"
	/>
	<path
		d="M46.3 63.6 33.1 10.3"
		stroke="#000"
		stroke-opacity="0.28"
		stroke-width="0.6"
		stroke-linecap="round"
	/>

	<!-- The point, and its brass finial -->
	<path d="M26.4 9.6h7.2L30 3.8z" fill="url(#{id}-front)" />
	<path d="M30 3.8 33.6 9.6l1.1 1z" fill="url(#{id}-side)" />
	<path
		d="M26.9 9.3 29.8 4.4"
		stroke="#fff"
		stroke-opacity="0.32"
		stroke-width="0.5"
		stroke-linecap="round"
	/>
	<circle cx="30" cy="3.4" r="1.75" fill="url(#{id}-hub)" />

	<!-- Winding key, on the shaded side -->
	<rect x="45.6" y="51.5" width="5.8" height="1.2" rx="0.4" fill="url(#{id}-brass)" />
	<ellipse cx="52.4" cy="52.1" rx="1.5" ry="3.1" fill="url(#{id}-hub)" />

	<!-- The well, with its ivory tempo scale -->
	<path d="M21.6 58.6h16.8L32.3 15h-4.6z" fill="url(#{id}-well)" />
	<path d="M21.9 58.4 27.9 15.3" stroke="#000" stroke-opacity="0.5" stroke-width="0.8" />
	<path d="M21.8 58.9h16.4" stroke="#fff" stroke-opacity="0.2" stroke-width="0.5" />
	<path d="M26.6 53h6.8l-1.9-35.5h-3z" fill="url(#{id}-plate)" />
	<g stroke="#6b4626" stroke-width="0.35" stroke-linecap="round">
		{#each TICKS as tick (tick.y)}
			<line x1={tick.x1} y1={tick.y} x2={tick.x2} y2={tick.y} />
		{/each}
	</g>

	<!-- The pendulum: steel rod, brass weight (it swings about the hub) -->
	<g class="pendulum" bind:this={pendulum} transform="rotate({PENDULUM_REST_DEGREES} 30 60)">
		<rect x="29.45" y="10.5" width="1.1" height="50" rx="0.55" fill="url(#{id}-steel)" />
		<circle cx="30" cy="10.6" r="1" fill="url(#{id}-steel)" />
		<g transform="translate(0 {weightY})">
			<path
				d="M27.7-3.3h4.6l1.1 6.6h-6.8z"
				fill="url(#{id}-brass)"
				stroke="#6f450c"
				stroke-width="0.3"
				stroke-linejoin="round"
			/>
			<rect x="26.9" y="-0.55" width="6.2" height="1.1" fill="#000" fill-opacity="0.2" />
			<path
				d="M28.4-2.6v5.2"
				stroke="#fff"
				stroke-opacity="0.6"
				stroke-width="0.5"
				stroke-linecap="round"
			/>
			<circle cx="30" cy="0" r="0.55" fill="#5e3a08" />
		</g>
	</g>
	<circle cx="30" cy="60" r="2.5" fill="url(#{id}-hub)" />
	<circle cx="30" cy="60" r="0.6" fill="#4d2f06" />
</svg>

<style>
	/*
	 * When the key is hovered or tapped (animateKeys.js; not for reduced motion), while
	 * the click is off: the pendulum swings at the tempo, one end per beat
	 * (--beat, set by the tile). While the click plays, it swings on the
	 * click itself instead (tiltPendulum).
	 */
	@media (prefers-reduced-motion: no-preference) {
		:global(.bar-tile[data-animate]:not(.ui-button-on)) .pendulum {
			transform-box: view-box;
			transform-origin: 30px 60px;
			animation: swing var(--beat, 0.5s) ease-in-out infinite alternate;
		}
	}

	@keyframes swing {
		from {
			transform: rotate(-24deg);
		}
		to {
			transform: rotate(24deg);
		}
	}
</style>
