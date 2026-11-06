<script>
	/**
	 * Moving the capo with a melody: should the song go up with it (same
	 * shapes, the melody moves too), or keep its key (new shapes, the melody
	 * stays)? Closing it leaves the capo where it was.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { keyName } from '../../chart/key.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const arranger = useArranger();
	const { arrangement } = arranger;

	let capo = $derived(arranger.capoAsked);
	let semitones = $derived(capo === null ? 0 : capo - arrangement.capoFret);
	let key = $derived(arrangement.key);
	let soundsIn = $derived(key ? keyName(key, arrangement.pitchShift) : '');
	let raisedTo = $derived(key ? keyName(key, arrangement.pitchShift + semitones) : '');
	let shapes = $derived(key ? keyName(key) : '');
	let newShapes = $derived(key ? keyName(key, -semitones) : '');
	let higher = $derived(semitones > 0 ? 'higher' : 'lower');
	let distance = $derived(Math.abs(semitones) === 1 ? '1 fret' : `${Math.abs(semitones)} frets`);
</script>

<Dialog
	bind:open={() => capo !== null, (isOpen) => !isOpen && arranger.cancelCapo()}
	title={capo === 0 ? 'Take the capo off' : `Capo ${capo}`}
>
	{#if capo !== null}
		<div class="flex max-w-md flex-col gap-3 px-6 pt-4 pb-6">
			<p class="text-sm">The melody has to match the band. Which do you want?</p>

			<button
				type="button"
				class="ui-button px-4 py-3 text-left"
				onclick={() => arranger.raiseSongWithCapo()}
				use:tooltip={TIPS.capoChoice.raise}
			>
				<strong class="block">Move the song to {raisedTo || higher}</strong>
				<span class="text-sm text-ink-soft">
					Same {shapes} shapes; everything sounds {distance}
					{higher}, and the melody is rewritten to match.
				</span>
			</button>

			<button
				type="button"
				class="ui-button px-4 py-3 text-left"
				onclick={() => arranger.keepKeyWithCapo()}
				use:tooltip={TIPS.capoChoice.keep}
			>
				<strong class="block">Keep it in {soundsIn || 'the same key'}</strong>
				<span class="text-sm text-ink-soft">
					The chords change to {newShapes} shapes, so the song sounds the same. The melody stays as it
					is.
				</span>
			</button>
		</div>
	{/if}
</Dialog>
