<script>
	/**
	 * The bar across the top of every page: the app's name, a link to each
	 * section (the one you're on is pressed in and lit), and the Settings
	 * button. It stays at the top while you scroll.
	 *
	 * To add a section: add it to PAGES below.
	 */
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import GearIcon from './GearIcon.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ onOpenSettings: () => void, settingsOpen: boolean }} */
	let { onOpenSettings, settingsOpen } = $props();

	const PAGES = /** @type {const} */ ([
		{ path: '/', name: 'Songs' },
		{ path: '/arranger', name: 'Arranger' }
	]);

	/**
	 * Are we on this section? Pages inside a section (like the arranger's
	 * help page) count as that section.
	 * @param {string} path
	 */
	function isCurrentSection(path) {
		if (path === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(path);
	}
</script>

<header class="topbar">
	<nav class="mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-8" aria-label="Main">
		<a
			href={resolve('/')}
			class="mr-auto text-lg font-extrabold tracking-tight"
			use:tooltip={TIPS.app.home}
		>
			Brue<span class="text-accent">grass</span>
		</a>

		{#each PAGES as section (section.path)}
			<a
				href={resolve(section.path)}
				class="ui-button px-3 py-1.5 text-sm"
				class:ui-button-on={isCurrentSection(section.path)}
				aria-current={isCurrentSection(section.path) ? 'page' : undefined}
				use:tooltip={TIPS.app.pages[/** @type {keyof typeof TIPS.app.pages} */ (section.path)]}
			>
				{section.name}
			</a>
		{/each}

		<button
			type="button"
			class="flex h-9 w-9 items-center justify-center ui-button rounded-full"
			class:ui-button-on={settingsOpen}
			aria-label="Settings"
			use:tooltip={TIPS.app.settings}
			aria-haspopup="dialog"
			onclick={onOpenSettings}
		>
			<GearIcon />
		</button>
	</nav>
</header>

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 25;
		padding-block: 0.6rem;
		padding-top: max(0.6rem, env(safe-area-inset-top)); /* clear the iPhone notch */
		background: var(--color-surface);
		box-shadow: 0 6px 14px var(--shadow-dark-edge);
	}
</style>
