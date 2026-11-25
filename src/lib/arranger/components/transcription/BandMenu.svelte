<script>
	/** The Band lane's menu (⋯ beside its name): guess the chords from the recording, or clear the guesses. */
	import Popover from '$lib/components/Popover.svelte';
	import StyleSelect from '../page/StyleSelect.svelte';
	import GuessChordsButton from './actions/GuessChordsButton.svelte';
	import ClearGuessesButton from './actions/ClearGuessesButton.svelte';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();
</script>

<Popover class="px-1.5 text-xs" tip={TIPS.transcription.bandMenu}>
	{#snippet button()}<span aria-hidden="true">⋯</span><span class="sr-only">The band's menu</span
		>{/snippet}
	<div class="px-2 pb-2"><StyleSelect /></div>
	<span class="ui-menu-heading">Chords</span>
	<GuessChordsButton {transcription} class="ui-menu-item" />
	<ClearGuessesButton {transcription} class="ui-menu-item" />
</Popover>
