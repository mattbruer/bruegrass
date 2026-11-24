<script>
	/** The picked bar's time signature: for this bar only, or from here on. */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { setBarTime } from '../../builder/chartEdits.js';
	import { TIME_CHOICES, timeBefore, timeFields } from '../../builder/barTimes.js';

	const SCOPES = /** @type {const} */ ([
		{ id: 'bar', name: 'This bar' },
		{ id: 'on', name: 'From here on' }
	]);

	/**
	 * @type {{
	 *   picked: import('./builder.js').Picked,
	 *   times: import('../../builder/barTimes.js').BarTime[][],
	 *   edit: import('./builder.js').Edit
	 * }}
	 */
	let { picked, times, edit } = $props();

	let time = $derived(times[picked.section][picked.bar]);
	let isFirstBar = $derived(picked.section === 0 && picked.bar === 0);
	/** A bar that changes the time for itself shows that; otherwise a change carries on. */
	let scope = $derived(/** @type {'bar' | 'on'} */ (time.changes === 'bar' ? 'bar' : 'on'));

	/** @param {string} chosen */
	function setTime(chosen) {
		const fields = timeFields(chosen, scope, timeBefore(times, picked));
		edit((c) => setBarTime(c, picked, fields));
	}
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex flex-wrap items-center gap-1.5">
		<span class="text-xs text-ink-soft">Time</span>
		{#each TIME_CHOICES as choice (choice)}
			<button
				type="button"
				class="ui-button px-2.5 py-1 text-sm font-semibold"
				class:ui-button-on={time.time === choice}
				use:tooltip={TIPS.builder.time}
				onclick={() => setTime(choice)}>{choice}</button
			>
		{/each}
	</div>
	{#if !isFirstBar}
		<div class="flex flex-wrap items-center gap-1.5">
			{#each SCOPES as { id, name } (id)}
				<button
					type="button"
					class="ui-button px-2.5 py-1 text-xs"
					class:ui-button-on={scope === id}
					use:tooltip={TIPS.builder.timeScope[id]}
					onclick={() => (scope = id)}>{name}</button
				>
			{/each}
		</div>
	{/if}
</div>
