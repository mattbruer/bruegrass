<script>
	/** One bar of the chart builder: its chords, its time when it changes, and its words. */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { chordName } from '../../builder/chartEdits.js';

	/**
	 * @type {{
	 *   bar: import('../../chart/writtenChart.js').WrittenBar,
	 *   time: import('../../builder/barTimes.js').BarTime,
	 *   words: string, picked: boolean, playing: boolean, showTime: boolean,
	 *   onpick: () => void
	 * }}
	 */
	let { bar, time, words, picked, playing, showTime, onpick } = $props();
</script>

<button
	type="button"
	class="tile flex min-w-0 flex-col items-start ui-button px-1.5 py-1 text-left"
	class:ui-button-on={picked}
	class:playing
	aria-pressed={picked}
	use:tooltip={TIPS.builder.bar}
	onclick={onpick}
>
	<span class="h-3.5 text-[0.65rem] leading-none text-ink-soft">{showTime ? time.time : ''}</span>
	<!-- A bar's chords share it evenly, so each gets an equal part of the tile -->
	<span class="chords w-full font-semibold" style:--chords={Math.max(bar.chords.length, 1)}>
		{#each bar.chords as chord, c (c)}
			<span class="truncate">{chordName(chord)}</span>
		{:else}
			<span class="text-ink-faint">%</span>
		{/each}
	</span>
	<span class="h-4 w-full truncate text-xs text-ink-soft">{words}</span>
</button>

<style>
	.tile {
		min-height: 3.6rem;
	}
	.chords {
		display: grid;
		grid-template-columns: repeat(var(--chords), minmax(0, 1fr));
		gap: 0.25rem;
	}
	.playing {
		outline: 2px solid var(--color-danger);
		outline-offset: 1px;
	}
</style>
