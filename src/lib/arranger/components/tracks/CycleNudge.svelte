<script>
	/**
	 * The cycle a bar at a time, for a finger: its start and end earlier or
	 * later, or the whole cycle slid along. Works however little of the song
	 * is on screen (a phone shows a bar or two).
	 */
	import { barLines, cycleBarNumbers, nudgedCycle } from '../../transcription/cycle.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @typedef {import('../../transcription/cycle.js').Cycle} Cycle */

	/**
	 * @type {{
	 *   cycle: { region: Cycle | null, set: (region: Cycle) => void },
	 *   ruler: import('../../tracks/ruler.js').RulerBar[]
	 * }}
	 */
	let { cycle, ruler } = $props();

	const lines = $derived(barLines(ruler));
	const bars = $derived(cycle.region ? cycleBarNumbers(cycle.region, ruler) : null);

	const ROWS = /** @type {const} */ ([
		{ end: 'from', name: 'Start', earlier: '−', later: '+', tips: TIPS.cycle.start },
		{ end: 'to', name: 'End', earlier: '−', later: '+', tips: TIPS.cycle.end },
		{ end: 'both', name: 'Move', earlier: '‹', later: '›', tips: TIPS.cycle.move }
	]);

	/**
	 * @param {'from' | 'to' | 'both'} end
	 * @param {1 | -1} direction
	 */
	function nudged(end, direction) {
		return cycle.region ? nudgedCycle(cycle.region, end, direction, lines) : null;
	}
</script>

{#if cycle.region}
	<div class="grid grid-cols-[auto_auto_auto] items-center gap-x-2 gap-y-1.5 pb-2">
		<span class="col-span-3 text-sm text-ink-soft tabular-nums" aria-live="polite">
			{bars ? (bars.from === bars.to ? `Bar ${bars.from}` : `Bars ${bars.from}–${bars.to}`) : ''}
		</span>
		{#each ROWS as row (row.end)}
			{@const earlier = nudged(row.end, -1)}
			{@const later = nudged(row.end, 1)}
			<span class="text-sm">{row.name}</span>
			<button
				type="button"
				class="ui-button px-4 py-1.5"
				aria-label="{row.name} a bar earlier"
				disabled={!earlier}
				onclick={() => earlier && cycle.set(earlier)}
				use:tooltip={row.tips.earlier}>{row.earlier}</button
			>
			<button
				type="button"
				class="ui-button px-4 py-1.5"
				aria-label="{row.name} a bar later"
				disabled={!later}
				onclick={() => later && cycle.set(later)}
				use:tooltip={row.tips.later}>{row.later}</button
			>
		{/each}
	</div>
{/if}
