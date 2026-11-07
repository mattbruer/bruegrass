<script>
	/**
	 * The optional melody, written in ABC notation. It's drawn as sheet music
	 * (SheetMusic.svelte) and played on the guitar along with the band.
	 */
	import { useArranger } from '../../state/context.js';
	import MelodyFitNote from './MelodyFitNote.svelte';
	import MelodyWarnings from './MelodyWarnings.svelte';
	import ChordConversion from './ChordConversion.svelte';
	import HarmonyParts from './HarmonyParts.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** An example shown in the empty box. */
	const EXAMPLE_NOTATION = [
		'X:1',
		'T:Tune name',
		'M:4/4',
		'L:1/8',
		'K:G',
		'GABc dedB|dedB dedB|'
	].join('\n');

	const { melody } = useArranger();
</script>

<div>
	<p class="mb-2 text-sm text-ink-soft">
		Paste or write a tune in
		<a
			href="https://abcnotation.com/learn"
			target="_blank"
			rel="noopener"
			class="text-accent underline"
			use:tooltip={TIPS.melody.abcLink}>ABC notation</a
		>
		(optional). It's drawn as sheet music under the chart, and the guitar plays it along with the band:
		the tune's first full bar starts with the arrangement's first bar, at the song's tempo. The band always
		plays the arrangement: if the tune has chord symbols (like <code>"G"</code>), the arrangement
		can be written from them, and if it has none, the arrangement's chords can be added to it. Write
		the tune at its real (concert) pitch. With a capo on, the sheet music can also be shown in the
		key of the guitar's shapes.
	</p>

	<textarea
		id="abc-notation"
		bind:value={melody.notation}
		aria-label="ABC notation"
		placeholder={EXAMPLE_NOTATION}
		class="h-56 w-full ui-field p-4 font-mono text-sm pointer-coarse:text-base"
		spellcheck="false"
		autocapitalize="off"
		autocomplete="off"></textarea>

	<MelodyWarnings />
	<MelodyFitNote />
	<ChordConversion />
	<HarmonyParts />
</div>
