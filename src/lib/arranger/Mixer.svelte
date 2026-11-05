<script>
	import { mixer, formatDb, dbToFader, faderToDb, UNITY } from './mixer.svelte.js';
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

{#snippet screws()}
	<span class="screw top" aria-hidden="true"></span>
	<span class="screw bottom" aria-hidden="true"></span>
{/snippet}

<section aria-label="Mixer">
	<!-- One row of channels; on a narrow screen, swipe sideways for more -->
	<div class="console">
		{#each mixer.channels as channel (channel.id)}
			<div class="strip">
				{@render screws()}
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
			{@render screws()}
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
			{@render screws()}
			<h3 class="strip-name">Master</h3>
			{@render fader(mixer.master, 'Master', 'master')}
		</div>
	</div>

	<p class="mt-2 text-xs text-gray-500">Drag a control by its cap. Tap a value to reset it.</p>
</section>

<style>
	/* The console: a recessed dark tray the channel modules sit in */
	.console {
		display: flex;
		align-items: stretch;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		/* Inside the mixer, up/down is for the faders: only sideways swipes scroll */
		touch-action: pan-x;
		gap: 0.375rem;
		border-radius: 0.75rem;
		background: linear-gradient(180deg, rgb(10 11 13), rgb(22 24 28));
		padding: 0.5rem;
		box-shadow:
			inset 0 2px 6px rgb(0 0 0 / 0.8),
			inset 0 -1px 0 rgb(255 255 255 / 0.05);
		color: rgb(229 231 235);
	}

	/* Each channel strip: a raised metal module, lit from above */
	.strip {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6rem;
		flex-shrink: 0;
		min-width: 6.5rem;
		border-radius: 0.375rem;
		background: linear-gradient(90deg, rgb(44 48 56), rgb(54 59 68) 45%, rgb(40 44 51));
		padding: 1.25rem 0.75rem 1.25rem;
		box-shadow:
			inset 1px 1px 0 rgb(255 255 255 / 0.1),
			inset -1px -1px 0 rgb(0 0 0 / 0.5),
			0 6px 12px rgb(0 0 0 / 0.55),
			0 1px 2px rgb(0 0 0 / 0.6);
	}

	/* Busses and master in slightly different panel colours, like a real desk */
	.strip.bus {
		background: linear-gradient(90deg, rgb(38 46 58), rgb(48 58 72) 45%, rgb(35 42 53));
	}

	.strip.master {
		background: linear-gradient(90deg, rgb(56 40 40), rgb(70 50 50) 45%, rgb(50 36 36));
	}

	/* Mounting screws */
	.screw {
		position: absolute;
		left: 50%;
		width: 0.45rem;
		height: 0.45rem;
		transform: translateX(-50%);
		border-radius: 9999px;
		background: radial-gradient(circle at 35% 35%, rgb(180 184 190), rgb(70 74 80));
		box-shadow: 0 1px 1px rgb(0 0 0 / 0.6);
	}

	.screw.top {
		top: 0.35rem;
	}

	.screw.bottom {
		bottom: 0.35rem;
	}

	/* Scribble-strip label */
	.strip-name {
		margin-bottom: auto;
		width: 100%;
		border-radius: 0.2rem;
		background: linear-gradient(rgb(238 232 214), rgb(222 214 192));
		padding: 0.15rem 0.25rem;
		text-align: center;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgb(30 30 30);
		box-shadow:
			inset 0 1px 1px rgb(0 0 0 / 0.25),
			0 1px 0 rgb(255 255 255 / 0.08);
	}

	/* Illuminated mute button */
	.mute {
		width: 2.25rem;
		border-radius: 0.25rem;
		background: linear-gradient(rgb(75 80 88), rgb(50 54 60));
		padding: 0.2rem 0;
		font-size: 0.7rem;
		font-weight: 800;
		color: rgb(156 163 175);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.15),
			0 2px 3px rgb(0 0 0 / 0.6);
	}

	.mute.on {
		background: linear-gradient(rgb(253 186 116), rgb(245 158 11));
		color: rgb(40 25 0);
		box-shadow:
			0 0 10px rgb(245 158 11 / 0.7),
			inset 0 1px 0 rgb(255 255 255 / 0.4);
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
		background: rgb(156 163 175);
	}

	.tick.minor {
		width: 0.25rem;
		background: rgb(107 114 128);
	}

	.tick.unity {
		width: 0.55rem;
		height: 2px;
		background: rgb(245 158 11);
	}

	.number {
		left: 0.6rem;
		font-family: ui-monospace, monospace;
		font-size: 0.6rem;
		line-height: 1;
		color: rgb(156 163 175);
	}

	.number.unity {
		font-weight: 700;
		color: rgb(245 158 11);
	}

	/* Short screens (a phone on its side): shorter faders, so the mixer fits */
	@media (max-height: 600px) {
		.console {
			--fader-length: 7rem;
		}
	}
</style>
