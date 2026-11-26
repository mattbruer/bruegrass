<script>
	/**
	 * How the guitar plays one chord of the song, to see and change, in two
	 * parts: the shape the left hand holds (typed low E to high e, or tapped
	 * on the diagram), and what the right hand does on each beat (the boom's
	 * one low note, the chuck's strummed strings, or a note of your own
	 * instead, for a run between chords: never the band's own idea). Or
	 * the chord's last bars can be a fill you write on a small piano roll,
	 * played in place of the strum. Pick a beat and the
	 * diagram lights the strings it plays. The notes are named against the
	 * chord, listed and drawn on a staff. ‹ › step through the song's chords.
	 * A change is saved with the song for this chord at this place; Band's
	 * guitar forgets it. The host says where it sits.
	 */
	import { useArranger } from '../../state/context.js';
	import { MAX_FRET, OPEN_MIDI } from '../../instruments/guitar.js';
	import { GUITAR_NECK } from '../../voicings/typedFrets.js';
	import { dotsFor, fretNotes } from '../../voicings/fretNotes.js';
	import { writtenNote } from '../../chart/key.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import VoicingHeader from '../voicings/VoicingHeader.svelte';
	import ChordDiagram from '../voicings/ChordDiagram.svelte';
	import FretsField from '../voicings/FretsField.svelte';
	import FretNotesList from '../voicings/FretNotesList.svelte';
	import NotesOnStaff from '../melody/NotesOnStaff.svelte';
	import BeatPattern from './BeatPattern.svelte';
	import BeatStrings from './BeatStrings.svelte';
	import NotePicker from './NotePicker.svelte';
	import FretStepper from './FretStepper.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import FillEditor from './FillEditor.svelte';
	import AccentButton from './AccentButton.svelte';
	import SlurPicker from './SlurPicker.svelte';
	import { editOf } from '../../instruments/slurs.js';
	import PatternTools from './PatternTools.svelte';

	/**
	 * @type {{
	 *   name: string,
	 *   onPick: (start: number) => void,
	 *   onClose?: () => void
	 * }}
	 *   name: the lane's name; onPick: a chord was stepped to (the host moves the playhead there)
	 */
	let { name, onPick, onClose } = $props();

	const { guitar } = useArranger();

	/** The strings' names, low E first. */
	const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

	const chord = $derived(guitar.picked);
	const shape = $derived(chord?.shape ?? []);
	const notes = $derived(chord ? fretNotes(shape, OPEN_MIDI, chord.shapeName) : []);
	const dots = $derived(dotsFor(notes, STRING_NAMES.length));

	/** Which of the chord's beats is picked (its first, a boom, to begin with). */
	let selected = $state(0);
	const beat = $derived(chord?.beats[Math.min(selected, chord.beats.length - 1)] ?? null);

	/** The first beat with a held or choked strum: the guitar plays nothing after it on this chord. */
	const firstEnd = $derived(
		chord?.beats.findIndex((each) => each.strum && each.strum.end !== 'chuck') ?? -1
	);

	/** Each beat's card: what it plays. */
	const cards = $derived(
		chord
			? chord.beats.map((each, i) => ({
					kind: kindOf(each),
					mark: each.strum ? (STRUM_MARKS[each.strum.end] ?? '') : '',
					beatInBar: each.beatInBar,
					accent: each.accent,
					slur: slurWords(each.slur),
					notes: firstEnd >= 0 && i > firstEnd ? [] : playedOn(each),
					yours:
						each.note !== null ||
						each.strum !== null ||
						(each.role === 'boom' ? chord.booms[each.place].yours : chord.yours.chucks)
				}))
			: []
	);
	/** @param {number} fret */
	const fretWord = (fret) => (fret === 0 ? 'open' : String(fret));

	/** @param {import('../../instruments/slurs.js').Slur | null} slur how a card says it: "D open → 2" */
	function slurWords(slur) {
		return slur ? `${STRING_NAMES[slur.string]} ${fretWord(slur.from)} → ${fretWord(slur.to)}` : '';
	}

	/** @param {import('../../instruments/slurs.js').SlurEdit | null} slur the picked beat's slur (null: none) */
	function setSlur(slur) {
		if (!chord || !beat) return;
		const slurs = chord.beats.map((each) => (each.slur ? editOf(each.slur) : null));
		slurs[chord.beats.indexOf(beat)] = slur;
		guitar.change({ slurs });
	}

	/** The strings the picked beat plays, lit on the diagram. */
	const lit = $derived(beat ? stringsOf(beat) : null);

	/** @param {import('../../instruments/guitarPlan.js').ChordBeat} each */
	function stringsOf(each) {
		if (!chord) return [];
		if (each.note) return [each.note.string];
		if (each.strum) return each.strum.strings;
		const played =
			each.role === 'boom' ? [chord.booms[each.place].string] : chord.chucks[each.place];
		return each.slur && !played.includes(each.slur.string) ? [each.slur.string, ...played] : played;
	}

	/**
	 * What a beat plays, named against the chord. A boom may be off the
	 * shape (a slash chord's bass), so it's named from its own fret.
	 * @param {import('../../instruments/guitarPlan.js').ChordBeat} each
	 */
	function playedOn(each) {
		if (!chord) return [];
		if (each.note) return single(each.note);
		if (each.strum) return notes.filter((note) => each.strum?.strings.includes(note.string));
		if (each.role === 'chuck') {
			return notes.filter((note) => chord.chucks[each.place].includes(note.string));
		}
		return single(chord.booms[each.place]);
	}

	/** @param {{ string: number, fret: number }} picked one note, named against the chord */
	function single(picked) {
		if (!chord) return [];
		const frets = STRING_NAMES.map((_, string) => (string === picked.string ? picked.fret : null));
		return fretNotes(frets, OPEN_MIDI, chord.shapeName);
	}

	/** @param {import('../../instruments/guitarPlan.js').ChordBeat} each a beat with a note: its letter, for the diagram */
	function noteMark(each) {
		const [named] = playedOn(each);
		return named ? writtenNote(named) : '';
	}

	/**
	 * What a beat is: the band's boom or chuck, a strum of yours (a chuck on a
	 * boom's beat, held `~` or choked `!`), or a note of yours.
	 * @param {import('../../instruments/guitarPlan.js').ChordBeat} each
	 * @returns {'boom' | 'chuck' | 'strum' | 'note'}
	 */
	function kindOf(each) {
		if (each.note) return 'note';
		return each.strum ? 'strum' : each.role;
	}

	/** How a strum's ending is written, beside its name. */
	const STRUM_MARKS = { chuck: '', ring: ' ~', choke: ' !' };

	/** How a strum can end. */
	const ENDS = [
		{ id: 'chuck', name: 'Plain' },
		{ id: 'ring', name: 'Held ~' },
		{ id: 'choke', name: 'Choked !' }
	];

	/** What the picked beat can be. */
	const kinds = $derived(
		beat
			? [
					beat.role === 'boom' ? { id: 'boom', name: 'Boom' } : { id: 'chuck', name: 'Chuck' },
					{ id: 'strum', name: 'Strum' },
					{ id: 'note', name: 'Note' }
				]
			: []
	);

	/** @param {import('../../instruments/guitarEdits.js').PickedNote | null} note the picked beat's own note (null: the band's) */
	function setNote(note) {
		if (!chord || !beat) return;
		const notes = chord.beats.map((each) => each.note);
		notes[chord.beats.indexOf(beat)] = note;
		guitar.change({ notes });
	}

	/** @param {boolean} on the picked beat accented (played louder) or not */
	function setAccent(on) {
		if (!chord || !beat) return;
		const accents = chord.beats.map((each) => each.accent);
		accents[chord.beats.indexOf(beat)] = on;
		guitar.change({ accents });
	}

	/** Strings a new strum starts on: a chuck's, or every string for a held or choked one. */
	const STRUM_STRINGS = { chuck: [3, 4, 5], ring: [0, 1, 2, 3, 4, 5], choke: [0, 1, 2, 3, 4, 5] };

	/**
	 * @param {'chuck' | 'ring' | 'choke'} end how the picked strum now ends; strings still on the last ending's
	 * starting strings move to the new one's
	 */
	function setEnd(end) {
		if (!chord || !beat?.strum) return;
		const { end: was, strings } = beat.strum;
		const untouched = strings.join() === STRUM_STRINGS[was].join();
		const strums = chord.beats.map((each) => each.strum);
		strums[chord.beats.indexOf(beat)] = { end, strings: untouched ? STRUM_STRINGS[end] : strings };
		guitar.change({ strums });
	}

	/** @param {string} kind what the picked beat becomes: the band's boom or chuck, a strum of yours, or a note of yours (starting on the chord's boom) */
	function setKind(kind) {
		if (!chord || !beat) return;
		const index = chord.beats.indexOf(beat);
		const notes = chord.beats.map((each) => each.note);
		const strums = chord.beats.map((each) => each.strum);
		const { string, fret } = chord.booms[0];
		notes[index] = kind === 'note' ? (beat.note ?? { string, fret }) : null;
		strums[index] =
			kind === 'strum' ? (beat.strum ?? { end: 'chuck', strings: STRUM_STRINGS.chuck }) : null;
		guitar.change({ notes, strums });
	}

	/** @param {import('../../instruments/guitarEdits.js').PickedNote} picked the picked boom's note, on any fret */
	function setBoom(picked) {
		if (!chord || !beat) return;
		const booms = chord.booms.map((boom) =>
			boom.yours ? { string: boom.string, fret: boom.fret } : null
		);
		booms[beat.place] = picked;
		guitar.change({ booms });
	}

	/** A boom off the shape (a fret the shape doesn't hold on its string): the diagram rings it. */
	const boomOffShape = $derived.by(() => {
		if (!chord || !beat || beat.note || beat.strum || beat.role !== 'boom') return null;
		const boom = chord.booms[beat.place];
		return shape[boom.string] === boom.fret ? null : boom;
	});

	/** @param {number[]} strings what the picked beat now plays */
	function changeBeat(strings) {
		if (!chord || !beat) return;
		if (beat.strum) {
			const strums = chord.beats.map((each) => each.strum);
			strums[chord.beats.indexOf(beat)] = { end: beat.strum.end, strings };
			guitar.change({ strums });
		} else if (beat.role === 'boom') {
			const string = strings[0];
			setBoom({ string, fret: shape[string] ?? 0 });
		} else {
			const chucks = chord.chucks.map((each) => [...each]);
			chucks[beat.place] = strings;
			guitar.change({ chucks });
		}
	}
</script>

<section class="flex flex-col gap-3 ui-card p-3 sm:p-4" aria-label="The guitar's chord">
	<VoicingHeader {name} chords={guitar.chords} picked={chord} {onPick} {onClose} />

	{#if !chord}
		<p class="text-sm text-ink-soft">No chords to play yet: write some in the chart.</p>
	{:else}
		<PatternTools />
		<div class="flex flex-wrap items-start gap-x-6 gap-y-4">
			<ChordDiagram
				frets={shape}
				marks={dots.marks}
				inChord={dots.inChord}
				courses={STRING_NAMES}
				maxFret={MAX_FRET}
				instrument="Guitar"
				{lit}
				picked={beat?.note
					? { ...beat.note, mark: noteMark(beat) }
					: boomOffShape
						? { string: boomOffShape.string, fret: boomOffShape.fret, mark: noteMark(beat) }
						: null}
				onChange={(next) => guitar.change({ shape: next })}
			/>

			<div class="flex min-w-64 flex-1 flex-col gap-4">
				<div class="flex flex-col gap-2">
					<h3 class="heading">The right hand, beat by beat</h3>
					{#if chord.fill}
						<FillEditor />
					{:else}
						<BeatPattern
							{cards}
							strings={STRING_NAMES}
							selected={Math.min(selected, cards.length - 1)}
							onSelect={(i) => (selected = i)}
						/>
						{#if beat}
							<div class="flex flex-wrap items-center gap-2">
								<TabSwitch
									bind:value={() => kindOf(beat), setKind}
									tabs={kinds}
									tips={TIPS.guitarEditor.kinds}
									label="What this beat plays"
								/>
								<AccentButton on={beat.accent} onChange={setAccent} />
							</div>
							{#if beat.strum}
								<TabSwitch
									bind:value={() => beat.strum?.end ?? 'chuck', setEnd}
									tabs={ENDS}
									tips={TIPS.guitarEditor.strumEnds}
									label="How this strum ends"
								/>
							{/if}
						{/if}
						{#if beat?.note}
							<NotePicker
								note={beat.note}
								strings={STRING_NAMES}
								open={OPEN_MIDI}
								maxFret={MAX_FRET}
								chordName={chord.shapeName}
								onChange={setNote}
							/>
						{:else if beat}
							<BeatStrings
								role={beat.strum ? 'chuck' : beat.role}
								beatNumber={beat.beatInBar + 1}
								chosen={boomOffShape ? [] : stringsOf(beat)}
								{notes}
								strings={STRING_NAMES}
								onChange={changeBeat}
							/>
							{#if beat.role === 'boom' && !beat.strum}
								{@const boom = chord.booms[beat.place]}
								<div class="flex flex-wrap items-center gap-2">
									<span class="text-sm"
										>Or another fret on the {STRING_NAMES[boom.string]} string:</span
									>
									<FretStepper
										fret={boom.fret}
										maxFret={MAX_FRET}
										onChange={(fret) => setBoom({ string: boom.string, fret })}
									/>
								</div>
							{/if}
							{#if !beat.strum}
								<SlurPicker
									slur={beat.slur}
									{shape}
									strings={STRING_NAMES}
									boom={beat.role === 'boom' ? chord.booms[beat.place] : null}
									strummed={beat.role === 'chuck' ? chord.chucks[beat.place] : []}
									onChange={setSlur}
								/>
							{/if}
						{/if}
						<button
							type="button"
							class="self-start ui-button px-3 py-1.5 text-sm"
							disabled={chord.room === 0}
							onclick={() => guitar.writeFill()}
							use:tooltip={TIPS.guitarEditor.writeFill}>Write a fill here…</button
						>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<h3 class="heading">The left hand: the shape</h3>
					<FretsField
						frets={shape}
						neck={GUITAR_NECK}
						tip={TIPS.guitarEditor.frets}
						note={chord.yours.shape
							? `Your shape for this ${chord.shapeName}.`
							: 'The band’s shape. Change it here or on the diagram.'}
						onChange={(next) => guitar.change({ shape: next })}
					/>
					<FretNotesList {notes} strings={STRING_NAMES} />
					<NotesOnStaff
						{notes}
						clef="treble-8"
						label="On the staff: {notes.map((note) => writtenNote(note)).join(', ')}"
					/>
				</div>

				{#if chord.edited}
					<button
						type="button"
						class="self-start ui-button px-3 py-1.5 text-sm"
						onclick={() => guitar.reset()}
						use:tooltip={TIPS.guitarEditor.bands}>Band’s guitar</button
					>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	.heading {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}
</style>
