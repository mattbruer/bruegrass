<script>
	/**
	 * What recording has to say, under the Tracks controls: a problem, the
	 * mic the last take came from and its delay, and a warning for Bluetooth
	 * headphones. Before the first take, how recording goes.
	 */
	import { useArranger } from '../../state/context.js';

	const { recording, player } = useArranger();
</script>

<div class="notes" aria-live="polite">
	{#if recording.problem || player.problem}
		<p class="warning" role="alert">{recording.problem || player.problem}</p>
	{/if}
	{#if recording.lastInput}
		<p>
			Recorded from {recording.lastInput.name || 'the microphone'}, lined up for a
			{recording.lastInput.delayMs} ms delay.
		</p>
		{#if recording.lastInput.bluetooth}
			<p class="warning">
				That looks like Bluetooth headphones. They add a long delay and record in phone-call
				quality. Wired headphones work much better.
			</p>
		{/if}
	{:else if recording.lanes.length > 0}
		<p>
			Headphones on (wired if you can). Record gives the count-in clicks, then the band plays the
			song once while you record. A pickup has a bar of its own after the clicks.
		</p>
	{/if}
</div>

<style>
	.notes {
		display: grid;
		gap: 0.25rem;
		font-size: 0.85rem;
		color: var(--color-ink-soft);
	}

	.notes:empty {
		display: none;
	}

	.warning {
		color: var(--color-danger);
	}
</style>
