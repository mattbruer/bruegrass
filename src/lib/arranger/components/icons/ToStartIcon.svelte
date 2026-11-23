<script>
	/**
	 * Back to the start: Play's cast amber turned round, against a bar, lit
	 * from the upper left like Play. Hovered or tapped, the arrow slides back
	 * to the bar.
	 */
	const id = $props.id();

	/** A triangle with rounded corners, pointing left. */
	const TRIANGLE = 'M51 15V49Q51 54 46.7 51.4L25.3 34.6Q21 32 25.3 29.4L46.7 12.6Q51 10 51 15Z';
	const BAR = 'M11 14Q11 11 14 11H16Q19 11 19 14V50Q19 53 16 53H14Q11 53 11 50Z';
</script>

<svg viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{id}-body" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#fde68a" />
			<stop offset="0.35" stop-color="#f59e0b" />
			<stop offset="1" stop-color="#9a3d07" />
		</linearGradient>
		<filter id="{id}-blur" x="-30%" y="-30%" width="160%" height="160%">
			<feGaussianBlur stdDeviation="2.2" />
		</filter>
	</defs>

	{#each [BAR, TRIANGLE] as shape, i (i)}
		<g class:arrow={shape === TRIANGLE}>
			<path
				d={shape}
				transform="translate(1.5 4)"
				fill="#000"
				opacity="0.32"
				filter="url(#{id}-blur)"
			/>
			<path d={shape} fill="url(#{id}-body)" />
			<path d={shape} fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="1.5" />
		</g>
	{/each}
</svg>

<style>
	/* When the key is hovered or tapped (animateKeys.js; not for reduced motion) */
	@media (prefers-reduced-motion: no-preference) {
		:global([data-animate]) .arrow {
			animation: slide-back 1.2s ease-in-out infinite;
		}
	}

	@keyframes slide-back {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(-4px);
		}
	}
</style>
