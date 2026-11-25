<script>
	/**
	 * The mandolin's chop for one chord of the song, to see and change: its
	 * frets typed G to E (`5,3,2,x`), the chord diagram (tap it too), and
	 * the notes it sounds, as letters, as what each is in the chord (root,
	 * 3rd, ♭7th, 9th) and on a staff. ‹ › step through the song's chords.
	 * A change is saved with the song for this chord at this place; Band's
	 * chop puts the band's own back. The host says where it sits.
	 */
	import { useArranger } from '../../state/context.js';
	import { COURSES, MAX_FRET, OPEN_MIDI } from '../../instruments/mandolin.js';
	import { readFrets, writeFrets } from '../../voicings/typedFrets.js';
	import { noteInChord } from '../../theory/noteInChord.js';
	import { writtenNote } from '../../chart/key.js';
	import { withoutBass, withoutVariant } from '../../instruments/chordBook.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import ChopDiagram from './ChopDiagram.svelte';
	import NotesOnStaff from '../melody/NotesOnStaff.svelte';

	/**
	 * @type {{ name: string, onPick: (start: number) => void, onClose?: () => void }}
	 *   name: the lane's name; onPick: a chord was stepped to (the host moves the playhead there)
	 */
	let { name, onPick, onClose } = $props();

	const { mandolin } = useArranger();

	/** @type {import('$lib/arranger/voicings/typedFrets.js').FrettedNeck} */
	const NECK = { strings: 4, maxFret: MAX_FRET, order: 'G to E', example: '5,3,2,x' };

	const chop = $derived(mandolin.picked);
	const index = $derived(chop ? mandolin.chops.indexOf(chop) : -1);
	const frets = $derived(chop?.chop.frets ?? []);

	/** What's typed: the chop's frets, until you type. */
	let typed = $derived(writeFrets(frets));
	const problem = $derived(readFrets(typed, NECK).error);

	/** Each sounding course's note, spelled and named against the chord. */
	const notes = $derived(
		chop
			? frets.flatMap((fret, course) => {
					if (fret === null) return [];
					const pitch = OPEN_MIDI[course] + fret;
					const note = noteInChord(pitch, withoutBass(withoutVariant(chop.sounds)));
					return note ? [{ course, fret, pitch, ...note }] : [];
				})
			: []
	);
	const marks = $derived(
		COURSES.map((_, course) => {
			const note = notes.find((each) => each.course === course);
			return note ? shortDegree(note.degree) : null;
		})
	);
	const inChord = $derived(
		COURSES.map((_, course) => notes.find((each) => each.course === course)?.inChord ?? true)
	);

	/** @param {string} degree "b7" → "♭7", "1" → "R" */
	function shortDegree(degree) {
		return degree === '1' ? 'R' : degree.replace(/b/g, '♭').replace(/#/g, '♯');
	}

	/** @param {string} text */
	function type(text) {
		typed = text;
		const read = readFrets(text, NECK);
		if (read.frets && writeFrets(read.frets) !== writeFrets(frets)) mandolin.change(read.frets);
	}

	/** @param {number} step -1 the chord before, 1 the chord after */
	function stepBy(step) {
		const next = mandolin.chops[index + step];
		if (next) onPick(next.start);
	}
</script>

<section class="flex flex-col gap-3 ui-card p-3 sm:p-4" aria-label="The mandolin's chop">
	<div class="flex flex-wrap items-center gap-2">
		<h2 class="text-sm font-bold">{name}</h2>
		{#if chop}
			<div class="flex items-center gap-1">
				<button
					type="button"
					class="ui-button px-3 py-1 text-sm"
					aria-label="The chord before"
					disabled={index <= 0}
					onclick={() => stepBy(-1)}
					use:tooltip={TIPS.chopEditor.before}>‹</button
				>
				<span class="chord" aria-live="polite">
					{chop.name}{#if chop.sounds !== chop.name}<span class="text-ink-soft">
							(sounds {chop.sounds})</span
						>{/if}
				</span>
				<button
					type="button"
					class="ui-button px-3 py-1 text-sm"
					aria-label="The chord after"
					disabled={index >= mandolin.chops.length - 1}
					onclick={() => stepBy(1)}
					use:tooltip={TIPS.chopEditor.after}>›</button
				>
			</div>
			<span class="text-xs text-ink-soft">bar {chop.bar}</span>
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

	{#if !chop}
		<p class="text-sm text-ink-soft">No chords to chop yet: write some in the chart.</p>
	{:else}
		<div class="flex flex-wrap items-start gap-x-6 gap-y-4">
			<ChopDiagram
				{frets}
				{marks}
				{inChord}
				courses={COURSES}
				maxFret={MAX_FRET}
				onChange={(next) => mandolin.change(next)}
			/>

			<div class="flex min-w-56 flex-1 flex-col gap-3">
				<label class="block">
					<span class="mb-1 block text-sm">Frets, G to E</span>
					<input
						value={typed}
						oninput={(event) => type(event.currentTarget.value)}
						placeholder="5,3,2,x"
						maxlength="20"
						autocapitalize="off"
						autocomplete="off"
						spellcheck="false"
						aria-invalid={problem !== ''}
						use:tooltip={TIPS.chopEditor.frets}
						class="w-40 ui-field px-3 py-2 font-mono pointer-coarse:text-base"
					/>
				</label>
				<p class="text-sm" class:text-danger={problem} role={problem ? 'alert' : undefined}>
					{#if problem}
						{problem}
					{:else if chop.edited}
						Your chop for this {chop.name}. The next chords lead on from it.
					{:else}
						The band’s chop. Change it here or on the diagram.
					{/if}
				</p>

				<table class="notes">
					<tbody>
						{#each notes as note (note.course)}
							<tr class:outside={!note.inChord}>
								<th scope="row">{COURSES[note.course]} {note.fret}</th>
								<td class="letter">{writtenNote(note)}</td>
								<td>{note.words}{note.inChord ? '' : ' (not in the chord)'}</td>
							</tr>
						{/each}
					</tbody>
				</table>

				<NotesOnStaff
					{notes}
					label="On the staff: {notes.map((note) => writtenNote(note)).join(', ')}"
				/>

				{#if chop.edited}
					<button
						type="button"
						class="self-start ui-button px-3 py-1.5 text-sm"
						onclick={() => mandolin.change(null)}
						use:tooltip={TIPS.chopEditor.bands}>Band’s chop</button
					>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	.chord {
		min-width: 4rem;
		text-align: center;
		font-weight: 700;
	}

	.notes {
		width: max-content;
		font-size: 0.875rem;
		border-collapse: collapse;
	}

	.notes th {
		padding: 0.15rem 0.75rem 0.15rem 0;
		text-align: left;
		font-weight: 400;
		color: var(--color-ink-soft);
		font-family: var(--font-mono, monospace);
	}

	.notes td {
		padding: 0.15rem 0.75rem 0.15rem 0;
	}

	.letter {
		font-weight: 700;
		min-width: 2rem;
	}

	.outside td {
		color: var(--color-danger);
	}
</style>
