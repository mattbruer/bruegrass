<script>
	/**
	 * The record panel, opened from the Record tile: which track to record on,
	 * one big Record / Stop button, what the mic was, and the song's takes.
	 * A new song is saved first (its takes are kept with it). A native
	 * popover, just above the bar, like the tempo panel.
	 */
	import { useArranger } from '../../state/context.js';
	import { RECORD_TRACKS } from '../../takes/recordTracks.js';
	import { COUNT_IN_BARS } from '../../takes/countIn.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import SaveSongDialog from '../song/SaveSongDialog.svelte';
	import TakeList from './TakeList.svelte';

	/** @type {{ id: string }} */
	let { id } = $props();

	const { recording, song, layout } = useArranger();
	let saveDialogOpen = $state(false);

	const buttonText = $derived(
		{
			idle: 'Record',
			starting: 'Getting ready…',
			recording: 'Stop recording',
			saving: 'Saving the take…'
		}[recording.status]
	);

	function recordOrStop() {
		if (recording.status === 'recording') recording.stop();
		else if (recording.status === 'idle') recording.record();
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function addFile(event) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = ''; // the same file can be chosen again
		if (file) recording.addFromFile(file);
	}
</script>

<div
	{id}
	popover="auto"
	class="panel"
	style="bottom: {layout.barHeight + 8}px; --bar-height: {layout.barHeight}px"
>
	<div class="body ui-card">
		{#if song.isNew}
			<p>Save the song first: its takes are kept with it.</p>
			<button
				type="button"
				class="ui-button px-4 py-3 ui-button-primary"
				onclick={() => (saveDialogOpen = true)}
			>
				Save the song
			</button>
		{:else}
			<div class="tracks" role="radiogroup" aria-label="Record on">
				{#each RECORD_TRACKS as track (track.id)}
					<button
						type="button"
						role="radio"
						class="ui-button py-2"
						class:ui-button-on={recording.trackId === track.id}
						aria-checked={recording.trackId === track.id}
						disabled={recording.isRecording}
						onclick={() => (recording.trackId = track.id)}
						use:tooltip={TIPS.recording.track}
					>
						{track.name}
					</button>
				{/each}
			</div>

			<div class="count-in" role="radiogroup" aria-label="Count-in">
				<span>Count-in</span>
				{#each COUNT_IN_BARS as bars (bars)}
					<button
						type="button"
						role="radio"
						class="ui-button py-2"
						class:ui-button-on={settings.recording.countInBars === bars}
						aria-checked={settings.recording.countInBars === bars}
						disabled={recording.isRecording}
						onclick={() => (settings.recording.countInBars = bars)}
						use:tooltip={TIPS.recording.countIn}
					>
						{bars === 1 ? '1 bar' : `${bars} bars`}
					</button>
				{/each}
			</div>

			<button
				type="button"
				class="record ui-button"
				class:on={recording.status === 'recording'}
				disabled={recording.status === 'starting' || recording.status === 'saving'}
				onclick={recordOrStop}
				use:tooltip={TIPS.recording.record}
			>
				<span class="dot" aria-hidden="true"></span>
				{buttonText}
			</button>

			<p class="hint">
				Headphones on (wired if you can). You’ll hear the count-in clicks, then the band plays the
				song once while you record. If the tune starts with a pickup, the clicks stop where it
				starts: come in there.
			</p>

			{#if recording.lastInput}
				<p class="hint">
					Recorded from {recording.lastInput.name || 'the microphone'}, lined up for a
					{recording.lastInput.delayMs} ms delay.
				</p>
				{#if recording.lastInput.bluetooth}
					<p class="warning">
						That looks like Bluetooth headphones. They add a long delay and record in phone-call
						quality. Wired headphones work much better.
					</p>
				{/if}
			{/if}

			{#if recording.problem}
				<p class="warning" role="alert">{recording.problem}</p>
			{/if}

			<TakeList />

			<label class="add ui-button px-4 py-2" use:tooltip={TIPS.recording.addFile}>
				Add a take from a file…
				<input type="file" accept="audio/*,.wav" class="sr-only" onchange={addFile} />
			</label>
		{/if}
	</div>
</div>
<SaveSongDialog bind:open={saveDialogOpen} />

<style>
	.panel {
		position: fixed;
		inset: auto 0 0 0;
		margin: 0 auto;
		width: min(26rem, calc(100% - 2rem));
		padding: 0;
		border: none;
		background: transparent;
		overflow: visible;
	}

	.body {
		display: grid;
		grid-template-columns: minmax(0, 1fr); /* never wider than the panel */
		gap: 0.9rem;
		padding: 1.25rem;
		max-height: calc(100dvh - var(--bar-height) - 5rem);
		overflow-y: auto;
	}

	.tracks {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.4rem;
		font-size: 0.85rem;
	}

	.count-in {
		display: grid;
		grid-template-columns: auto 1fr 1fr;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
	}

	.count-in span {
		color: var(--color-ink-soft);
		padding-right: 0.3rem;
	}

	.record {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		height: 4rem;
		font-size: 1.25rem;
		font-weight: 800;
	}

	.dot {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: var(--color-danger);
	}

	.record.on .dot {
		border-radius: 0.2rem;
	}

	.hint {
		font-size: 0.85rem;
		color: var(--color-ink-soft);
	}

	.warning {
		font-size: 0.85rem;
		color: var(--color-danger);
	}

	.add {
		text-align: center;
		cursor: pointer;
	}
</style>
