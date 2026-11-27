<script>
	/**
	 * Stretches of a lane marked over it: the picked bars (outlined; the same
	 * bars played again dashed), or what Undo or Redo just changed (it
	 * flashes, stays lit with what was done, and is scrolled into view).
	 * The host is a positioned lane.
	 */

	/**
	 * @type {{
	 *   spans: import('../../virtuals/playedSpans.js').Span[],
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>,
	 *   kind: 'picked' | 'changed',
	 *   label?: string
	 * }} label: written on the first stretch
	 */
	let { spans, scale, kind, label = '' } = $props();

	/**
	 * Bring a changed stretch into view, past the sticky lane names and controls.
	 * @param {HTMLElement} node
	 * @param {boolean} shows
	 */
	function intoView(node, shows) {
		if (shows) node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
	}
</script>

{#each spans as span, index (index)}
	<div
		class="mark {kind}"
		class:again={index > 0}
		style:left="{scale.toX(span.from)}px"
		style:width="{scale.toX(span.to) - scale.toX(span.from)}px"
		use:intoView={kind === 'changed' && index === 0}
	>
		{#if label && index === 0}
			<span class="label">{label}</span>
		{/if}
	</div>
{/each}

<style>
	.mark {
		position: absolute;
		top: 0;
		bottom: 0;
		z-index: 1;
		pointer-events: none;
		border-radius: 3px;
		scroll-margin: calc(var(--top-bar-height, 3.5rem) + 12rem) 2rem 2rem
			calc(var(--header-width, 186px) + 2rem);
	}

	.picked {
		background: color-mix(in oklch, var(--color-accent) 14%, transparent);
		box-shadow: inset 0 0 0 2px var(--color-accent);
	}

	.picked.again {
		background: color-mix(in oklch, var(--color-accent) 6%, transparent);
		box-shadow: none;
		outline: 2px dashed color-mix(in oklch, var(--color-accent) 70%, transparent);
		outline-offset: -2px;
	}

	.changed {
		background: color-mix(in oklch, var(--color-ink) 10%, transparent);
		box-shadow: inset 0 0 0 2px var(--color-ink);
		animation: flash 0.45s ease-out 3;
	}

	@keyframes flash {
		from {
			background: color-mix(in oklch, var(--color-ink) 35%, transparent);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.changed {
			animation: none;
		}
	}

	.label {
		position: absolute;
		top: 2px;
		left: 2px;
		max-width: calc(100% - 4px);
		min-width: max-content;
		padding: 0 0.35rem;
		border-radius: 3px;
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1.4;
		white-space: nowrap;
		color: var(--color-surface);
		background: var(--color-ink);
	}
</style>
