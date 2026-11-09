<script>
	/**
	 * A piece of vintage hardware to put controls on: a metal face, with wood
	 * cheeks or screws as the look has them. The look itself is CSS
	 * ($lib/theme/hardware.css); this only lays out the parts.
	 */

	/**
	 * @type {{
	 *   look: import('$lib/theme/hardwareLooks.js').HardwareLook,
	 *   label?: string,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { look, label, children } = $props();
</script>

<section class="hardware" data-hardware={look} aria-label={label}>
	<div class="cheek" aria-hidden="true"></div>
	<div class="face">
		{#each ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as corner (corner)}
			<span class="screw {corner}" aria-hidden="true"></span>
		{/each}
		{@render children()}
	</div>
	<div class="cheek right" aria-hidden="true"></div>
</section>

<style>
	.hardware {
		--cheek-width: 1.5rem;
		--screw-inset: 0.45rem;

		display: flex;
		border-radius: var(--corner-card);
		overflow: hidden;
		box-shadow:
			0 16px 30px rgb(0 0 0 / 0.35),
			0 3px 6px rgb(0 0 0 / 0.25);
		color: var(--color-ink);
	}

	.face {
		position: relative;
		flex: 1;
		min-width: 0;
		padding: 1.1rem 1.4rem 1.25rem;
		background: var(--faceplate);
		box-shadow: var(--faceplate-edges);
		text-shadow: var(--engraving);
	}

	.cheek {
		width: var(--cheek-width);
		flex-shrink: 0;
		background: var(--cheek);
	}

	/* The right cheek is the left one seen in a mirror: its light falls the other way */
	.cheek.right {
		transform: scaleX(-1);
	}

	/* A look without cheeks or screws simply leaves them out */
	[data-hardware='tapeDeck'] .cheek,
	[data-hardware='walnut'] .screw {
		display: none;
	}

	.screw {
		position: absolute;
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, #ffffff, #9a9da3 60%, #5d6066);
		box-shadow:
			0 1px 1px rgb(0 0 0 / 0.45),
			0 0 0 1px rgb(0 0 0 / 0.08);
	}

	/* The slot, each at its own angle as if screwed in by hand */
	.screw::after {
		content: '';
		position: absolute;
		inset: 40% 8%;
		background: #4a4c50;
		transform: rotate(var(--turn));
	}

	.top-left {
		--turn: 35deg;
		top: var(--screw-inset);
		left: var(--screw-inset);
	}
	.top-right {
		--turn: -20deg;
		top: var(--screw-inset);
		right: var(--screw-inset);
	}
	.bottom-left {
		--turn: 80deg;
		bottom: var(--screw-inset);
		left: var(--screw-inset);
	}
	.bottom-right {
		--turn: 10deg;
		bottom: var(--screw-inset);
		right: var(--screw-inset);
	}

	@media (max-width: 640px) {
		.hardware {
			--cheek-width: 0.85rem;
			--screw-inset: 0.3rem;
		}
		.face {
			padding: 0.9rem 1rem 1rem;
		}
		.screw {
			width: 0.5rem;
			height: 0.5rem;
		}
	}
</style>
