<script>
	/**
	 * The Settings panel: a dialog over whatever page you're on (so opening it
	 * never interrupts your work), with a tab for each group of settings.
	 *
	 * It's a native <dialog>: Esc closes it, and keyboard focus stays inside
	 * while it's open. Tapping the dimmed backdrop closes it too.
	 *
	 * To add a tab: write a component in ./tabs/ and add it to TABS below.
	 */
	import GeneralTab from './tabs/GeneralTab.svelte';
	import AppearanceTab from './tabs/AppearanceTab.svelte';

	const TABS = [
		{ id: 'general', name: 'General', component: GeneralTab },
		{ id: 'appearance', name: 'Appearance', component: AppearanceTab }
	];

	/** @type {{ open: boolean }} */
	let { open = $bindable(false) } = $props();

	let currentTabId = $state(TABS[0].id);
	let currentTab = $derived(TABS.find((tab) => tab.id === currentTabId) ?? TABS[0]);

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();

	// Keep the dialog in step with `open`
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	/** A click on the backdrop (outside the panel itself) closes it. */
	function closeIfBackdropClicked(/** @type {MouseEvent} */ event) {
		if (event.target === dialog) open = false;
	}

	/**
	 * Left/right arrows move between tabs, as screen readers and keyboard
	 * users expect from a tab bar.
	 * @param {KeyboardEvent} event
	 */
	function moveBetweenTabs(event) {
		const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
		if (step === 0) return;
		event.preventDefault();

		const currentIndex = TABS.findIndex((tab) => tab.id === currentTabId);
		const nextIndex = (currentIndex + step + TABS.length) % TABS.length;
		currentTabId = TABS[nextIndex].id;
		document.getElementById(`settings-tab-${currentTabId}`)?.focus();
	}
</script>

<dialog
	bind:this={dialog}
	class="panel"
	aria-labelledby="settings-title"
	onclose={() => (open = false)}
	onclick={closeIfBackdropClicked}
>
	<header class="flex items-center justify-between px-6 pt-6">
		<h2 id="settings-title" class="text-xl font-bold">Settings</h2>
		<button
			type="button"
			class="h-9 w-9 ui-button rounded-full"
			aria-label="Close settings"
			onclick={() => (open = false)}
		>
			✕
		</button>
	</header>

	<!-- Tab bar: a sunk well with the chosen tab raised -->
	<div
		class="mx-6 mt-5 flex ui-well rounded-[var(--corner-control)] p-1"
		role="tablist"
		aria-label="Settings sections"
		tabindex="-1"
		onkeydown={moveBetweenTabs}
	>
		{#each TABS as tab (tab.id)}
			{@const selected = tab.id === currentTabId}
			<button
				type="button"
				role="tab"
				id="settings-tab-{tab.id}"
				aria-selected={selected}
				aria-controls="settings-tab-panel"
				tabindex={selected ? 0 : -1}
				class="flex-1 rounded-[var(--corner-control)] px-3 py-1.5 text-sm font-semibold"
				class:ui-button={selected}
				class:text-accent={selected}
				class:text-ink-soft={!selected}
				onclick={() => (currentTabId = tab.id)}
			>
				{tab.name}
			</button>
		{/each}
	</div>

	<div
		id="settings-tab-panel"
		class="px-6 pt-5 pb-6"
		role="tabpanel"
		aria-labelledby="settings-tab-{currentTabId}"
	>
		<currentTab.component />
	</div>
</dialog>

<style>
	.panel {
		margin: auto;
		width: min(30rem, calc(100% - 2rem));
		max-height: calc(100% - 2rem);
		overflow-y: auto;
		border: none;
		border-radius: var(--corner-panel);
		background: var(--color-surface);
		color: var(--color-ink);
		box-shadow: var(--shadow-raised);
		padding: 0;
	}

	/* The page behind is dimmed (in the text colour, so it suits any theme) and blurred */
	.panel::backdrop {
		background: color-mix(in oklab, var(--color-ink) 35%, transparent);
		backdrop-filter: blur(3px);
	}
</style>
