<script>
	/**
	 * The reverb plugin's window. It floats over the page without blocking
	 * it (like a plugin window in Logic), so you can keep mixing and playing
	 * while it's open. Its controls are listed in reverbSettings.js.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import Slider from './Slider.svelte';
	import ToggleSwitch from '$lib/settings/controls/ToggleSwitch.svelte';
	import {
		REVERB_CONTROLS,
		REVERB_DEFAULTS,
		positionOf,
		valueAt
	} from '../../playback/reverb/reverbSettings.js';

	/**
	 * @type {{
	 *   open: boolean,
	 *   settings: import('../../playback/reverb/reverbSettings.js').ReverbSettings
	 * }}
	 */
	let { open = $bindable(false), settings } = $props();

	function resetAll() {
		Object.assign(settings, REVERB_DEFAULTS);
	}
</script>

<Dialog bind:open title="Reverb" modal={false}>
	<div class="px-6 pt-4 pb-6">
		<div class="mb-4 flex items-center justify-between">
			<span id="reverb-enabled" class="font-semibold">On</span>
			<ToggleSwitch bind:on={settings.enabled} labelledBy="reverb-enabled" />
		</div>

		<div class="controls ui-well p-4" class:bypassed={!settings.enabled}>
			{#each REVERB_CONTROLS as control (control.key)}
				<Slider
					name={control.name}
					bind:value={settings[control.key]}
					toPosition={(value) => positionOf(control, value)}
					fromPosition={(position) => valueAt(control, position)}
					format={control.format}
					reset={REVERB_DEFAULTS[control.key]}
					label="Reverb {control.name}"
				/>
			{/each}
		</div>

		<div class="mt-4 flex justify-between gap-3 text-sm">
			<p class="text-ink-soft">Tap a value to reset it.</p>
			<button type="button" class="ui-button px-3 py-1.5" onclick={resetAll}>Reset all</button>
		</div>
	</div>
</Dialog>

<style>
	.controls {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: 1rem 1.5rem;
		--slider-length: 11rem;
	}

	.controls.bypassed {
		opacity: 0.5;
	}
</style>
