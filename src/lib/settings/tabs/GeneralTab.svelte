<script>
	/** Settings → General: how the app behaves. */
	import { settings } from '../settings.svelte.js';
	import SettingRow from '../controls/SettingRow.svelte';
	import ToggleSwitch from '../controls/ToggleSwitch.svelte';
</script>

<section class="mb-4 ui-well p-4">
	<h3 class="mb-1 text-xs font-bold tracking-wider text-ink-faint uppercase">Help</h3>

	<SettingRow
		id="setting-show-tips"
		label="Tips"
		description="Rest the pointer on a control (or press and hold it on a phone) to see what it does."
	>
		<ToggleSwitch bind:on={settings.showTips} labelledBy="setting-show-tips" />
	</SettingRow>
</section>

<section class="ui-well p-4">
	<h3 class="mb-1 text-xs font-bold tracking-wider text-ink-faint uppercase">Arranger</h3>

	<SettingRow
		id="setting-music-keypad"
		label="Music keypad on phones"
		description="Type arrangements with chord keys instead of the phone's keyboard."
	>
		<ToggleSwitch bind:on={settings.musicKeypad} labelledBy="setting-music-keypad" />
	</SettingRow>
</section>
