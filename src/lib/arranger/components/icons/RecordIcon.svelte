<script>
	/**
	 * Record: a glossy red button set in a dark chrome ring, like a tape
	 * machine's. It glows while hovered (or once on a tap), and blinks while
	 * recording.
	 */
	/** @type {{ recording?: boolean }} */
	let { recording = false } = $props();

	const id = $props.id();
</script>

<svg viewBox="0 0 64 64" aria-hidden="true" class:recording>
	<defs>
		<linearGradient id="{id}-ring" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#e5e7eb" />
			<stop offset="0.5" stop-color="#6b7280" />
			<stop offset="1" stop-color="#1f2937" />
		</linearGradient>
		<radialGradient id="{id}-body" cx="0.4" cy="0.35" r="0.75">
			<stop offset="0" stop-color="#fca5a5" />
			<stop offset="0.45" stop-color="#dc2626" />
			<stop offset="1" stop-color="#7f1d1d" />
		</radialGradient>
		<radialGradient id="{id}-glow" cx="0.5" cy="0.5" r="0.5">
			<stop offset="0.55" stop-color="#ef4444" stop-opacity="0.7" />
			<stop offset="1" stop-color="#ef4444" stop-opacity="0" />
		</radialGradient>
		<linearGradient id="{id}-gloss" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fff" stop-opacity="0.75" />
			<stop offset="1" stop-color="#fff" stop-opacity="0" />
		</linearGradient>
		<filter id="{id}-blur" x="-30%" y="-30%" width="160%" height="160%">
			<feGaussianBlur stdDeviation="2.2" />
		</filter>
	</defs>

	<circle cx="33.5" cy="36" r="22" fill="#000" opacity="0.3" filter="url(#{id}-blur)" />
	<circle class="glow" cx="32" cy="32" r="30" fill="url(#{id}-glow)" />
	<circle cx="32" cy="32" r="22" fill="url(#{id}-ring)" />
	<circle cx="32" cy="32" r="18.5" fill="#111827" />
	<circle class="light" cx="32" cy="32" r="16" fill="url(#{id}-body)" />
	<ellipse cx="32" cy="24.5" rx="10" ry="6" fill="url(#{id}-gloss)" />
	<ellipse
		cx="26"
		cy="22.5"
		rx="2.4"
		ry="1.3"
		fill="#fff"
		opacity="0.8"
		transform="rotate(-25 26 22.5)"
	/>
</svg>

<style>
	.glow {
		opacity: 0;
	}

	.recording .glow {
		opacity: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(.bar-tile[data-animate]) .glow {
			animation: glow 1.2s ease-in-out infinite;
		}

		.recording .glow,
		.recording .light {
			animation: blink 1s steps(1) infinite;
		}
	}

	@keyframes glow {
		50% {
			opacity: 1;
		}
	}

	@keyframes blink {
		50% {
			opacity: 0.35;
		}
	}
</style>
