<script>
	/**
	 * The bar across the top of every page: the app's name, a link to each
	 * section (the one you're on is pressed in and lit), the tuner, the tips on/off
	 * button, what's stored on this device, and the Settings button. While developing on this machine,
	 * dashed buttons for the dev tools too (Todo, and the Sampler on a
	 * computer); they never appear in the real app. It stays at the top while you scroll.
	 *
	 * To add a section: add it to PAGES below. A dev tool goes in DEV_PAGES
	 * (its page must 404 outside local dev too: see $lib/devOnly.js).
	 */
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import GearIcon from './GearIcon.svelte';
	import StorageIcon from './StorageIcon.svelte';
	import MetronomeIcon from '$lib/arranger/components/icons/MetronomeIcon.svelte';
	import TipsToggle from '$lib/tooltips/TipsToggle.svelte';
	import TunerButton from '$lib/tuner/TunerButton.svelte';
	import { isLocalDev } from '$lib/devOnly.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ onOpenSettings: () => void, settingsOpen: boolean }} */
	let { onOpenSettings, settingsOpen } = $props();

	// Its height, for things that stick just under it (--top-bar-height)
	let height = $state(0);
	$effect(() => {
		document.documentElement.style.setProperty('--top-bar-height', `${height}px`);
		return () => document.documentElement.style.removeProperty('--top-bar-height');
	});

	/** Sections. `phoneIcon` stands in for the name on a phone, so the bar still fits. */
	const PAGES = /** @type {const} */ ([
		{ path: '/', name: 'Songs' },
		{ path: '/arranger', name: 'Arranger' },
		{ path: '/arranger/transcribe', name: 'Transcribe' },
		{ path: '/metronome', name: 'Metronome', phoneIcon: MetronomeIcon }
	]);

	/**
	 * Dev tools. `short` is shown on a narrow screen so the bar still fits;
	 * `computerOnly` hides it on a touch screen (the sampler records through
	 * an audio interface).
	 */
	const DEV_PAGES = /** @type {const} */ ([
		{ path: '/todo', name: 'Todo', short: '✓', tip: TIPS.todo.open },
		{ path: '/sampler', name: 'Sampler', short: 'Rec', tip: TIPS.sampler.open, computerOnly: true }
	]);

	/**
	 * Are we on this section? Pages inside a section (like the arranger's
	 * help page) count as that section.
	 * @param {string} path
	 */
	function isCurrentSection(path) {
		if (path === '/') return page.url.pathname === '/';
		const here = page.url.pathname;
		const within = (/** @type {string} */ each) => here.startsWith(each);
		// The most specific section wins: Transcribe, not the Arranger it's inside
		const longest = PAGES.filter((each) => each.path !== '/' && within(each.path)).sort(
			(a, b) => b.path.length - a.path.length
		)[0];
		return longest ? longest.path === path : within(path);
	}
</script>

<header class="topbar print:hidden" bind:clientHeight={height}>
	<!-- On a phone the wordmark makes way so the buttons fit: the lit button says where you are -->
	<nav
		class="ui-page-width flex items-center gap-1 max-sm:justify-between sm:gap-3"
		aria-label="Main"
	>
		<a
			href={resolve('/')}
			class="mr-auto text-lg font-extrabold tracking-tight max-sm:hidden"
			use:tooltip={TIPS.app.home}
		>
			Brue<span class="text-accent">grass</span>
		</a>

		{#each PAGES as section (section.path)}
			<a
				href={resolve(section.path)}
				class="ui-button px-1 py-1.5 text-sm sm:px-3"
				class:ui-button-on={isCurrentSection(section.path)}
				aria-current={isCurrentSection(section.path) ? 'page' : undefined}
				aria-label={section.name}
				use:tooltip={TIPS.app.pages[/** @type {keyof typeof TIPS.app.pages} */ (section.path)]}
			>
				{#if 'phoneIcon' in section}
					<span class="max-sm:hidden">{section.name}</span>
					<span class="phone-icon sm:hidden" aria-hidden="true"><section.phoneIcon /></span>
				{:else}
					{section.name}
				{/if}
			</a>
		{/each}

		<TunerButton class="h-8 w-8 shrink-0 rounded-full sm:h-9 sm:w-9" />

		{#if isLocalDev(page.url)}
			{#each DEV_PAGES as tool (tool.path)}
				<a
					href={resolve(tool.path)}
					class={[
						'dev-link ui-button px-1.5 py-1.5 text-sm sm:px-3',
						isCurrentSection(tool.path) && 'ui-button-on',
						'computerOnly' in tool && 'pointer-coarse:hidden'
					]}
					aria-current={isCurrentSection(tool.path) ? 'page' : undefined}
					aria-label={tool.name}
					use:tooltip={tool.tip}
				>
					<span class="max-sm:hidden">{tool.name}</span><span class="sm:hidden" aria-hidden="true"
						>{tool.short}</span
					>
				</a>
			{/each}
		{/if}

		<TipsToggle />

		<a
			href={resolve('/storage')}
			class="flex h-8 w-8 shrink-0 items-center justify-center ui-button rounded-full sm:h-9 sm:w-9"
			class:ui-button-on={isCurrentSection('/storage')}
			aria-label="Stored on this device"
			aria-current={isCurrentSection('/storage') ? 'page' : undefined}
			use:tooltip={TIPS.app.storage}
		>
			<StorageIcon />
		</a>

		<button
			type="button"
			class="flex h-8 w-8 shrink-0 items-center justify-center ui-button rounded-full sm:h-9 sm:w-9"
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
	.phone-icon :global(svg) {
		display: block;
		height: 1.25rem;
		width: auto;
	}

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
		background: var(--player-bar);
		box-shadow:
			inset 0 -1px 0 rgb(0 0 0 / calc(0.3 * var(--drop))),
			0 6px 14px var(--shadow-dark-edge),
			var(--shadow-drop-down);
	}
</style>
