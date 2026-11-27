<script>
	/**
	 * The cycled bars, for the whole song at once (Logic's cut and insert
	 * time between its locators): Take out (the rest of the song pulled in)
	 * or Insert as many empty bars before them (the rest pushed later). The
	 * chart, every lane and the takes move together, as one step Undo takes
	 * back. Says why when it can't.
	 */
	import { useArranger } from '../../state/context.js';
	import { cycleBarNumbers } from '../../transcription/cycle.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   cycle: import('../../state/TracksCycleState.svelte.js').TracksCycleState,
	 *   ruler: import('../../tracks/ruler.js').RulerBar[]
	 * }}
	 */
	let { cycle, ruler } = $props();

	const { songBars } = useArranger();
	const tips = TIPS.tracks.songBars;

	const bars = $derived(cycle.region ? cycleBarNumbers(cycle.region, ruler) : null);
	const count = $derived(bars ? bars.to - bars.from + 1 : 0);
	const problem = $derived(bars ? songBars.problem(bars.from, bars.to) : '');
	/** Why the last try didn't happen. */
	let refused = $state('');
	let working = $state(false);

	async function takeOut() {
		if (!bars) return;
		await run(() => songBars.takeOut(bars.from, bars.to));
		if (!refused) cycle.turn(false);
	}

	async function insert() {
		if (bars) await run(() => songBars.insertBefore(bars.from, bars.to));
	}

	/** @param {() => Promise<string>} edit */
	async function run(edit) {
		working = true;
		refused = await edit();
		working = false;
	}
</script>

{#if bars}
	<div class="song-bars" role="group" aria-label="The cycled bars in the whole song">
		<span class="heading">
			Whole song, {count === 1 ? `bar ${bars.from}` : `bars ${bars.from}–${bars.to}`}
		</span>
		<div class="flex gap-1.5">
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				disabled={!!problem || working}
				onclick={takeOut}
				use:tooltip={tips.takeOut}>Take out</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				disabled={!!problem || working}
				onclick={insert}
				use:tooltip={tips.insert}>Insert {count === 1 ? 'a bar' : `${count} bars`} before</button
			>
		</div>
		{#if problem || refused}
			<p class="why">{problem || refused}</p>
		{/if}
	</div>
{/if}

<style>
	.song-bars {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 0.4rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--color-line);
	}

	.heading {
		font-size: 0.8rem;
		font-weight: 700;
	}

	.why {
		max-width: 16rem;
		font-size: 0.8rem;
		color: var(--color-ink-soft);
	}
</style>
