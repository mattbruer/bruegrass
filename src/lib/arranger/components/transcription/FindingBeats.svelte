<!--
	Shown while the beats are being found: four dots that light up in turn,
	counting along. Only transform and opacity animate, so the browser keeps
	them moving even while the page is busy with the analysis.
-->
<div class="flex items-center gap-3 text-ink-soft" role="status">
	<div class="flex gap-2" aria-hidden="true">
		{#each [0, 1, 2, 3] as beat (beat)}
			<span class="dot" style:animation-delay="{beat * 0.3}s"></span>
		{/each}
	</div>
	Finding the beats and bars…
</div>

<style>
	.dot {
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 50%;
		background: var(--color-accent);
		animation: count 1.2s ease-in-out infinite;
	}

	@keyframes count {
		0%,
		100% {
			transform: scale(0.6);
			opacity: 0.3;
		}
		15% {
			transform: scale(1.2);
			opacity: 1;
		}
		40% {
			transform: scale(0.6);
			opacity: 0.3;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
