<script>
	/**
	 * Smaller / Fit / Larger for the chart's text. Fit (the default) picks the
	 * largest text that fits the song on one page; the others step from the
	 * size in use.
	 */
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const STEP = 1.12;

	/** @type {{ textScale: number }} */
	let { textScale } = $props();

	/** @param {number} direction */
	function step(direction) {
		settings.chart.textSize = Math.round(textScale * STEP ** direction * 100) / 100;
	}
</script>

<div class="flex items-center gap-1">
	<button
		type="button"
		class="ui-button px-3 py-2 text-sm"
		aria-label="Smaller text"
		use:tooltip={TIPS.chart.smaller}
		onclick={() => step(-1)}
	>
		A−
	</button>
	<button
		type="button"
		class="ui-button px-3 py-2 text-sm"
		class:ui-button-on={settings.chart.textSize === 0}
		aria-pressed={settings.chart.textSize === 0}
		use:tooltip={TIPS.chart.fit}
		onclick={() => (settings.chart.textSize = 0)}
	>
		Fit
	</button>
	<button
		type="button"
		class="ui-button px-3 py-2 text-sm"
		aria-label="Larger text"
		use:tooltip={TIPS.chart.larger}
		onclick={() => step(1)}
	>
		A+
	</button>
</div>
