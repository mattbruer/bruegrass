<script>
	/**
	 * Which line the piano roll edits: the melody or one of its harmony
	 * parts, each in its own colour (the colour its notes have on the grid).
	 * Only there once the tune has a harmony part.
	 */
	import { voiceColour } from '../../melody/roll/MelodyDrawing.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ drawing: import('../../melody/roll/MelodyDrawing.svelte.js').MelodyDrawing }} */
	let { drawing } = $props();
</script>

{#if drawing.voices.length > 1}
	<div
		class="mb-2 flex flex-wrap items-center gap-2 text-sm"
		role="radiogroup"
		aria-label="Line to edit"
	>
		<span class="text-ink-soft">Edit:</span>
		{#each drawing.voices as voice (voice.id)}
			{@const chosen = drawing.current?.id === voice.id}
			<button
				type="button"
				role="radio"
				class="flex items-center gap-1.5 ui-button px-3 py-1.5"
				class:ui-button-on={chosen}
				aria-checked={chosen}
				onclick={() => drawing.editVoice(voice.id)}
				use:tooltip={TIPS.melody.voices}
			>
				<span class="swatch voice-colour" style:--voice={voiceColour(voice.id)}></span>
				{voice.name}
			</button>
		{/each}
	</div>
{/if}

<style>
	.swatch {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 999px;
		background: var(--voice-colour);
	}
</style>
