<script>
	/**
	 * Why a chord fits a spot or not, note by note (chart/chordSuggestions.js
	 * chordBreakdown): each melody note's beat, length, whether it's on a
	 * strong beat, what it's doing, and what it is in the chord. The rules
	 * are written up in docs/theory/applying-the-theory.md.
	 */
	import { useArranger } from '../../state/context.js';
	import { chordBreakdown } from '../../chart/chordSuggestions.js';
	import { MELODY_CHANNEL } from '../../melody/harmony/partChannels.js';
	import { settings } from '$lib/settings/settings.svelte.js';

	/** @type {{ spot: import('../../chart/chordSpot.js').ChordSpot, name: string }} */
	let { spot, name } = $props();

	const { arrangement, melody } = useArranger();

	const breakdown = $derived(
		arrangement.isPlayable && melody.line && name
			? chordBreakdown(
					arrangement.sections,
					melody.line.notes.filter((note) => note.channel === MELODY_CHANNEL),
					spot,
					name,
					settings.chords.strongBeats
				)
			: null
	);
</script>

{#if breakdown}
	<section class="flex flex-col gap-1.5">
		<h4 class="text-sm font-semibold">
			The melody here, against {name}:
			<span class={breakdown.fits ? 'text-ink' : 'text-danger'}>
				{breakdown.fits ? 'it fits' : 'it doesn’t fit'}
			</span>
			<span class="font-normal text-ink-soft">({breakdown.does}, {breakdown.scale})</span>
		</h4>
		<table class="w-full text-sm">
			<thead class="text-left text-xs text-ink-soft">
				<tr>
					<th class="pr-2 font-normal">Beat</th>
					<th class="pr-2 font-normal">Note</th>
					<th class="pr-2 font-normal">In {name}</th>
					<th class="font-normal">Why</th>
				</tr>
			</thead>
			<tbody>
				{#each breakdown.rows as row, i (i)}
					<tr class="align-top" class:text-ink-soft={!row.counted}>
						<td class="pr-2 whitespace-nowrap">{row.beat}{row.strong ? ' ●' : ''}</td>
						<td class="pr-2 whitespace-nowrap"
							>{row.note} <span class="text-ink-soft">{row.length}</span></td
						>
						<td class="pr-2" class:text-danger={row.ruledOut}>{row.as}</td>
						<td>{row.role}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="text-xs text-ink-soft">
			● a strong beat (where the bass plays). Grey notes aren’t counted.
		</p>
	</section>
{/if}
