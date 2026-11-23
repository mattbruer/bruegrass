<script>
	/**
	 * Zoom a view across (time) and down (lanes, pitch rows): − and + for
	 * each; tap the arrow between them to go back to the usual size. A view
	 * that only zooms one way names it in `axes`; one that can show more
	 * than the usual levels (the whole song) gives its lowest level in `lowest`.
	 */
	import { canZoomIn, canZoomOut, zoomStep } from './zoomLevels.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   zoom: { across: number, down: number },
	 *   axes?: ('across' | 'down')[],
	 *   lowest?: { across?: number, down?: number }
	 * }} zoom is changed in place
	 */
	let { zoom, axes = ['across', 'down'], lowest = {} } = $props();

	const AXES = /** @type {const} */ ([
		{ id: 'across', turn: 0, label: 'Usual size across', tips: TIPS.zoom.across },
		{ id: 'down', turn: 90, label: 'Usual size down', tips: TIPS.zoom.down }
	]);

	const shown = $derived(AXES.filter((axis) => axes.includes(axis.id)));
</script>

<div class="flex items-center gap-2" role="group" aria-label="Zoom">
	{#each shown as axis (axis.id)}
		<span class="flex items-center">
			<button
				type="button"
				class="size-10 ui-button text-lg"
				disabled={!canZoomOut(zoom[axis.id], lowest[axis.id])}
				onclick={() => (zoom[axis.id] = zoomStep(zoom[axis.id], -1, lowest[axis.id]))}
				use:tooltip={axis.tips.out}>−</button
			>
			<button
				type="button"
				class="w-7 text-center text-lg text-ink-soft"
				class:text-ink={zoom[axis.id] !== 1}
				onclick={() => (zoom[axis.id] = 1)}
				aria-label={axis.label}
				use:tooltip={axis.tips.reset}
			>
				<!-- Drawn, not ↔ ↕: iOS shows those as mismatched emoji -->
				<svg
					class="mx-auto size-4"
					style:rotate="{axis.turn}deg"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M2 8h12M5 5 2 8l3 3M11 5l3 3-3 3" />
				</svg>
			</button>
			<button
				type="button"
				class="size-10 ui-button text-lg"
				disabled={!canZoomIn(zoom[axis.id])}
				onclick={() => (zoom[axis.id] = zoomStep(zoom[axis.id], 1, lowest[axis.id]))}
				use:tooltip={axis.tips.in}>+</button
			>
		</span>
	{/each}
</div>
