<script>
	/**
	 * Mixer: a small brushed-aluminium console panel with three fader slots and
	 * their caps at different levels (the middle one with an amber line), each
	 * cap casting a shadow, and the panel's own shadow on the key.
	 */
	const id = $props.id();

	/** Each fader: its slot's centre, where its cap sits, and how it rides on hover (distance, seconds). */
	const FADERS = [
		{ x: 19, y: 37, line: '#fff', ride: -13, seconds: 1.3 },
		{ x: 32, y: 21, line: '#fbbf24', ride: 14, seconds: 1.7 },
		{ x: 45, y: 29, line: '#fff', ride: -8, seconds: 1.1 }
	];
	const TICKS = Array.from({ length: 9 }, (_, i) => 15 + i * 4.4);
</script>

<svg viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{id}-panel" x1="0" y1="0" x2="0.35" y2="1">
			<stop offset="0" stop-color="#f8fafc" />
			<stop offset="0.55" stop-color="#d5dde7" />
			<stop offset="1" stop-color="#8c99ab" />
		</linearGradient>
		<linearGradient id="{id}-cap" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#6b6b6b" />
			<stop offset="0.45" stop-color="#2a2a2a" />
			<stop offset="1" stop-color="#0d0d0d" />
		</linearGradient>
		<filter id="{id}-blur" x="-30%" y="-30%" width="160%" height="160%">
			<feGaussianBlur stdDeviation="2" />
		</filter>
		<filter id="{id}-soft" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur stdDeviation="0.9" />
		</filter>
		<clipPath id="{id}-shape"><rect x="7" y="6" width="50" height="52" rx="7" /></clipPath>
	</defs>

	<rect
		x="8.5"
		y="10"
		width="50"
		height="52"
		rx="7"
		fill="#000"
		opacity="0.3"
		filter="url(#{id}-blur)"
	/>
	<rect x="7" y="6" width="50" height="52" rx="7" fill="url(#{id}-panel)" />
	<g clip-path="url(#{id}-shape)" fill="none">
		{#each Array.from({ length: 12 }, (_, i) => 9 + i * 4.2) as y (y)}
			<path d="M7 {y}H57" stroke="#fff" stroke-opacity="0.22" stroke-width="0.4" />
		{/each}
		<path
			d="M7 51V13Q7 6 14 6H50Q57 6 57 13"
			stroke="#fff"
			stroke-opacity="0.85"
			stroke-width="2.4"
		/>
		<path
			d="M57 13V51Q57 58 50 58H14Q7 58 7 51"
			stroke="#475569"
			stroke-opacity="0.55"
			stroke-width="2.4"
		/>
	</g>

	{#each FADERS as fader (fader.x)}
		<g stroke="#64748b" stroke-opacity="0.7" stroke-width="0.5">
			{#each TICKS as y (y)}
				<path d="M{fader.x - 5.2} {y}h1.6" />
			{/each}
		</g>
		<rect x={fader.x - 1.6} y="12" width="3.2" height="40" rx="1.6" fill="#0f172a" />
		<path d="M{fader.x + 1.4} 13.5v37" stroke="#fff" stroke-opacity="0.35" stroke-width="0.5" />
		<g class="cap" style:--ride="{fader.ride}px" style:animation-duration="{fader.seconds}s">
			<rect
				x={fader.x - 6}
				y={fader.y - 2.4}
				width="12"
				height="8"
				rx="1.8"
				fill="#000"
				opacity="0.5"
				filter="url(#{id}-soft)"
			/>
			<rect x={fader.x - 6} y={fader.y - 4} width="12" height="8" rx="1.8" fill="url(#{id}-cap)" />
			<path
				d="M{fader.x - 4.8} {fader.y - 3.2}h9.6"
				stroke="#fff"
				stroke-opacity="0.4"
				stroke-width="0.6"
				stroke-linecap="round"
			/>
			<rect x={fader.x - 5} y={fader.y - 0.45} width="10" height="0.9" fill={fader.line} />
		</g>
	{/each}
</svg>

<style>
	/* When the key is hovered or tapped (animateKeys.js; not for reduced motion): the faders ride up and down, each its own way */
	@media (prefers-reduced-motion: no-preference) {
		:global(.bar-tile[data-animate]) .cap {
			animation-name: ride;
			animation-timing-function: ease-in-out;
			animation-iteration-count: infinite;
		}
	}

	@keyframes ride {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(var(--ride, -10px));
		}
	}
</style>
