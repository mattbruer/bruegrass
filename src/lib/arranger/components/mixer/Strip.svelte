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
