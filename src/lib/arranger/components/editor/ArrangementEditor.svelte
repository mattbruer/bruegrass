<script>
	/**
	 * Where you write the arrangement. On touch screens it uses the music
	 * keypad (only the keys an arrangement needs) instead of the phone's
	 * keyboard, unless that's turned off in Settings.
	 */
	import { onMount } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { watchTouchScreen } from '$lib/utils/touchScreen.js';
	import HelpLink from './HelpLink.svelte';
	import MyChordsButton from '../voicings/MyChordsButton.svelte';
	import ArrangementKeypad from '../keypad/ArrangementKeypad.svelte';

	/* Timing that smooths over the phone keyboard opening and switching */
	const SCROLL_AFTER_KEYBOARD_OPENS_MS = 300;
	const REFOCUS_GRACE_MS = 150;

	const { arrangement, layout } = useArranger();

	/** @type {HTMLTextAreaElement | undefined} */
	let textarea = $state();
	let isTouchScreen = $state(false);
	let isEditing = $state(false);
	/** The keypad's own keys, or the phone's keyboard (for typing a section name). */
	let keypadMode = $state(/** @type {'music' | 'text'} */ ('music'));

	let usesKeypad = $derived(isTouchScreen && settings.musicKeypad);
	let keypadVisible = $derived(usesKeypad && isEditing);

	onMount(() => watchTouchScreen((touch) => (isTouchScreen = touch)));

	// The page leaves room at the bottom while the keypad covers it
	$effect(() => {
		layout.keypadVisible = keypadVisible;
	});

	// Turning the keypad back on (in Settings) starts it on the music keys
	$effect(() => {
		if (settings.musicKeypad) keypadMode = 'music';
	});

	function startedEditing() {
		isEditing = true;
		// Keep what you're typing visible above the keypad or keyboard
		setTimeout(
			() => textarea?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
			SCROLL_AFTER_KEYBOARD_OPENS_MS
		);
	}

	function maybeStoppedEditing() {
		// Switching keyboards blurs and refocuses at once: only stop if focus really left
		setTimeout(() => (isEditing = document.activeElement === textarea), REFOCUS_GRACE_MS);
	}
</script>

<div class="mb-2 flex items-center gap-2">
	<label for="arrangement" class="font-semibold">Song Arrangement</label>
	<HelpLink />
	<MyChordsButton />
</div>

<textarea
	id="arrangement"
	bind:this={textarea}
	bind:value={arrangement.text}
	class="min-h-96 w-full ui-field p-4 font-mono text-sm pointer-coarse:text-base"
	spellcheck="false"
	autocapitalize="off"
	autocomplete="off"
	inputmode={usesKeypad && keypadMode === 'music' ? 'none' : undefined}
	onfocus={startedEditing}
	onblur={maybeStoppedEditing}></textarea>

{#if arrangement.error}
	<p class="mt-2 text-sm text-danger">{arrangement.error}</p>
{/if}

{#if keypadVisible}
	<ArrangementKeypad {textarea} bind:mode={keypadMode} bind:height={layout.keypadHeight} />
{/if}
