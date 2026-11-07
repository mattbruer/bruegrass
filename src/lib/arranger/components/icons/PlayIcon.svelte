<script>
	/**
	 * Play: a cast amber triangle standing off the key, with bevelled edges
	 * lit from the upper left, a gloss across its top, and a soft shadow.
	 */
	const id = $props.id();

	/** A triangle with rounded corners, pointing right. */
	const TRIANGLE = 'M17 15V49Q17 54 21.3 51.4L48.7 34.6Q53 32 48.7 29.4L21.3 12.6Q17 10 17 15Z';
</script>

<svg viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{id}-body" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#fde68a" />
			<stop offset="0.35" stop-color="#f59e0b" />
			<stop offset="1" stop-color="#9a3d07" />
		</linearGradient>
		<linearGradient id="{id}-gloss" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fff" stop-opacity="0.7" />
			<stop offset="1" stop-color="#fff" stop-opacity="0" />
		</linearGradient>
		<filter id="{id}-blur" x="-30%" y="-30%" width="160%" height="160%">
			<feGaussianBlur stdDeviation="2.2" />
		</filter>
		<clipPath id="{id}-shape"><path d={TRIANGLE} /></clipPath>
	</defs>

	<path
		d={TRIANGLE}
		transform="translate(1.5 4)"
		fill="#000"
		opacity="0.32"
		filter="url(#{id}-blur)"
	/>
	<path d={TRIANGLE} fill="url(#{id}-body)" />
	<g clip-path="url(#{id}-shape)" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path
			d="M17 49V15Q17 10 21.3 12.6L48.7 29.4"
			stroke="#fff"
			stroke-opacity="0.6"
			stroke-width="4"
		/>
		<path d="M21.3 51.4 48.7 34.6" stroke="#6b2504" stroke-opacity="0.5" stroke-width="4" />
		<path
			d="M17 15Q17 10 21.3 12.6L48.7 29.4Q36 30.5 17 38.5Z"
			fill="url(#{id}-gloss)"
			stroke="none"
		/>
	</g>
	<ellipse
		cx="22.4"
		cy="17.4"
		rx="2.6"
		ry="1.3"
		fill="#fff"
		opacity="0.75"
		transform="rotate(32 22.4 17.4)"
	/>

	<!-- Music notes, hidden until the tile is hovered -->
	{#each [{ x: 47, y: 27 }, { x: 52, y: 33 }] as note, i (i)}
		<g class="note" style:animation-delay="{i * 0.75}s">
			<ellipse
				cx={note.x}
				cy={note.y}
				rx="2.5"
				ry="1.8"
				fill="#92400e"
				transform="rotate(-22 {note.x} {note.y})"
			/>
			<path
				d="M{note.x + 2.2} {note.y - 0.6}v-9.4l3.6 2"
				fill="none"
				stroke="#92400e"
				stroke-width="1.1"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</g>
	{/each}
</svg>

<style>
	.note {
		opacity: 0;
	}

	/* When the key is hovered or tapped (animateKeys.js; not for reduced motion): notes drift up and out */
	@media (prefers-reduced-motion: no-preference) {
		:global(.bar-tile[data-animate]) .note {
			animation: float-away 1.5s ease-out infinite;
		}
	}

	@keyframes float-away {
		0% {
			opacity: 0;
			transform: translate(0, 0);
		}
		25% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(7px, -14px);
		}
	}
</style>
