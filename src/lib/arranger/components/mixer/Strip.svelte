<script>
	/**
	 * A channel strip's card, shared by every kind of strip (instrument,
	 * reverb aux, master). Every strip has its name and EQ at the top, in
	 * the same place, so they line up across the console (a strip with no EQ,
	 * like the output stage, leaves the space empty). What goes below is up
	 * to each strip, and sits at the bottom so the faders line up too.
	 */
	import EqButton from './eq/EqButton.svelte';

	/**
	 * @type {{
	 *   id: string,
	 *   name: string,
	 *   kind?: 'channel' | 'aux' | 'master',
	 *   hasEq?: boolean,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { id, name, kind = 'channel', hasEq = true, children } = $props();
</script>

<div class="strip {kind}">
	<div class="strip-top">
		<h3 class="strip-name">{name}</h3>
		{#if hasEq}<EqButton stripId={id} />{/if}
	</div>
	<div class="strip-controls">
		{@render children()}
	</div>
</div>

<style>
	.strip {
		display: flex;
		flex-shrink: 0;
		flex-direction: column;
		gap: 0.6rem;
		min-width: 6.5rem;
		border-radius: var(--corner-card);
		background: var(--mixer-strip);
		padding: 0.85rem 0.75rem 1rem;
		box-shadow: var(--shadow-raised-small);
		/*
		 * Inside a strip, the strip's tone is the "surface": knobs, caps,
		 * readouts and buttons (which use --color-surface) match it.
		 */
		--color-surface: var(--mixer-strip);
	}

	/* Name and EQ: pinned to the top */
	.strip-top {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	/* The strip's own controls: pushed to the bottom, so faders line up */
	.strip-controls {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6rem;
	}

	/*
	 * A phone on its side is too short for controls stacked over the fader,
	 * so they sit beside it instead, two to a row: wider strips (the console
	 * scrolls sideways anyway), half the height. The fader is always a strip's
	 * last control, so it takes the right-hand column.
	 */
	@media (max-height: 600px) {
		.strip-controls {
			display: grid;
			grid-template-columns: auto auto auto;
			align-content: end;
			align-items: end;
			gap: 0.5rem 0.6rem;
		}

		.strip-controls > :global(:last-child) {
			grid-column: 3;
			grid-row: 1 / span 8;
		}

		/* The strip is wide now: name and EQ side by side, and a little less padding */
		.strip {
			gap: 0.5rem;
			padding: 0.6rem 0.7rem 0.7rem;
		}

		.strip-top {
			flex-direction: row;
			align-items: center;
			gap: 0.6rem;
		}

		.strip-top > :global(button) {
			flex: 1;
			flex-direction: row;
			justify-content: center;
			gap: 0.4rem;
		}

		.strip-top .strip-name {
			width: auto;
			text-align: left;
		}
	}

	.strip-name {
		width: 100%;
		text-align: center;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink);
	}

	/* The aux and the master get a hint of colour in their names */
	.aux .strip-name {
		color: var(--color-ink-soft);
	}

	.master .strip-name {
		color: var(--color-accent);
	}
</style>
