<script>
	/**
	 * The Settings panel: a dialog over whatever page you're on (so opening it
	 * never interrupts your work), with a tab for each group of settings.
	 *
	 * To add a tab: write a component in ./tabs/ and add it to TABS below.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
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

<Dialog bind:open title="Settings">
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
</Dialog>
