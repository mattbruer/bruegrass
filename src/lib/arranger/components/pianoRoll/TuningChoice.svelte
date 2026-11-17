<script>
	/**
	 * How a part's instrument is tuned: one of its usual tunings, or Custom,
	 * which shows a note to pick for each string (top line first, as the TAB).
	 */
	import { fretboard } from '../../tab/fretboards.js';
	import { namedTuning, stringName, STEP_RANGE, TUNINGS } from '../../tab/tunings.js';
	import { setTabTuning } from '../../tab/songTab.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ voice: string, instrument: string, steps: number[] | undefined }} steps: none for standard */
	let { voice, instrument, steps } = $props();

	const CUSTOM = 'custom';
	const standard = $derived(fretboard(instrument));
	const tunings = $derived(TUNINGS[instrument] ?? []);
	const stepsNow = $derived(standard?.strings.map((_, index) => steps?.[index] ?? 0) ?? []);
	const named = $derived(namedTuning(instrument, steps));
	/** Picked Custom while on a usual tuning: show the strings anyway. */
	let customising = $state(false);
	const showStrings = $derived(customising || !named);

	const stepChoices = Array.from(
		{ length: STEP_RANGE.highest - STEP_RANGE.lowest + 1 },
		(_, i) => STEP_RANGE.lowest + i
	);

	/** @param {string} id */
	function choose(id) {
		customising = id === CUSTOM;
		const tuning = tunings.find((each) => each.id === id);
		if (tuning) setTabTuning(voice, instrument, tuning.steps);
	}

	/**
	 * @param {number} string
	 * @param {number} step
	 */
	function tuneString(string, step) {
		setTabTuning(
			voice,
			instrument,
			stepsNow.map((each, index) => (index === string ? step : each))
		);
	}
</script>

<label class="flex items-center gap-1.5 text-sm">
	<span class="text-ink-soft">Tuning</span>
	<select
		class="ui-field px-2 py-1"
		value={showStrings ? CUSTOM : named?.id}
		onchange={(event) => choose(event.currentTarget.value)}
		use:tooltip={TIPS.melody.tabTuning}
	>
		{#each tunings as tuning (tuning.id)}
			<option value={tuning.id}>{tuning.name}</option>
		{/each}
		<option value={CUSTOM}>Custom…</option>
	</select>
</label>

{#if showStrings && standard}
	<div
		class="flex flex-wrap items-center gap-1.5 text-sm"
		role="group"
		aria-label="Each string's note"
	>
		{#each standard.strings as string, index (index)}
			<select
				class="ui-field px-1.5 py-1"
				aria-label="String {index + 1}"
				value={stepsNow[index]}
				onchange={(event) => tuneString(index, Number(event.currentTarget.value))}
				use:tooltip={TIPS.melody.tabStringTuning}
			>
				{#each stepChoices as step (step)}
					<option value={step}>{stringName(string.open + step, string.name)}</option>
				{/each}
			</select>
		{/each}
	</div>
{/if}
