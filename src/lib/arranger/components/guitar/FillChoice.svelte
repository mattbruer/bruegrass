<script>
	/**
	 * A fill on this chord: the guitar rests and a part you write plays
	 * instead (anything, in any rhythm, in the part's TAB or piano roll).
	 * Offers to start one, or for a chord that is one, to open it or give
	 * the chord back to the band.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   fill: string | null,
	 *   partName: string,
	 *   canWrite: boolean,
	 *   onWrite: () => void,
	 *   onOpen: () => void,
	 *   onEnd: () => void
	 * }}
	 *   fill: the part playing a fill here (null: the band plays the chord);
	 *   canWrite: there's room for the fill part (it's made the first time)
	 */
	let { fill, partName, canWrite, onWrite, onOpen, onEnd } = $props();
</script>

{#if fill}
	<div class="fill flex flex-col gap-2 p-3">
		<p class="text-sm">
			<strong>A fill.</strong> The guitar rests on this chord, and your
			<strong>{partName}</strong> part plays instead.
		</p>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm ui-button-primary"
				onclick={onOpen}
				use:tooltip={TIPS.guitarEditor.openFill}>Open the fill</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm"
				onclick={onEnd}
				use:tooltip={TIPS.guitarEditor.endFill}>Back to the band</button
			>
		</div>
	</div>
{:else}
	<button
		type="button"
		class="self-start ui-button px-3 py-1.5 text-sm"
		disabled={!canWrite}
		onclick={onWrite}
		use:tooltip={TIPS.guitarEditor.writeFill}>Write a fill here…</button
	>
{/if}

<style>
	.fill {
		border: 1px dashed var(--color-accent);
		border-radius: var(--corner-small);
	}
</style>
