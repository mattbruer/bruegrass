<script>
	import { mixer, formatDb, dbToFader, faderToDb, UNITY } from '../../playback/mixer.svelte.js';
	import Slider from './Slider.svelte';

	/** Dial marks beside each fader. */
	const SCALE = [
		{ db: 6, text: '+6' },
		{ db: 0, text: '0' },
		{ db: -10, text: '10' },
		{ db: -20, text: '20' },
		{ db: -30, text: '30' },
		{ db: -40, text: '40' },
		{ db: -Infinity, text: '∞' }
	];
	/** Small unlabelled ticks between the numbers (every 5 dB, plus +3). */
	const MINOR_TICKS = [3, -5, -15, -25, -35, -50];

	/* Where a reset puts each control */
	const RESET_LEVEL = 0; // dB, unity
	const RESET_SEND = -12; // dB
	const RESET_PAN = 0;
	const RESET_DECAY = 2.5; // s
	const DECAY_MIN = 0.5;
	const DECAY_MAX = 8;

	/** Levels and sends follow the console fader taper (see mixer.svelte.js). */
	const level = {
		toPosition: dbToFader,
		fromPosition: faderToDb,
		format: formatDb
	};

	const pan = {
		toPosition: (/** @type {number} */ value) => (value + 1) / 2,
		// Snap to the centre near it, like a centre-detented pan pot
		fromPosition: (/** @type {number} */ position) => {
			const value = Math.round((position * 2 - 1) * 100) / 100;
			return Math.abs(value) < 0.04 ? 0 : value;
		},
		format: (/** @type {number} */ value) =>
			Math.abs(value) < 0.01 ? 'C' : `${value < 0 ? 'L' : 'R'}${Math.round(Math.abs(value) * 100)}`
	};

	const decay = {
		toPosition: (/** @type {number} */ seconds) => (seconds - DECAY_MIN) / (DECAY_MAX - DECAY_MIN),
		fromPosition: (/** @type {number} */ position) =>
			Math.round((DECAY_MIN + position * (DECAY_MAX - DECAY_MIN)) * 10) / 10,
		format: (/** @type {number} */ seconds) => `${seconds.toFixed(1)} s`
	};
</script>

{#snippet scale()}
	<div class="scale" aria-hidden="true">
		{#each MINOR_TICKS as db (db)}
			<span class="tick minor" style="--at: {dbToFader(db)}"></span>
		{/each}
		{#each SCALE as mark (mark.text)}
			<span class="tick" class:unity={mark.db === 0} style="--at: {dbToFader(mark.db)}"></span>
			<span class="number" class:unity={mark.db === 0} style="--at: {dbToFader(mark.db)}"
				>{mark.text}</span
			>
		{/each}
	</div>
{/snippet}

{#snippet fader(
	/** @type {{ volume: number }} */ target,
	/** @type {string} */ label,
	variant = ''
)}
	<Slider
		bind:value={target.volume}
		{...level}
		reset={RESET_LEVEL}
		label="{label} fader"
		orientation="vertical"
		{variant}
		children={scale}
	/>
{/snippet}

<section aria-label="Mixer">
	<!-- One row of channels; on a narrow screen, swipe sideways for more -->
	<div class="console">
		{#each mixer.channels as channel (channel.id)}
			<div class="strip">
				<h3 class="strip-name">{channel.name}</h3>

				{#each channel.parts as part (part.id)}
					<Slider
						name={part.name}
						bind:value={part.volume}
						{...level}
						reset={RESET_LEVEL}
						label="{channel.name} {part.name}"
					/>
				{/each}

				<Slider
					name="Reverb"
					bind:value={channel.send}
					{...level}
					max={UNITY}
					reset={RESET_SEND}
					label="{channel.name} reverb send"
				/>

				<Slider
					name="Pan"
					bind:value={channel.pan}
					{...pan}
					reset={RESET_PAN}
					label="{channel.name} pan"
				/>

				<button
					type="button"
					class="mute"
					class:on={channel.mute}
					aria-pressed={channel.mute}
					aria-label="Mute {channel.name}"
					onclick={() => (channel.mute = !channel.mute)}
				>
					M
				</button>

				{@render fader(channel, channel.name)}
			</div>
		{/each}

		<div class="strip bus">
			<h3 class="strip-name">Reverb</h3>

			<Slider
				name="Decay"
				bind:value={mixer.reverb.decay}
				{...decay}
				reset={RESET_DECAY}
				label="Reverb decay"
			/>

			{@render fader(mixer.reverb, 'Reverb return')}
		</div>

		<div class="strip master">
			<h3 class="strip-name">Master</h3>
			{@render fader(mixer.master, 'Master', 'master')}
		</div>
	</div>

	<p class="mt-2 text-xs text-ink-soft">Drag a control by its cap. Tap a value to reset it.</p>
</section>

<style>
	/* The console: a tray sunk into the page, the channel strips raised in it */
	.console {
		display: flex;
		align-items: stretch;
		gap: 0.75rem;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		/* Inside the mixer, up/down is for the faders: only sideways swipes scroll */
		touch-action: pan-x;
		border-radius: var(--corner-panel);
		background: var(--mixer-tray);
		padding: 0.85rem;
		box-shadow: var(--shadow-inset);
		color: var(--color-ink);
	}

	.strip {
		display: flex;
		flex-shrink: 0;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6rem;
		min-width: 6.5rem;
		border-radius: var(--corner-card);
		background: var(--mixer-strip);
		/*
		 * Inside a strip, the strip's tone is the "surface": the knobs, caps,
		 * readouts and mute button (which use --color-surface) match it.
		 */
		--color-surface: var(--mixer-strip);
		padding: 0.85rem 0.75rem 1rem;
		box-shadow: var(--shadow-raised-small);
	}

	/* Busses and master: a hint of colour in the name */
	.strip.bus .strip-name {
		color: var(--color-ink-soft);
	}

	.strip.master .strip-name {
		color: var(--color-accent);
	}

	.strip-name {
		margin-bottom: auto;
		width: 100%;
		text-align: center;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink);
	}

	/* Mute: a small raised button that stays pressed in, lit, while muted */
	.mute {
		width: 2.25rem;
		border-radius: var(--corner-small);
		background: var(--color-surface);
		padding: 0.2rem 0;
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--color-ink-soft);
		box-shadow: var(--shadow-raised-small);
	}

	.mute.on {
		color: var(--color-accent);
		box-shadow: var(--shadow-inset-small);
	}

	/* Scale: ticks line up with the centre of the fader cap at each level */
	.scale {
		--cap: 1.1rem; /* the fader cap's height (Slider.svelte): ticks line up with its centre */
		position: relative;
		width: 1.75rem;
	}

	.tick,
	.number {
		position: absolute;
		top: calc(var(--cap) / 2 + (1 - var(--at)) * (100% - var(--cap)));
		transform: translateY(-50%);
	}

	.tick {
		left: 0;
		width: 0.45rem;
		height: 1px;
		background: var(--color-ink-faint);
	}

	.tick.minor {
		width: 0.25rem;
		opacity: 0.6;
	}

	.tick.unity {
		width: 0.55rem;
		height: 2px;
		background: var(--color-accent);
	}

	.number {
		left: 0.6rem;
		font-family: ui-monospace, monospace;
		font-size: 0.6rem;
		line-height: 1;
		color: var(--color-ink-faint);
	}

	.number.unity {
		font-weight: 700;
		color: var(--color-accent);
	}

	/* Short screens (a phone on its side): shorter faders, so the mixer fits */
	@media (max-height: 600px) {
		.console {
			--fader-length: 7rem;
		}
	}
</style>
