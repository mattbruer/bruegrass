<script>
	/**
	 * The EQ window, for whichever strip's EQ is open (see eqWindowState).
	 * It floats over the page without blocking it, like a plugin window in
	 * Logic, so you can work the EQ and the faders together.
	 *
	 * Presets keep one strip's EQ; the note at the bottom points to listening
	 * setups, which keep every strip's EQ for the speaker or headphones in use.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import ToggleSwitch from '$lib/settings/controls/ToggleSwitch.svelte';
	import EqGraph from './EqGraph.svelte';
	import BandControls from './BandControls.svelte';
	import EqPresetPicker from './EqPresetPicker.svelte';
	import ListeningSetupNote from './ListeningSetupNote.svelte';
	import { closeEq, eqStrip, eqWindow } from './eqWindowState.svelte.js';
	import { flatEq } from '../../../playback/eq/eqBands.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** The band chosen for exact control (the low mid, to start with: the most used). */
	let selectedBandId = $state('bell1');

	let strip = $derived(eqWindow.stripId ? eqStrip(eqWindow.stripId) : null);

	/** The Dialog's open state follows which strip is chosen. */
	let open = $derived(eqWindow.stripId !== null);

	function makeFlat() {
		if (strip) Object.assign(strip.eq, flatEq());
	}
</script>

<Dialog
	bind:open={() => open, (isOpen) => !isOpen && closeEq()}
	title={strip ? `${strip.name} EQ` : 'EQ'}
	modal={false}
>
	{#if strip && eqWindow.stripId}
		<div class="px-6 pt-4 pb-6">
			<div class="mb-3 flex items-center justify-between">
				<span id="eq-enabled" class="font-semibold">On</span>
				<ToggleSwitch bind:on={strip.eq.enabled} labelledBy="eq-enabled" tip={TIPS.eq.on} />
			</div>

			{#key eqWindow.stripId}
				<EqPresetPicker stripId={eqWindow.stripId} stripName={strip.name} />
			{/key}

			<EqGraph eq={strip.eq} stripId={eqWindow.stripId} bind:selectedBandId />
			<BandControls eq={strip.eq} bind:selectedBandId />

			<div class="mt-4 flex justify-between gap-3 text-sm">
				<p class="text-ink-soft">Drag a dot on the curve, or tap a band.</p>
				<button
					type="button"
					class="ui-button px-3 py-1.5"
					onclick={makeFlat}
					use:tooltip={TIPS.eq.flat}>Flat</button
				>
			</div>

			<ListeningSetupNote />
		</div>
	{/if}
</Dialog>
