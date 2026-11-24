<script>
	/**
	 * The picked note's edits as buttons, for touch: earlier or later and
	 * shorter or longer by a grid step, higher or lower by a semitone, and
	 * Delete. A finger can't hit a note's end exactly, so these do what a
	 * mouse does by dragging; the keyboard does the same with the arrows.
	 * Shown on touch screens only, always there so the roll doesn't jump.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   picked: boolean,
	 *   onStep: (step: import('../../melody/roll/noteGestures.js').NoteStep) => void
	 * }}
	 */
	let { picked, onStep } = $props();

	const tips = TIPS.melody.roll.noteBar;

	/** @type {{ name: string, steps: { step: import('../../melody/roll/noteGestures.js').NoteStep, glyph: string, label: string }[] }[]} */
	const GROUPS = [
		{
			name: 'Move',
			steps: [
				{ step: 'earlier', glyph: '←', label: 'Earlier' },
				{ step: 'later', glyph: '→', label: 'Later' }
			]
		},
		{
			name: 'Pitch',
			steps: [
				{ step: 'lower', glyph: '↓', label: 'Lower' },
				{ step: 'higher', glyph: '↑', label: 'Higher' }
			]
		},
		{
			name: 'Length',
			steps: [
				{ step: 'shorter', glyph: '−', label: 'Shorter' },
				{ step: 'longer', glyph: '+', label: 'Longer' }
			]
		}
	];
</script>

<div class="bar mt-2" role="group" aria-label="The picked note">
	{#each GROUPS as group (group.name)}
		<div class="group">
			<span class="name">{group.name}</span>
			<div class="ui-key-strip">
				{#each group.steps as { step, glyph, label } (step)}
					<button
						type="button"
						class="step ui-button"
						disabled={!picked}
						aria-label={label}
						onclick={() => onStep(step)}
						use:tooltip={tips[step]}>{glyph}</button
					>
				{/each}
			</div>
		</div>
	{/each}
	<button
		type="button"
		class="ui-button px-3"
		disabled={!picked}
		onclick={() => onStep('delete')}
		use:tooltip={tips.delete}>Delete</button
	>
	{#if !picked}
		<span class="hint">Tap a note to pick it</span>
	{/if}
</div>

<style>
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.9rem;
	}
	/* a mouse drags the note's ends exactly; the keyboard's arrows step it */
	@media (pointer: fine) {
		.bar {
			display: none;
		}
	}
	.group {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.name,
	.hint {
		font-size: 0.8rem;
		color: var(--color-ink-soft);
	}
	.step {
		width: 2.75rem;
		height: 2.75rem;
		font-size: 1.2rem;
	}
	.bar > .ui-button {
		height: 2.75rem;
	}
</style>
