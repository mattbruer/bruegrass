<script>
	/**
	 * A fill on the picked chord: how many bars it lasts (counted back from
	 * the end of the chord) and its notes, drawn on a piano roll that shows
	 * only those bars. It plays in place of the band's strum. The host says
	 * where it sits.
	 */
	import { useArranger } from '../../state/context.js';
	import { fillScore } from '../../instruments/fillScore.js';
	import { FILL_RANGE } from '../../instruments/guitarFill.js';
	import { gridTicks } from '../../melody/roll/ticks.js';
	import PianoRoll from '../pianoRoll/PianoRoll.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** The fill's notes snap to sixteenths (the smallest the band's strum uses), and a tap draws an eighth. */
	const GRID = gridTicks('sixteenth');
	const DRAWN_LENGTH = gridTicks('eighth');

	const arranger = useArranger();
	const { guitar } = arranger;

	const chord = $derived(guitar.picked);
	const fill = $derived(chord?.fill ?? null);
	const roll = $derived(
		chord && fill
			? fillScore(
					{ name: chord.name, bars: fill.bars, meter: fill.meter },
					arranger.melodyKey.spelling
				)
			: null
	);

	const barChoices = $derived(
		Array.from({ length: chord?.room ?? 0 }, (_, i) => ({
			id: String(i + 1),
			name: i === 0 ? '1 bar' : `${i + 1} bars`
		}))
	);
	const barTips = $derived(
		Object.fromEntries(barChoices.map(({ id }) => [id, TIPS.guitarEditor.fillBars]))
	);

	let selected = $state(-1);

	/** @param {import('../../melody/roll/editNotes.js').DrawnNote[]} notes */
	function commit(notes) {
		guitar.changeFill({ notes });
	}
</script>

{#if chord && fill && roll}
	<div class="flex flex-col gap-2">
		<div class="flex flex-wrap items-center gap-2">
			{#if barChoices.length > 1}
				<TabSwitch
					bind:value={() => String(fill.bars), (bars) => guitar.changeFill({ bars: Number(bars) })}
					tabs={barChoices}
					tips={barTips}
					label="How many bars the fill lasts"
				/>
			{/if}
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm"
				onclick={() => guitar.endFill()}
				use:tooltip={TIPS.guitarEditor.endFill}>Back to the band</button
			>
		</div>
		<PianoRoll
			score={roll.score}
			notes={fill.notes}
			chordsUnder={roll.chordsUnder}
			chordName={(name) => name}
			spelling={arranger.melodyKey.spelling}
			tonic={arranger.melodyKey.tonic}
			usualRange={FILL_RANGE}
			playable={FILL_RANGE}
			end={roll.end}
			gridStep={GRID}
			drawLength={DRAWN_LENGTH}
			readOnly={false}
			bind:selected
			colour={0}
			others={[]}
			options={[]}
			playing={false}
			playhead={() => null}
			onCommit={commit}
			onSound={() => {}}
		/>
	</div>
{/if}
