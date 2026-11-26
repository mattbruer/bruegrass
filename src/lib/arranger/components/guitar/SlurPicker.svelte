<script>
	/**
	 * A slur on one beat (instruments/slurs.js): a hammer-on (the lower fret
	 * sounds, then the finger lands on the higher one) or a pull-off (the
	 * higher fret sounds, then the finger pulls off to the lower one), halfway
	 * through the beat, on one string. A boom slurs on its own string, its
	 * fret the higher one; a chuck on one of the strings it strums, the
	 * shape's fret the higher one. You choose the lower fret.
	 */
	import { editOf, startingSlur } from '../../instruments/slurs.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   slur: import('../../instruments/slurs.js').Slur | null,
	 *   shape: (number | null)[],
	 *   strings: string[],
	 *   boom: { string: number, fret: number } | null,
	 *   strummed: number[],
	 *   onChange: (slur: import('../../instruments/slurs.js').SlurEdit | null) => void
	 * }}
	 *   boom: this beat's boom note (null on a chuck); strummed: the strings this chuck strums
	 */
	let { slur, shape, strings, boom, strummed, onChange } = $props();

	const KINDS = [
		{ pull: false, name: 'Hammer-on' },
		{ pull: true, name: 'Pull-off' }
	];

	const edit = $derived(slur ? editOf(slur) : null);

	/** The strings it can be on, with the higher fret each has. */
	const choices = $derived(
		boom
			? boom.fret > 0
				? [{ string: boom.string, fret: boom.fret }]
				: []
			: strummed.flatMap((string) => {
					const fret = shape[string];
					return fret ? [{ string, fret }] : [];
				})
	);
	const high = $derived(choices.find((each) => each.string === edit?.string)?.fret ?? 0);
	/** The lower fret can be open up to one below the higher. */
	const lows = $derived(Array.from({ length: high }, (_, fret) => fret));

	/** @param {boolean} pull */
	function chooseKind(pull) {
		if (edit?.pull === pull) return onChange(null);
		if (edit) return onChange({ ...edit, pull });
		onChange(boom ? { string: boom.string, low: 0, pull } : startingSlur(shape, strummed, pull));
	}

	/** @param {number} string @param {number} fret its higher fret */
	function chooseString(string, fret) {
		if (edit) onChange({ ...edit, string, low: Math.min(edit.low, fret - 1) });
	}
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex flex-wrap gap-1.5">
		{#each KINDS as { pull, name } (name)}
			<button
				type="button"
				class="ui-button px-3 py-1 text-sm font-semibold"
				class:ui-button-on={edit?.pull === pull}
				aria-pressed={edit?.pull === pull}
				disabled={choices.length === 0}
				onclick={() => chooseKind(pull)}
				use:tooltip={pull ? TIPS.guitarEditor.pullOff : TIPS.guitarEditor.hammerOn}
			>
				{name}
			</button>
		{/each}
	</div>
	{#if edit}
		{#if !boom}
			<span class="text-sm">On which string?</span>
			<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Slur on which string">
				{#each choices as { string, fret } (string)}
					<button
						type="button"
						role="radio"
						aria-checked={edit.string === string}
						class="flex flex-col items-center ui-button px-2.5 py-1 text-sm"
						class:ui-button-on={edit.string === string}
						onclick={() => chooseString(string, fret)}
						use:tooltip={TIPS.guitarEditor.slurString}
					>
						<span class="font-bold">{strings[string]} string</span>
						<span class="text-xs text-ink-soft">fret {fret}</span>
					</button>
				{/each}
			</div>
		{/if}
		<span class="text-sm">
			{boom ? `On the ${strings[boom.string]} string, fret ${boom.fret}. ` : ''}{edit.pull
				? 'Pulls off to which fret?'
				: 'Starts on which fret?'}
		</span>
		<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="The lower fret">
			{#each lows as fret (fret)}
				<button
					type="button"
					role="radio"
					aria-checked={edit.low === fret}
					class="ui-button px-3 py-1 text-sm font-bold"
					class:ui-button-on={edit.low === fret}
					onclick={() => onChange({ ...edit, low: fret })}
					use:tooltip={TIPS.guitarEditor.slurLow}
				>
					{fret === 0 ? 'open' : fret}
				</button>
			{/each}
		</div>
	{/if}
</div>
