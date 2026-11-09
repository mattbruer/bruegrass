<script>
	/**
	 * Tabs as a sunk well with the chosen one raised: pick one of a few views.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';

	/**
	 * @type {{
	 *   tabs: readonly { id: string, name: string }[],
	 *   value: string,
	 *   tips: Record<string, string>,
	 *   label: string
	 * }}
	 */
	let { tabs, value = $bindable(), tips, label } = $props();
</script>

<div
	class="flex w-fit ui-well rounded-[var(--corner-control)] p-0.5"
	role="tablist"
	aria-label={label}
>
	{#each tabs as { id, name } (id)}
		{@const chosen = value === id}
		<button
			type="button"
			role="tab"
			class="rounded-[var(--corner-control)] px-3 py-1 text-sm font-semibold"
			class:ui-button={chosen}
			class:text-accent={chosen}
			class:text-ink-soft={!chosen}
			aria-selected={chosen}
			onclick={() => (value = id)}
			use:tooltip={tips[id]}
		>
			{name}
		</button>
	{/each}
</div>
