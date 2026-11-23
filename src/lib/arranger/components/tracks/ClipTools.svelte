<script>
	/**
	 * The picked clip's tools, in the Tracks page's control bar so they stay
	 * in view on a phone: which take it plays (comping), Split at the
	 * playhead, Split at sections, its level and "Even it out", Delete, and
	 * Done. Keys on a computer: S splits, Delete or Backspace deletes, Esc lets go.
	 */
	import { useArranger } from '../../state/context.js';
	import { GAIN_RANGE } from '../../takes/clips.js';
	import { isTyping } from '$lib/utils/isTyping.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { audioEdits, recording, player, arrangement } = useArranger();

	const laneClip = $derived(audioEdits.pickedClip);
	const takes = $derived(audioEdits.takesForPicked);
	const laneTakes = $derived(
		laneClip ? recording.takes.filter((take) => take.trackId === laneClip.take.trackId) : []
	);
	const number = $derived(laneClip ? laneTakes.indexOf(laneClip.take) + 1 : 0);

	/** The level while the slider is being moved (dB), until it's let go. */
	let sliding = $state(/** @type {number | null} */ (null));
	const gain = $derived(sliding ?? laneClip?.clip.gain ?? 0);

	/** Where the playhead is, in seconds from bar 1. */
	function playheadSeconds() {
		const now = player.melodyTimeNow();
		return arrangement.clock.secondsAt(Number.isFinite(now) ? now : player.resumeAt);
	}

	function split() {
		audioEdits.split(playheadSeconds());
	}

	/** @param {number} db */
	function dbLabel(db) {
		return db === 0 ? '0 dB' : `${db > 0 ? '+' : '−'}${Math.abs(db)} dB`;
	}

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
		if (
			!laneClip ||
			event.defaultPrevented ||
			isTyping(event) ||
			event.metaKey ||
			event.ctrlKey ||
			event.altKey
		)
			return;
		if (event.key === 's' || event.key === 'S') split();
		else if (event.key === 'Delete' || event.key === 'Backspace') audioEdits.remove();
		else if (event.key === 'Escape') audioEdits.letGo();
		else return;
		event.preventDefault();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if laneClip}
	<div class="tools" role="group" aria-label="The picked clip">
		<div class="cluster">
			<span class="what">{recording.laneName(laneClip.take.trackId)}</span>
			<div class="take ui-key-strip">
				<button
					type="button"
					class="ui-button"
					disabled={takes.length < 2}
					onclick={() => audioEdits.otherTake(-1)}
					aria-label="The take before"
					use:tooltip={TIPS.tracks.takeBefore}>◂</button
				>
				<span class="number">Take {number}</span>
				<button
					type="button"
					class="ui-button"
					disabled={takes.length < 2}
					onclick={() => audioEdits.otherTake(1)}
					aria-label="The next take"
					use:tooltip={TIPS.tracks.takeNext}>▸</button
				>
			</div>
		</div>

		<div class="cluster">
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				onclick={split}
				use:tooltip={TIPS.tracks.split}>Split</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				onclick={() => audioEdits.splitAtSections()}
				use:tooltip={TIPS.tracks.splitAtSections}>Split at sections</button
			>
		</div>

		<div class="cluster">
			<label class="level" use:tooltip={TIPS.tracks.clipLevel}>
				<span class="sr-only">Level</span>
				<input
					type="range"
					min={GAIN_RANGE.low}
					max={GAIN_RANGE.high}
					step="0.5"
					value={gain}
					oninput={(event) => (sliding = Number(event.currentTarget.value))}
					onchange={(event) => {
						audioEdits.setGain(Number(event.currentTarget.value));
						sliding = null;
					}}
				/>
				<span class="db">{dbLabel(gain)}</span>
			</label>
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				onclick={() => audioEdits.evenOut()}
				use:tooltip={TIPS.tracks.evenOut}>Even it out</button
			>
		</div>

		<div class="cluster">
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				onclick={() => audioEdits.remove()}
				use:tooltip={TIPS.tracks.deleteClip}>Delete</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5 ui-button-primary"
				onclick={() => audioEdits.letGo()}
				use:tooltip={TIPS.tracks.clipDone}>Done</button
			>
		</div>
	</div>
{/if}

<style>
	.tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.5rem 1.25rem;
		margin-top: 0.6rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--color-line);
		font-size: 0.85rem;
	}

	.cluster {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;
	}

	.what {
		max-width: 9rem;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 700;
	}

	.take {
		display: flex;
		align-items: center;
	}

	.take button {
		width: 2.25rem;
		height: 2.25rem;
	}

	.number {
		padding: 0 0.5rem;
		font-variant-numeric: tabular-nums;
	}

	.level {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.level input {
		width: 7rem;
		accent-color: var(--color-accent);
	}

	.db {
		min-width: 3.5rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-soft);
	}
</style>
