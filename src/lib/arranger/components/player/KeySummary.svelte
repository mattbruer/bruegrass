<script>
	/** The key, in words: "Key of G", or "Sounds in A · guitar plays G shapes, capo 2". */
	import { useArranger } from '../../state/context.js';
	import { keyName, mod12 } from '../../chart/key.js';

	const { arrangement } = useArranger();
</script>

<!-- Always present and one line, so it never pushes anything around -->
<p class="min-w-0 truncate text-sm text-ink-soft">
	{#if arrangement.key && arrangement.pitchShift !== 0}
		Sounds in <strong>{keyName(arrangement.key, arrangement.pitchShift)}</strong> · guitar plays
		<strong>{keyName(arrangement.key)}</strong> shapes, capo {mod12(arrangement.pitchShift)}
	{:else if arrangement.key}
		Key of <strong>{keyName(arrangement.key)}</strong>
	{/if}
</p>
