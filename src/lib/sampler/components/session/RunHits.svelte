<!--
	The hits found in a recording of many: tick the ones to keep (as many
	as there are takes to fill), listen to each as it would be cut, and see
	what the checks found. Keep (K) cuts the ticked ones out as takes.
	Played to a click, each hit shows its timing against your own beat.
-->
<script>
	import { formatDb } from '../../takeSummary.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ session: import('../../session/RecordingSession.svelte.js').RecordingSession }} */
	let { session } = $props();

	const run = $derived(session.run);
	const slots = $derived(session.slots);
	const idle = $derived(!session.recording && !session.busy);

	/** @param {number | null} cents */
	const formatCents = (cents) =>
		cents === null
			? ''
			: Math.abs(cents) < 0.5
				? 'in tune'
				: `${cents > 0 ? '+' : '−'}${Math.abs(cents).toFixed(0)} cents`;

	/** @param {import('../../session/RecordingSession.svelte.js').Hit} hit how long it rings, as cut */
	const seconds = (hit) =>
		(hit.analysis.trim.end - hit.analysis.trim.start) / (session.shown?.record.sampleRate ?? 48000);

	/** @param {number} ms against the beat as you played it (your average is on the beat) */
	const formatTiming = (ms) =>
		Math.abs(ms) < 2.5
			? 'on the beat'
			: `${Math.abs(ms).toFixed(0)} ms ${ms < 0 ? 'early' : 'late'}`;

	const filling = $derived(
		slots.length === 1
			? `take ${slots[0].take}`
			: `takes ${slots.map((slot) => slot.take).join(', ')}`
	);
</script>

{#if run}
	<p class="text-ink-soft">
		<span class="font-semibold text-ink">{run.hits.length} hits found.</span>
		Tick up to {slots.length} to keep ({filling}); the rest are thrown away.
	</p>
	<ol class="mt-2 space-y-1">
		{#each run.hits as hit, index (hit.range.start)}
			{@const problems = session.hitProblems(index)}
			{@const chosen = run.chosen.includes(index)}
			<li class="flex flex-wrap items-center gap-x-3 gap-y-1">
				<label class="flex items-center gap-2 font-semibold">
					<input
						type="checkbox"
						checked={chosen}
						disabled={!idle || (!chosen && run.chosen.length >= slots.length)}
						onchange={() => session.toggleChosen(index)}
						use:tooltip={TIPS.sampler.chooseHit}
					/>
					Hit {index + 1}
				</label>
				<button
					type="button"
					class="ui-button px-3 py-1 text-xs"
					disabled={!idle}
					onclick={() => session.playHit(index)}
					use:tooltip={TIPS.sampler.playHit}
				>
					{session.playing && session.playingHit === index ? 'Stop' : 'Listen'}
				</button>
				<span class="text-ink-soft tabular-nums">
					{seconds(hit).toFixed(1)} s · {formatDb(hit.analysis.peakDb)}
					{#if hit.analysis.cents !== null}· {formatCents(hit.analysis.cents)}{/if}
					{#if hit.offBeatMs !== null}· {formatTiming(hit.offBeatMs)}{/if}
				</span>
				{#each problems as problem (problem.text)}
					<span class:text-danger={problem.severity === 'redo'} class="text-ink-soft">
						{problem.severity === 'redo' ? 'Redo:' : 'Listen:'}
						{problem.text}
					</span>
				{/each}
			</li>
		{/each}
	</ol>
{/if}
