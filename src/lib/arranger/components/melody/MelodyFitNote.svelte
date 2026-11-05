<script>
	/**
	 * How the melody lines up with the arrangement: both lengths, what the
	 * pickup does, and a warning when one runs longer than the other.
	 */
	import { useArranger } from '../../state/context.js';
	import { rhythm } from '../../chart/timeline.js';
	import { melodyFit } from '../../melody/melody.js';
	import { formatBeats } from '../../melody/formatBeats.js';

	/** A shortfall smaller than this is just the last bar's held note or rest: not worth a warning. */
	const SHORTFALL_WORTH_MENTIONING = 4;

	const { arrangement, melody } = useArranger();

	let arrangementLength = $derived(rhythm(arrangement.sections).quarters);
	let fit = $derived(melody.line ? melodyFit(melody.line, arrangementLength) : null);
</script>

{#if melody.error}
	<p class="mt-2 text-sm text-danger">The melody can't be played: {melody.error}</p>
{:else if melody.line && fit && arrangement.isPlayable}
	<p class="mt-2 text-sm text-ink-soft">
		Melody: {formatBeats(melody.line.pickup + melody.line.length)}, arrangement:
		{formatBeats(arrangementLength)}.
		{#if melody.line.pickup > 0}
			The melody's {formatBeats(melody.line.pickup)} pickup plays before the band comes in, and again
			at the end of each time through, leading back to the top.
		{/if}
	</p>

	{#if fit.extra > 0}
		<p class="mt-1 text-sm text-accent">
			The arrangement ends first, so the melody's last {formatBeats(fit.extra)} are cut off.
		</p>
	{:else if fit.missing >= SHORTFALL_WORTH_MENTIONING}
		<p class="mt-1 text-sm text-accent">
			The melody ends {formatBeats(fit.missing)} before the arrangement does.
		</p>
	{/if}
{/if}
