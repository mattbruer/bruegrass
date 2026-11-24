<script>
	/**
	 * Where you write the arrangement. On touch screens it uses the music
	 * keypad (only the keys an arrangement needs) instead of the phone's
	 * keyboard, unless that's turned off in Settings. While a bar is being
	 * heard (the band, or Transcribe's recording), it's lit in the text: a copy of the
	 * text sits under the textarea, which goes see-through, and the copy
	 * marks the bar.
	 */
	import { onMount } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { watchTouchScreen } from '$lib/utils/touchScreen.js';
	import { barSpan } from '../../chart/barSpan.js';
	import { onEveryFrame } from '$lib/audio/analysis/frameLoop.js';
	import HelpLink from './HelpLink.svelte';
	import MyChordsButton from '../voicings/MyChordsButton.svelte';
	import ArrangementKeypad from '../keypad/ArrangementKeypad.svelte';

	/* Timing that smooths over the phone keyboard opening and switching */
	const SCROLL_AFTER_KEYBOARD_OPENS_MS = 300;
	const REFOCUS_GRACE_MS = 150;

	const arranger = useArranger();
	const { arrangement, layout } = arranger;

	/** @type {HTMLTextAreaElement | undefined} */
	let textarea = $state();
	/** @type {HTMLDivElement | undefined} */
	let mirror = $state();
	/** @type {HTMLElement | undefined} */
	let playingMark = $state();
	let isTouchScreen = $state(false);
	let isEditing = $state(false);
	/** The keypad's own keys, or the phone's keyboard (for typing a section name). */
	let keypadMode = $state(/** @type {'music' | 'text'} */ ('music'));

	let usesKeypad = $derived(isTouchScreen && settings.musicKeypad);
	let keypadVisible = $derived(usesKeypad && isEditing);

	/** @type {{ section: number, measure: number } | null} */
	let playingBar = $state(null);
	let playingSpan = $derived(playingBar && barSpan(arrangement.text, playingBar));

	// Playing, the bar follows the audio clock (looked at each frame); paused, it rests where the playhead is
	$effect(() => {
		if (!arranger.chartIsPlaying) {
			playingBar = arranger.chartBarNow();
			return;
		}
		return onEveryFrame(() => {
			const now = arranger.chartBarNow();
			if (now?.section !== playingBar?.section || now?.measure !== playingBar?.measure) {
				playingBar = now;
			}
		});
	});

	// Keep the bar being heard in view, unless you're typing
	$effect(() => {
		if (!playingSpan || !playingMark || !textarea || isEditing) return;
		const top = playingMark.offsetTop;
		const inView =
			top >= textarea.scrollTop &&
			top + playingMark.offsetHeight <= textarea.scrollTop + textarea.clientHeight;
		if (!inView) textarea.scrollTop = top - textarea.clientHeight / 2;
		followScroll();
	});

	function followScroll() {
		if (mirror && textarea) mirror.scrollTop = textarea.scrollTop;
	}

	onMount(() => watchTouchScreen((touch) => (isTouchScreen = touch)));

	// The page leaves room at the bottom while the keypad covers it
	$effect(() => {
		layout.keypadVisible = keypadVisible;
		return () => (layout.keypadVisible = false);
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
	<label for="arrangement" class="sr-only">Song arrangement</label>
	<HelpLink />
	<MyChordsButton />
</div>

<div class="relative">
	{#if playingSpan}
		{@const text = arrangement.text}
		<!-- The zero-width space keeps a last empty line, as the textarea does -->
		<div
			bind:this={mirror}
			class="chart-text pointer-events-none absolute inset-0 overflow-hidden ui-field"
			aria-hidden="true"
		>
			{text.slice(0, playingSpan.from)}<mark bind:this={playingMark} class="playing-bar"
				>{text.slice(playingSpan.from, playingSpan.to)}</mark
			>{text.slice(playingSpan.to)}&#8203;
		</div>
	{/if}
	<textarea
		id="arrangement"
		bind:this={textarea}
		bind:value={arrangement.text}
		class="chart-text relative block h-56 w-full ui-field"
		class:see-through={playingSpan}
		spellcheck="false"
		autocapitalize="off"
		autocomplete="off"
		inputmode={usesKeypad && keypadMode === 'music' ? 'none' : undefined}
		onscroll={followScroll}
		onfocus={startedEditing}
		onblur={maybeStoppedEditing}></textarea>
</div>

{#if arrangement.error}
	<p class="mt-2 text-sm text-danger">{arrangement.error}</p>
{/if}

{#if keypadVisible}
	<ArrangementKeypad {textarea} bind:mode={keypadMode} bind:height={layout.keypadHeight} />
{/if}

<style>
	/* The textarea and the copy under it lay the text out the same, character for character */
	.chart-text {
		padding: 1rem;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		line-height: var(--text-sm--line-height);
		white-space: pre-wrap;
		overflow-wrap: break-word;
		scrollbar-gutter: stable;
	}
	@media (pointer: coarse) {
		.chart-text {
			font-size: var(--text-base);
			line-height: var(--text-base--line-height);
		}
	}
	.see-through {
		background: transparent;
		box-shadow: none;
		color: transparent;
		caret-color: var(--color-ink);
	}
	.playing-bar {
		color: var(--color-surface-deep);
		background: var(--color-danger);
		border-radius: 3px;
		box-shadow: 0 0 0 2px var(--color-danger);
	}
</style>
