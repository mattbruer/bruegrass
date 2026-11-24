<script>
	/** The Bar tab: add, copy, hold or delete the picked bar, and set its time. */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { deleteBar, duplicateBar, holdBar, insertBar } from '../../builder/chartEdits.js';
	import BarTime from './BarTime.svelte';

	/**
	 * @type {{
	 *   chart: import('../../chart/writtenChart.js').WrittenChart,
	 *   picked: import('./builder.js').Picked,
	 *   times: import('../../builder/barTimes.js').BarTime[][],
	 *   edit: import('./builder.js').Edit
	 * }}
	 */
	let { chart, picked, times, edit } = $props();

	let bar = $derived(chart.sections[picked.section].bars[picked.bar]);
	let canHold = $derived(picked.bar > 0 || picked.section > 0);
</script>

<div class="flex flex-wrap gap-1.5">
	<button
		type="button"
		class="ui-button px-3 py-1.5 text-sm"
		use:tooltip={TIPS.builder.insertBefore}
		onclick={() => edit((c) => insertBar(c, picked, [...bar.chords]))}>Add bar before</button
	>
	<button
		type="button"
		class="ui-button px-3 py-1.5 text-sm"
		use:tooltip={TIPS.builder.copyBar}
		onclick={() => edit((c) => duplicateBar(c, picked), { ...picked, bar: picked.bar + 1 })}
		>Copy bar</button
	>
	<button
		type="button"
		class="ui-button px-3 py-1.5 text-sm"
		class:ui-button-on={bar.chords.length === 0}
		disabled={!canHold}
		use:tooltip={TIPS.builder.hold}
		onclick={() => edit((c) => holdBar(c, picked))}>Hold chord</button
	>
	<button
		type="button"
		class="ui-button px-3 py-1.5 text-sm text-danger"
		use:tooltip={TIPS.builder.deleteBar}
		onclick={() => edit((c) => deleteBar(c, picked))}>Delete bar</button
	>
</div>

<BarTime {picked} {times} {edit} />
