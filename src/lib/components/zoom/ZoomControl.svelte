<script>
	/**
	 * Zoom a view across (time) and down (lanes, pitch rows): − and + for
	 * each; tap the arrow between them to go back to the usual size. A view
	 * that only zooms one way names it in `axes`.
	 */
	import { canZoomIn, canZoomOut, zoomStep } from './zoomLevels.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   zoom: { across: number, down: number },
	 *   axes?: ('across' | 'down')[]
	 * }} zoom is changed in place
	 */
	let { zoom, axes = ['across', 'down'] } = $props();

	const AXES = /** @type {const} */ ([
		{ id: 'across', sign: '↔', tips: TIPS.zoom.across },
		{ id: 'down', sign: '↕', tips: TIPS.zoom.down }
	]);

	const shown = $derived(AXES.filter((axis) => axes.includes(axis.id)));
</script>

<div class="flex items-center gap-2" role="group" aria-label="Zoom">
	{#each shown as axis (axis.id)}
		<span class="flex items-center">
			<button
				type="button"
				class="size-10 ui-button text-lg"
				disabled={!canZoomOut(zoom[axis.id])}
				onclick={() => (zoom[axis.id] = zoomStep(zoom[axis.id], -1))}
				use:tooltip={axis.tips.out}>−</button
			>
			<button
				type="button"
				class="w-7 text-center text-lg text-ink-soft"
				class:text-ink={zoom[axis.id] !== 1}
				onclick={() => (zoom[axis.id] = 1)}
				use:tooltip={axis.tips.reset}>{axis.sign}</button
			>
			<button
				type="button"
				class="size-10 ui-button text-lg"
				disabled={!canZoomIn(zoom[axis.id])}
				onclick={() => (zoom[axis.id] = zoomStep(zoom[axis.id], 1))}
				use:tooltip={axis.tips.in}>+</button
			>
		</span>
	{/each}
</div>
