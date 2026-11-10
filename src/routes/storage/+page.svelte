<script>
	import StorageOverview from '$lib/browserStorage/components/StorageOverview.svelte';
</script>

<svelte:head>
	<title>Stored on this device · Bruegrass</title>
</svelte:head>

<main class="mx-auto grid max-w-3xl gap-3 px-4 py-8 sm:px-8">
	<h1 class="text-3xl font-bold">Stored on this device</h1>
	<p class="text-sm text-ink-soft">
		Everything the app keeps in this browser: what it is, how big, and what’s in it.
	</p>
	<StorageOverview />
</main>
