<script>
	/**
	 * Where the recording is: as bars and beats (Logic's transport: bar, beat,
	 * sixteenth), or as a clock to the hundredth of a second with its length.
	 * Click it to switch (`settings.transcribe.clock`; bars and beats unless
	 * there are no bars yet). It never changes width while it counts.
	 */
	import SteadyText from './SteadyText.svelte';
	import { formatClock } from '$lib/utils/formatClock.js';
	import { barsAndBeats, barsAndBeatsText } from '../../transcription/barsAndBeats.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   time: number, duration: number,
	 *   beat?: number, bars?: import('../../transcription/barPlan.js').Bar[],
	 *   class?: string
	 * }} beat and bars: where the playhead is in beats, and the bars (none: a clock only)
	 */
	let { time, duration, beat = 0, bars = [], class: className = '' } = $props();

	const DECIMALS = 2;
	const showBars = $derived(bars.length > 0 && settings.transcribe.clock === 'bars');
	const place = $derived(barsAndBeats(beat, bars));
	const text = $derived(
		showBars ? barsAndBeatsText(place) : formatClock(time, { decimals: DECIMALS })
	);
	const widest = $derived(
		showBars
			? barsAndBeatsText({ bar: bars.at(-1)?.number ?? 0, beat: 0, division: 0 })
			: formatClock(duration, { decimals: DECIMALS })
	);
	const spoken = $derived(
		showBars ? `Bar ${place.bar}, beat ${place.beat}` : `${text} of ${formatClock(duration)}`
	);

	function toggle() {
		settings.transcribe.clock = settings.transcribe.clock === 'bars' ? 'time' : 'bars';
	}
</script>

{#if bars.length > 0}
	<button
		type="button"
		class="clock {className}"
		onclick={toggle}
		aria-label="{spoken}. Show {showBars ? 'the time' : 'bars and beats'}"
		use:tooltip={TIPS.transcription.clock}
	>
		<SteadyText {text} {widest} />{#if !showBars}<span aria-hidden="true"
				>&nbsp;/ {formatClock(duration)}</span
			>{/if}
	</button>
{:else}
	<span class="clock {className}" aria-label={spoken}><SteadyText {text} {widest} /></span>
{/if}

<style>
	.clock {
		white-space: nowrap;
	}
	button.clock {
		cursor: pointer;
		border-radius: var(--corner-small);
		padding: 0.15rem 0.35rem;
	}
	@media (hover: hover) {
		button.clock:hover {
			background: var(--color-surface-deep);
		}
	}
</style>
