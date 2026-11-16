<script>
	/** The key, in words: "Key of G", or "Sounds in A · guitar plays G shapes, capo 2". */
	import { useArranger } from '../../state/context.js';
	import { keyName } from '../../chart/key.js';

	const { arrangement } = useArranger();
</script>

<!-- Always present and one line, so it never pushes anything around -->
<p class="min-w-0 truncate text-sm text-ink-soft">
	{#if arrangement.key && arrangement.capoFret !== 0}
		Sounds in <strong>{keyName(arrangement.key, arrangement.pitchShift)}</strong> · guitar plays
		<strong>{keyName(arrangement.key, arrangement.shapesShift)}</strong> shapes, capo {arrangement.capoFret}
	{:else if arrangement.key}
		Key of <strong>{keyName(arrangement.key, arrangement.pitchShift)}</strong>
	{/if}
</p>
