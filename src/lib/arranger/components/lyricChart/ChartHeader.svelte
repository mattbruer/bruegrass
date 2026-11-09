<script>
	/** The top of a chart: the song's title, then key, capo, tempo and time signature. */

	/** @type {{ title: string, details: { label: string, value: string }[] }} */
	let { title, details } = $props();
</script>

<header class="pb-5 text-center">
	<h1 class="text-3xl font-bold">{title}</h1>
	<p class="mt-1 text-sm">
		{#each details as detail, d (detail.label)}
			{#if d > 0}<span class="px-1.5 text-ink-soft" aria-hidden="true">·</span>{/if}
			<span class="text-ink-soft">{detail.label}</span> <strong>{detail.value}</strong>
		{/each}
	</p>
</header>
