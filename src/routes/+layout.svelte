<script>
	/**
	 * The frame around every page: global styles, the top bar, the page
	 * itself, and the Settings panel. It also loads saved settings and keeps
	 * the page's look in step with the Appearance settings.
	 */
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import TopBar from '$lib/components/TopBar.svelte';
	import SettingsPanel from '$lib/settings/SettingsPanel.svelte';
	import { settings, loadSettings } from '$lib/settings/settings.svelte.js';
	import { applyTheme } from '$lib/theme/theme.js';
	import { followPointer } from '$lib/theme/followPointer.js';

	let { children } = $props();

	let settingsOpen = $state(false);

	/** Settings in its own window is only the settings, with no top bar */
	let isSettingsWindow = $derived(page.route.id === '/settings');

	onMount(loadSettings);
	onMount(followPointer);

	// Whenever an appearance setting changes, restyle the page
	$effect(() => {
		applyTheme(settings.appearance);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if !isSettingsWindow}
	<TopBar {settingsOpen} onOpenSettings={() => (settingsOpen = true)} />
{/if}

{@render children()}

{#if !isSettingsWindow}
	<SettingsPanel bind:open={settingsOpen} />
{/if}
