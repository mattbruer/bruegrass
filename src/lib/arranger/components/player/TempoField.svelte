<script>
	/** Tempo in BPM. Shows a number pad on phones; tidied into range when you leave it. */
	import { useArranger } from '../../state/context.js';
	import { TEMPO_MAX, TEMPO_MIN } from '../../chart/tempo.js';

	const { arrangement } = useArranger();
</script>

<label class="flex items-center gap-2 font-semibold whitespace-nowrap">
	Tempo
	<input
		type="number"
		inputmode="numeric"
		min={TEMPO_MIN}
		max={TEMPO_MAX}
		bind:value={arrangement.tempo}
		onchange={() => arrangement.tidyTempo()}
		class="w-18 ui-field px-2 py-1"
	/>
	<span class="text-sm font-normal text-ink-soft">BPM</span>
</label>
