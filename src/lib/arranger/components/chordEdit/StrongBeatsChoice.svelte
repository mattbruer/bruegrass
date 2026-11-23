<script>
	/**
	 * What a melody note on a strong beat may be, for the chords that fit:
	 * one of the chord's own notes (bluegrass), or a sweet or any colour note
	 * too (theory/chordsThatFit.js STRONG_BEAT_COLOURS). Remembered on this device.
	 */
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const CHOICES = /** @type {const} */ ([
		{ id: 'chordNotes', name: 'Chord notes' },
		{ id: 'sweet', name: 'Sweet colours' },
		{ id: 'any', name: 'Any colour' }
	]);
</script>

<div class="flex flex-wrap items-center gap-1.5 text-sm">
	<span class="text-ink-soft">On strong beats:</span>
	{#each CHOICES as choice (choice.id)}
		<button
			type="button"
			class="ui-button px-2.5 py-1"
			class:ui-button-on={settings.chords.strongBeats === choice.id}
			aria-pressed={settings.chords.strongBeats === choice.id}
			onclick={() => (settings.chords.strongBeats = choice.id)}
			use:tooltip={TIPS.chordEdit.strongBeats[choice.id]}
		>
			{choice.name}
		</button>
	{/each}
</div>
