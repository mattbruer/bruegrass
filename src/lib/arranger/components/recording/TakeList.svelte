<script>
	/**
	 * One audio lane's takes: which one it plays, moving a take earlier or
	 * later by ear, downloading it to send, deleting it.
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { formatClock } from '$lib/utils/formatClock.js';

	/** @type {{ trackId: string }} */
	let { trackId } = $props();

	const { recording, arrangement } = useArranger();

	/** How far one tap of Earlier / Later moves a take (ms). */
	const NUDGE_STEP_MS = 10;

	const takes = $derived(recording.takes.filter((take) => take.trackId === trackId));
	const byTrack = $derived(takes.length > 0 ? [{ id: trackId, takes }] : []);
</script>

{#each byTrack as track (track.id)}
	<section class="track">
		<h3>Takes</h3>
		<ul>
			{#each track.takes as take, index (take.id)}
				<li class:in-use={take.inUse}>
					<div class="row">
						<button
							type="button"
							class="use ui-button px-3 py-1"
							class:ui-button-on={take.inUse}
							aria-pressed={take.inUse}
							onclick={() => recording.use(take)}
							use:tooltip={TIPS.recording.use}
						>
							Take {index + 1}
						</button>
						<span class="details">
							{formatClock(take.seconds)}{take.from === 'file' ? ` · ${take.fileName}` : ''}
						</span>
						<button
							type="button"
							class="ui-button px-2 py-1"
							onclick={() => recording.download(take)}
							use:tooltip={TIPS.recording.download}
						>
							Download
						</button>
						<button
							type="button"
							class="ui-button px-2 py-1"
							onclick={() => recording.remove(take)}
							use:tooltip={TIPS.recording.delete}
						>
							Delete
						</button>
					</div>

					{#if take.inUse}
						<div class="row nudge">
							<button
								type="button"
								class="ui-button px-3 py-1"
								onclick={() => recording.nudge(take, -NUDGE_STEP_MS)}
								use:tooltip={TIPS.recording.earlier}
							>
								Earlier
							</button>
							<span class="details">
								{take.nudgeMs === 0
									? 'Lined up'
									: `${Math.abs(take.nudgeMs)} ms ${take.nudgeMs < 0 ? 'earlier' : 'later'}`}
							</span>
							<button
								type="button"
								class="ui-button px-3 py-1"
								onclick={() => recording.nudge(take, NUDGE_STEP_MS)}
								use:tooltip={TIPS.recording.later}
							>
								Later
							</button>
						</div>
					{/if}

					{#if take.bpm !== arrangement.bpm}
						<p class="text-xs text-ink-soft">
							Recorded at {take.bpm} BPM: it plays at {arrangement.bpm}, stretched, its pitch kept.
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/each}

<style>
	/* Shrink to the panel: a long file name is cut short, not the buttons */
	.track,
	ul,
	li {
		grid-template-columns: minmax(0, 1fr);
	}

	.track {
		display: grid;
		gap: 0.4rem;
	}

	h3 {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-ink-soft);
	}

	ul {
		display: grid;
		gap: 0.5rem;
	}

	li {
		display: grid;
		gap: 0.4rem;
		font-size: 0.85rem;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.row > button {
		flex-shrink: 0;
	}

	.details {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-ink-soft);
		font-variant-numeric: tabular-nums;
	}

	.nudge .details {
		text-align: center;
	}
</style>
