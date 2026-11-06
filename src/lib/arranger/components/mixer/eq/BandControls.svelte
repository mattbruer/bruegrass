<script>
	/**
	 * Below the EQ graph: a chip per band (tap to select it; its dot turns
	 * the band on or off), then exact controls for the selected band.
	 */
	import Slider from '../Slider.svelte';
	import {
		CUT_SLOPES,
		EQ_BANDS,
		bandDefinition,
		hasWidth,
		isCut
	} from '../../../playback/eq/eqBands.js';
	import { FREQUENCY_SCALE, GAIN_SCALE, Q_SCALE } from './bandControlScales.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   eq: import('../../../playback/eq/eqBands.js').EqSettings,
	 *   selectedBandId: string
	 * }}
	 */
	let { eq, selectedBandId = $bindable() } = $props();

	let selectedIndex = $derived(eq.bands.findIndex((band) => band.id === selectedBandId));
	let selected = $derived(eq.bands[selectedIndex]);
	let definition = $derived(bandDefinition(/** @type {any} */ (selectedBandId)));
</script>

<!-- Band chips, low to high -->
<div class="chips" role="group" aria-label="Bands">
	{#each eq.bands as band, index (band.id)}
		<div
			class="chip"
			class:selected={band.id === selectedBandId}
			style:--band={`var(--eq-band-${index + 1})`}
		>
			<button
				type="button"
				class="power"
				class:on={band.on}
				aria-pressed={band.on}
				aria-label="{EQ_BANDS[index].name} on"
				onclick={() => (band.on = !band.on)}
				use:tooltip={TIPS.eq.bandPower}
			></button>
			<button
				type="button"
				class="name"
				onclick={() => (selectedBandId = band.id)}
				use:tooltip={TIPS.eq.bands[band.id]}
			>
				{EQ_BANDS[index].name}
			</button>
		</div>
	{/each}
</div>

<!-- The selected band's controls -->
{#if selected}
	<div class="controls ui-well p-4" class:off={!selected.on}>
		<Slider
			name="Frequency"
			bind:value={selected.frequency}
			{...FREQUENCY_SCALE}
			reset={definition.defaults.frequency}
			label="{definition.name} frequency"
			tip={TIPS.eq.frequency}
		/>

		{#if !isCut(definition.shape)}
			<Slider
				name="Gain"
				bind:value={selected.gain}
				{...GAIN_SCALE}
				reset={0}
				label="{definition.name} gain"
				tip={TIPS.eq.gain}
			/>
		{/if}

		{#if hasWidth(definition.shape)}
			<Slider
				name="Q (width)"
				bind:value={selected.q}
				{...Q_SCALE}
				reset={definition.defaults.q}
				label="{definition.name} Q"
				tip={TIPS.eq.q}
			/>
		{/if}

		{#if isCut(definition.shape)}
			<div class="flex flex-col gap-1">
				<span class="text-[0.6rem] font-bold tracking-wider text-ink-soft uppercase">Slope</span>
				<div class="flex gap-2">
					{#each CUT_SLOPES as slope (slope)}
						<button
							type="button"
							class="ui-button px-3 py-1 text-xs"
							class:ui-button-on={selected.slope === slope}
							aria-pressed={selected.slope === slope}
							onclick={() => (selected.slope = slope)}
							use:tooltip={TIPS.eq.slope}
						>
							{slope} dB/oct
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-block: 0.75rem;
	}

	.chip {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		border-radius: var(--corner-small);
		background: var(--color-surface);
		padding: 0.25rem 0.5rem;
		font-size: 0.7rem;
		font-weight: 700;
		box-shadow: var(--shadow-raised-small);
	}

	.chip.selected {
		box-shadow: var(--shadow-inset-small);
		color: var(--color-accent);
	}

	/* The band's colour, filled when on, a ring when off */
	.power {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 9999px;
		border: 2px solid var(--band);
	}

	.power.on {
		background: var(--band);
	}

	/*
	 * Touch screens: fingers need bigger targets than a mouse. The chips get
	 * taller, and the on/off dot gets a larger invisible hit area around it
	 * (the dot itself stays small, so the chips don't spread out).
	 */
	@media (pointer: coarse) {
		.chip {
			gap: 0.5rem;
			padding: 0.45rem 0.6rem;
			font-size: 0.75rem;
		}

		.power {
			position: relative;
			width: 0.9rem;
			height: 0.9rem;
		}

		.power::after {
			content: '';
			position: absolute;
			inset: -0.6rem;
		}
	}

	.controls {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: 1rem 1.5rem;
		--slider-length: 11rem;
	}

	.controls.off {
		opacity: 0.5;
	}
</style>
