<script>
	/**
	 * After a chord edit that would change the harmony parts: rewrite them to
	 * fit, or keep them as they are (state/HarmonyFollowState.svelte.js).
	 * Closing it keeps them.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { HARMONY_PARTS } from '../../melody/harmony/harmonyParts.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { harmonyFollow } = useArranger();

	const parts = $derived(harmonyFollow.question ?? []);
	const names = $derived(namesOf(parts.map((part) => part.id)));
	const handChanged = $derived(
		namesOf(parts.filter((part) => part.style === null).map((part) => part.id))
	);

	/** @param {string[]} ids */
	function namesOf(ids) {
		const named = HARMONY_PARTS.filter((part) => ids.includes(part.id)).map((part) => part.name);
		return new Intl.ListFormat('en', { type: 'conjunction' }).format(named);
	}
</script>

<Dialog
	bind:open={() => harmonyFollow.question !== null, (isOpen) => !isOpen && harmonyFollow.keep()}
	title="The chords changed"
>
	{#if parts.length > 0}
		<div class="flex max-w-md flex-col gap-3 px-6 pt-4 pb-6">
			<p class="text-sm">Rewrite the harmony lines ({names}) to fit the new chords?</p>
			{#if handChanged}
				<p class="text-sm text-ink-soft">
					You changed {handChanged} by hand: rewriting replaces your changes. Undo on the Tracks page
					brings them back.
				</p>
			{/if}
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="ui-button px-4 py-3 ui-button-primary"
					onclick={() => harmonyFollow.rewrite()}
					use:tooltip={TIPS.harmonyFollow.rewrite}
				>
					Rewrite the harmony
				</button>
				<button
					type="button"
					class="ui-button px-4 py-3"
					onclick={() => harmonyFollow.keep()}
					use:tooltip={TIPS.harmonyFollow.keep}
				>
					Keep it as it is
				</button>
			</div>
		</div>
	{/if}
</Dialog>
