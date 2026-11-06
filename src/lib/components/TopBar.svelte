<script>
	/**
	 * The bar across the top of every page: the app's name, a link to each
	 * section (the one you're on is pressed in and lit), the tips on/off
	 * button, and the Settings button. While developing on this machine,
	 * a dashed Todo button too (it never appears in the real app). It stays at the top while you scroll.
	 *
	 * To add a section: add it to PAGES below.
	 */
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import GearIcon from './GearIcon.svelte';
	import TipsToggle from '$lib/tooltips/TipsToggle.svelte';
	import { isLocalDev } from '$lib/devOnly.js';
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

		{#if isLocalDev(page.url)}
			<a
				href={resolve('/todo')}
				class="dev-link ui-button px-3 py-1.5 text-sm"
				class:ui-button-on={isCurrentSection('/todo')}
				aria-current={isCurrentSection('/todo') ? 'page' : undefined}
				aria-label="Todo"
				use:tooltip={TIPS.todo.open}
			>
				<!-- Just a tick on a narrow screen, so the top bar still fits -->
				<span class="max-sm:hidden">Todo</span><span class="sm:hidden" aria-hidden="true">✓</span>
			</a>
		{/if}

		<TipsToggle />

		<button
			type="button"
			class="flex h-9 w-9 shrink-0 items-center justify-center ui-button rounded-full"
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
	/* Dev-only: dashed, so it's clearly not part of the real app */
	.dev-link {
		outline: 1.5px dashed var(--color-ink-faint);
		outline-offset: 2px;
	}

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
