<script>
	/**
	 * Export the song: the full mix as a WAV, stems (a zip of WAVs, one per
	 * instrument) for a DAW, or the MIDI file. The MIDI choice is for a
	 * computer DAW like Logic, so touch screens don't offer it.
	 *
	 * Rendering takes a few seconds (it's faster than real time), and stops
	 * playback first: an offline render takes over the audio engine.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { exportAudio } from '../../export/exportAudio.js';
	import { downloadArrangementMidi } from '../../export/downloadMidi.js';
	import { readWrittenBass } from '../../bass/readBass.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ open: boolean }} */
	let { open = $bindable(false) } = $props();

	const arranger = useArranger();
	const { arrangement, melody, player, song } = arranger;

	const CHOICES = /** @type {const} */ ([
		{
			id: 'mix',
			name: 'Full mix',
			about: 'One WAV file, as you hear it: levels, EQ, reverb and loudness.'
		},
		{ id: 'stems', name: 'Stems', about: 'A WAV per instrument, in a zip, lined up for a DAW.' },
		{
			id: 'midi',
			name: 'MIDI',
			about: 'The notes as a .mid file, for your own instruments in a DAW.'
		}
	]);

	let choice = $state(/** @type {'mix' | 'stems' | 'midi'} */ ('mix'));
	/** Stems with the mix's EQ, levels, pan and reverb (off: dry, as a DAW mix starts). */
	let processed = $state(false);
	/** Put the full mix in the stems zip too. */
	let withMix = $state(true);
	let busy = $state(false);
	let problem = $state('');

	// Each time it opens, start clean (no problem left over from last time)
	$effect(() => {
		if (open) problem = '';
	});

	async function exportNow() {
		if (arrangement.error) {
			problem = arrangement.error;
			return;
		}
		problem = '';
		busy = true;
		player.stop();
		const songToExport = {
			name: song.name || arranger.title,
			sections: arrangement.sections,
			bpm: arrangement.bpm,
			capo: arrangement.capoFret,
			transpose: arrangement.transpose,
			melody: melody.line,
			bass: await readWrittenBass(arranger.bass.notation)
		};
		try {
			if (choice === 'midi') downloadArrangementMidi(songToExport);
			else if (choice === 'mix') await exportAudio(songToExport, { kind: 'mix' });
			else await exportAudio(songToExport, { kind: 'stems', processed, withMix });
			open = false;
		} catch (error) {
			// Some browser errors have only a name (an empty message), so fall back to it
			const detail = error instanceof Error ? error.message || error.name : String(error);
			problem = `The export didn't work: ${detail}`;
		} finally {
			busy = false;
		}
	}
</script>

<Dialog bind:open title="Export">
	<div class="px-6 pt-4 pb-6">
		<div class="flex flex-col gap-2" role="radiogroup" aria-label="What to export">
			{#each CHOICES as option (option.id)}
				<button
					type="button"
					role="radio"
					aria-checked={choice === option.id}
					class={[
						'ui-button px-4 py-2 text-left',
						choice === option.id && 'ui-button-on',
						// MIDI is for a computer DAW, so touch screens don't offer it
						option.id === 'midi' && 'pointer-coarse:hidden'
					]}
					onclick={() => (choice = option.id)}
					use:tooltip={TIPS.export[option.id]}
				>
					<span class="block font-semibold">{option.name}</span>
					<span class="block text-xs font-normal text-ink-soft">{option.about}</span>
				</button>
			{/each}
		</div>

		{#if choice === 'stems'}
			<div class="mt-4 flex flex-col gap-2 ui-well p-4 text-sm">
				<label class="flex items-start gap-2" use:tooltip={TIPS.export.processed}>
					<input type="checkbox" bind:checked={processed} class="mt-1" />
					<span>
						Include my mix (levels, pan, EQ, reverb)
						<span class="block text-xs text-ink-soft">
							Off: dry stems, the usual starting point for mixing in a DAW.
						</span>
					</span>
				</label>
				<label class="flex items-start gap-2" use:tooltip={TIPS.export.withMix}>
					<input type="checkbox" bind:checked={withMix} class="mt-1" />
					<span>Add the full mix to the zip</span>
				</label>
			</div>
		{/if}

		<p class="mt-3 text-xs text-ink-soft">
			{choice === 'midi'
				? 'One pass of the arrangement.'
				: 'WAV, 48 kHz, 24-bit. One pass of the whole arrangement, lined up with the .mid file.'}
		</p>

		{#if problem}
			<p class="mt-3 text-sm text-danger" role="alert">{problem}</p>
		{/if}

		<div class="mt-5 flex justify-end gap-3">
			<button type="button" class="ui-button px-4 py-2" onclick={() => (open = false)}>
				Cancel
			</button>
			<button
				type="button"
				class="ui-button px-5 py-2 ui-button-primary"
				disabled={busy}
				onclick={exportNow}
			>
				{busy ? 'Rendering…' : 'Export'}
			</button>
		</div>
	</div>
</Dialog>
