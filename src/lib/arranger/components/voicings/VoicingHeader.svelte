<script>
	/**
	 * A chord editor's top row: the lane's name, ‹ the chord › to step
	 * through the song's chords, its bar, and ✕.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   name: string,
	 *   chords: { start: number, name: string, bar: number, sounds?: string }[],
	 *   picked: { start: number, name: string, bar: number, sounds?: string } | null,
	 *   onPick: (start: number) => void,
	 *   onClose?: () => void
	 * }}
	 *   sounds: the chord as it sounds, when the capo or key moves it
	 */
	let { name, chords, picked, onPick, onClose } = $props();

	const index = $derived(picked ? chords.indexOf(picked) : -1);

	/** @param {number} step -1 the chord before, 1 the chord after */
	function stepBy(step) {
		const next = chords[index + step];
		if (next) onPick(next.start);
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<h2 class="text-sm font-bold">{name}</h2>
	{#if picked}
		<div class="flex items-center gap-1">
			<button
				type="button"
				class="ui-button px-3 py-1 text-sm"
				aria-label="The chord before"
				disabled={index <= 0}
				onclick={() => stepBy(-1)}
				use:tooltip={TIPS.voicingEditor.before}>‹</button
			>
			<span class="chord" aria-live="polite">
				{picked.name}
				{#if picked.sounds && picked.sounds !== picked.name}
					<span class="ml-1 text-ink-soft">(sounds {picked.sounds})</span>
				{/if}
			</span>
			<button
				type="button"
				class="ui-button px-3 py-1 text-sm"
				aria-label="The chord after"
				disabled={index >= chords.length - 1}
				onclick={() => stepBy(1)}
				use:tooltip={TIPS.voicingEditor.after}>›</button
			>
		</div>
		<span class="text-xs text-ink-soft">bar {picked.bar}</span>
	{/if}
	{#if onClose}
		<button
			type="button"
			class="ml-auto ui-button px-3 py-1 text-sm"
			aria-label="Close {name}"
			onclick={onClose}
			use:tooltip={TIPS.partPane.close}>✕</button
		>
	{/if}
</div>

<style>
	.chord {
		min-width: 4rem;
		text-align: center;
		font-weight: 700;
	}
</style>
