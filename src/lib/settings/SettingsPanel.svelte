<script>
	/**
	 * The Settings panel: a dialog over whatever page you're on (so opening it
	 * never interrupts your work). On a computer it can open in a window of its
	 * own instead, beside the page, so a change shows without closing it.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import SettingsTabs from './SettingsTabs.svelte';
	import { openSettingsWindow } from './settingsWindow.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ open: boolean }} */
	let { open = $bindable(false) } = $props();

	function popOut() {
		openSettingsWindow();
		open = false;
	}
</script>

<Dialog bind:open title="Settings">
	<div class="mx-6 mt-4 flex ui-hover-only justify-end">
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-sm"
			onclick={popOut}
			use:tooltip={TIPS.settings.popOut}
		>
			Open in its own window ↗
		</button>
	</div>
	<SettingsTabs />
</Dialog>
