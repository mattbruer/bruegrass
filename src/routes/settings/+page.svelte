<script>
	/**
	 * Settings in a window of its own (opened from the Settings dialog on a
	 * computer): change anything here and the app's other windows follow at once.
	 */
	import SettingsTabs from '$lib/settings/SettingsTabs.svelte';
</script>

<svelte:head><title>Settings · Bluegrass</title></svelte:head>

<main class="mx-auto max-w-[32rem] p-3">
	<div class="ui-card pb-1">
		<h1 class="px-6 pt-5 text-xl font-bold">Settings</h1>
		<SettingsTabs />
	</div>
</main>
