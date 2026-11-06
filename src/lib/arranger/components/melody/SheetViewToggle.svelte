<script>
	/** Tabs over the sheet music: as it sounds (concert), or in the guitar's shapes key (for reading with a capo). */
	import { useArranger } from '../../state/context.js';
	import { keyName } from '../../chart/key.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { arrangement, melody } = useArranger();

	let views = $derived([
		{ id: 'concert', name: 'Concert', key: keyName(arrangement.key, arrangement.pitchShift) },
		{ id: 'shapes', name: 'Guitar shapes', key: keyName(arrangement.key) }
	]);
</script>

<div
	class="flex ui-well rounded-[var(--corner-control)] p-0.5"
	role="group"
	aria-label="Show the sheet music"
>
	{#each views as view (view.id)}
		{@const chosen = melody.sheetView === view.id}
		<button
			type="button"
			class="rounded-[var(--corner-control)] px-2 py-1 text-sm font-semibold sm:px-3"
			class:ui-button={chosen}
			class:text-accent={chosen}
			class:text-ink-soft={!chosen}
			aria-pressed={chosen}
			onclick={() => (melody.sheetView = /** @type {'concert' | 'shapes'} */ (view.id))}
			use:tooltip={TIPS.melody.sheetView[view.id]}
		>
			{view.name} <span class="font-normal">({view.key})</span>
		</button>
	{/each}
</div>
