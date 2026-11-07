<script>
	/**
	 * Edit: a yellow wooden pencil lying at an angle, drawn like the real one:
	 * three painted faces, a sharpened wood cone with a graphite point, a
	 * ridged metal ferrule, a pink eraser, and its shadow on the key.
	 */
	const id = $props.id();

	/* Drawn lying flat (point on the left), then tilted so the point is at the bottom left */
	const TILT = 'rotate(-38 32 32)';
	const OUTLINE = 'M4 32 17 26H58Q60 26 60 28V36Q60 38 58 38H17Z';
</script>

<svg viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{id}-wood" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#f8e2bd" />
			<stop offset="0.5" stop-color="#e0b47d" />
			<stop offset="1" stop-color="#a87443" />
		</linearGradient>
		<linearGradient id="{id}-lead" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#9ca3af" />
			<stop offset="1" stop-color="#111827" />
		</linearGradient>
		<linearGradient id="{id}-top" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fff3b0" />
			<stop offset="1" stop-color="#fcd34d" />
		</linearGradient>
		<linearGradient id="{id}-middle" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fbbf24" />
			<stop offset="1" stop-color="#eaa308" />
		</linearGradient>
		<linearGradient id="{id}-bottom" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#c98a06" />
			<stop offset="1" stop-color="#8a5a04" />
		</linearGradient>
		<linearGradient id="{id}-ferrule" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#f8fafc" />
			<stop offset="0.3" stop-color="#cbd5e1" />
			<stop offset="0.55" stop-color="#8b97a8" />
			<stop offset="0.72" stop-color="#e2e8f0" />
			<stop offset="1" stop-color="#5b6678" />
		</linearGradient>
		<linearGradient id="{id}-eraser" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fecdd3" />
			<stop offset="0.5" stop-color="#fb7185" />
			<stop offset="1" stop-color="#b3123b" />
		</linearGradient>
		<filter id="{id}-blur" x="-30%" y="-30%" width="160%" height="160%">
			<feGaussianBlur stdDeviation="2" />
		</filter>
	</defs>

	<!-- The loop the pencil draws on hover (its point starts at 9.9, 49.2) -->
	<path
		class="scribble"
		d="M9.9 49.2Q15.5 47.5 15.9 43Q15.9 40.5 12.5 41Q9 42 10.5 45.5Q12.5 49 19.9 47.2"
		pathLength="1"
		fill="none"
		stroke="#374151"
		stroke-width="1.3"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>

	<g class="pencil">
		<g transform="translate(1.5 4)">
			<path d={OUTLINE} transform={TILT} fill="#000" opacity="0.3" filter="url(#{id}-blur)" />
		</g>

		<g transform={TILT}>
			<!-- Sharpened wood and its graphite point -->
			<path d="M4 32 17 26V38Z" fill="url(#{id}-wood)" />
			<path d="M4 32 9.4 29.5V34.5Z" fill="url(#{id}-lead)" />
			<path
				d="M5 31.6 9 29.8"
				stroke="#fff"
				stroke-opacity="0.45"
				stroke-width="0.5"
				stroke-linecap="round"
			/>

			<!-- Three painted faces, scalloped where the sharpener cut them -->
			<path d="M17 26H45V30H17Q15.2 28 17 26Z" fill="url(#{id}-top)" />
			<path d="M17 30H45V34H17Q15.2 32 17 30Z" fill="url(#{id}-middle)" />
			<path d="M17 34H45V38H17Q15.2 36 17 34Z" fill="url(#{id}-bottom)" />
			<path d="M16.6 30H45M16.6 34H45" stroke="#9a6a05" stroke-opacity="0.55" stroke-width="0.45" />
			<path
				d="M18 27.1H44.5"
				stroke="#fff"
				stroke-opacity="0.6"
				stroke-width="0.7"
				stroke-linecap="round"
			/>
			<rect x="25" y="31.3" width="10" height="1.4" rx="0.5" fill="#14532d" opacity="0.55" />

			<!-- Ridged metal ferrule -->
			<rect x="45" y="25.4" width="7.4" height="13.2" rx="0.8" fill="url(#{id}-ferrule)" />
			<path
				d="M46.9 25.6v12.8M48.7 25.6v12.8M50.5 25.6v12.8"
				stroke="#3f4a5c"
				stroke-opacity="0.45"
				stroke-width="0.6"
			/>
			<path
				d="M47.4 25.6v12.8M49.2 25.6v12.8M51 25.6v12.8"
				stroke="#fff"
				stroke-opacity="0.5"
				stroke-width="0.4"
			/>

			<!-- Eraser -->
			<path d="M52.4 26H57.6Q60 26 60 28.4V35.6Q60 38 57.6 38H52.4Z" fill="url(#{id}-eraser)" />
			<path
				d="M53.4 27.2H57.4"
				stroke="#fff"
				stroke-opacity="0.55"
				stroke-width="0.7"
				stroke-linecap="round"
			/>
		</g>
	</g>
</svg>

<style>
	.scribble {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
	}

	/* When the key is hovered or tapped (animateKeys.js; not for reduced motion): the point traces the loop as it draws */
	@media (prefers-reduced-motion: no-preference) {
		:global(.bar-tile[data-animate]) .pencil {
			animation: trace 2s linear infinite;
		}

		:global(.bar-tile[data-animate]) .scribble {
			animation: draw 2s linear infinite;
		}
	}

	@keyframes trace {
		0% {
			transform: translate(0, 0);
		}
		22% {
			transform: translate(6px, -6.2px);
		}
		31.5% {
			transform: translate(2.6px, -8.2px);
		}
		45% {
			transform: translate(0.6px, -3.7px);
		}
		70%,
		85% {
			transform: translate(10px, -2px);
		}
		100% {
			transform: translate(0, 0);
		}
	}

	@keyframes draw {
		0% {
			stroke-dashoffset: 1;
			opacity: 1;
		}
		70%,
		85% {
			stroke-dashoffset: 0;
			opacity: 1;
		}
		100% {
			stroke-dashoffset: 0;
			opacity: 0;
		}
	}
</style>
