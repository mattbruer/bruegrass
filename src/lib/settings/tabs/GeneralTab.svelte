<script>
	/** Settings → General: how the app behaves. */
	import { settings } from '../settings.svelte.js';
	import SettingRow from '../controls/SettingRow.svelte';
	import ToggleSwitch from '../controls/ToggleSwitch.svelte';
</script>

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
