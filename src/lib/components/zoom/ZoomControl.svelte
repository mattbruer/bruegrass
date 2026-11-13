<script>
	/**
	 * Zoom a view across (time) and down (lanes, pitch rows): − and + for
	 * each; tap the arrow between them to go back to the usual size.
	 */
	import { canZoomIn, canZoomOut, zoomStep } from './zoomLevels.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ zoom: { across: number, down: number } }} changed in place */
	let { zoom } = $props();

	const AXES = /** @type {const} */ ([
		{ id: 'across', sign: '↔', tips: TIPS.zoom.across },
		{ id: 'down', sign: '↕', tips: TIPS.zoom.down }
	]);
</script>

<div class="flex items-center gap-3" role="group" aria-label="Zoom">
	<span class="text-sm text-ink-soft">Zoom</span>
	{#each AXES as axis (axis.id)}
		<span class="flex items-center">
			<button
				type="button"
				class="h-8 w-8 ui-button text-base"
				disabled={!canZoomOut(zoom[axis.id])}
				onclick={() => (zoom[axis.id] = zoomStep(zoom[axis.id], -1))}
				use:tooltip={axis.tips.out}>−</button
			>
			<button
				type="button"
				class="w-7 text-center text-base text-ink-soft"
				class:text-ink={zoom[axis.id] !== 1}
				onclick={() => (zoom[axis.id] = 1)}
				use:tooltip={axis.tips.reset}>{axis.sign}</button
			>
			<button
				type="button"
				class="h-8 w-8 ui-button text-base"
				disabled={!canZoomIn(zoom[axis.id])}
				onclick={() => (zoom[axis.id] = zoomStep(zoom[axis.id], 1))}
				use:tooltip={axis.tips.in}>+</button
			>
		</span>
	{/each}
</div>
