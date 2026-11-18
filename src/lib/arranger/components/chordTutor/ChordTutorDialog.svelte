<script>
	/**
	 * A theory tutor for one chord of the chart: what to play over it (in
	 * plain words, then the scale's name, and a button to hear it), the note
	 * that gives it its sound, and what it does in the song. Opens from any
	 * chord on the scrolling strip, whatever the chord display.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import CorrectReading from './CorrectReading.svelte';
	import { useArranger } from '../../state/context.js';
	import { placeId } from '../../chart/chartAnalysis.js';
	import { chordLesson } from '../../theory/chordLesson.js';
	import { withoutVariant } from '../../instruments/chordBook.js';
	import { auditionScale } from '../../playback/auditionScale.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ place: import('../../chart/chartAnalysis.js').ChordPlace | null }} */
	let { place = $bindable() } = $props();

	const { arrangement } = useArranger();

	let found = $derived(place ? arrangement.analysis.get(placeId(place)) : undefined);
	let name = $derived(found ? withoutVariant(found.name) : '');
	let lesson = $derived(found ? chordLesson(name, found, found.key) : null);

	function hearScale() {
		if (!lesson) return;
		// The lesson is in the chord's key on the chart (the shapes); the capo raises what the band sounds
		const pitches = lesson.pitches.map((pitch) => pitch + arrangement.capoFret);
		auditionScale(pitches, arrangement.transpose).catch(console.error);
	}
</script>

<Dialog bind:open={() => place !== null, (isOpen) => !isOpen && (place = null)} title={name}>
	{#if place && found && lesson}
		<div class="flex max-w-md flex-col gap-5 px-6 pt-4 pb-6">
			<p class="text-sm text-ink-soft">Notes: {lesson.chordNotes.join(' ')}</p>

			<section class="flex flex-col gap-2">
				<h3 class="font-semibold">What to play over it</h3>
				<p>{lesson.scale.plain}</p>
				<p class="text-sm text-ink-soft">
					{#if lesson.scale.name}{lesson.scale.name}:{/if}
					{lesson.scale.notes.join(' ')}
				</p>
				<button
					type="button"
					class="self-start ui-button px-4 py-2 font-semibold"
					onclick={hearScale}
					use:tooltip={TIPS.chordTutor.hearScale}
				>
					▶ Hear it
				</button>
			</section>

			<section class="flex flex-col gap-2">
				<h3 class="font-semibold">The note to lean on</h3>
				<p>{lesson.leanOn}</p>
			</section>

			<section class="flex flex-col gap-2">
				<h3 class="font-semibold">What it does: {found.mark ?? found.label}</h3>
				<p class="text-sm">{found.why}</p>
				<details>
					<summary class="cursor-pointer text-sm text-accent">Not right?</summary>
					<div class="pt-3">
						<CorrectReading {place} {found} />
					</div>
				</details>
			</section>
		</div>
	{/if}
</Dialog>
