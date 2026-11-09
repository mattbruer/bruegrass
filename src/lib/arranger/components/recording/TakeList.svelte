<script>
	/**
	 * The song's takes, by track: which one each track plays, moving a take
	 * earlier or later by ear, downloading it to send, deleting it.
	 */
	import { useArranger } from '../../state/context.js';
	import { RECORD_TRACKS } from '../../takes/recordTracks.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { recording, arrangement } = useArranger();

	/** How far one tap of Earlier / Later moves a take (ms). */
	const NUDGE_STEP_MS = 10;

	const byTrack = $derived(
		RECORD_TRACKS.map((track) => ({
			...track,
			takes: recording.takes.filter((take) => take.trackId === track.id)
		})).filter((track) => track.takes.length > 0)
	);

	/** @param {number} seconds */
	function length(seconds) {
		const whole = Math.round(seconds);
		return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
	}
</script>

{#each byTrack as track (track.id)}
	<section class="track">
		<h3>{track.name}</h3>
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
							{length(take.seconds)}{take.from === 'file' ? ` · ${take.fileName}` : ''}
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
						<p class="warning">
							Recorded at {take.bpm} BPM; the song is at {arrangement.bpm} now, so it won’t line up.
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

	.warning {
		color: var(--color-danger);
	}
</style>
