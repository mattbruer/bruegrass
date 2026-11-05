<script>
	import { mixer, formatDb, dbToFader, faderToDb, UNITY } from './mixer.svelte.js';

	/** Slider resolution: positions run 0–STEPS along the fader taper. */
	const STEPS = 1000;
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

	/**
	 * Two-way binding between a dB setting and a slider on the console taper.
	 * @param {Record<string, any>} target
	 * @param {string} field
	 */
	function taper(target, field) {
		return {
			get: () => Math.round(dbToFader(target[field]) * STEPS),
			set: (/** @type {number} */ value) => (target[field] = faderToDb(value / STEPS))
		};
	}

	/** @param {number} pan */
	function formatPan(pan) {
		if (Math.abs(pan) < 0.01) return 'C';
		return `${pan < 0 ? 'L' : 'R'}${Math.round(Math.abs(pan) * 100)}`;
	}
</script>

{#snippet fader(/** @type {{ volume: number }} */ target, /** @type {string} */ label)}
	{@const level = taper(target, 'volume')}
	<div class="flex flex-col items-center gap-2">
		<div class="fader-wrap">
			<!-- The slot the fader cap rides in -->
			<div class="slot" aria-hidden="true"></div>
			<input
				type="range"
				class="fader"
				min="0"
				max={STEPS}
				step="1"
				aria-label="{label} fader"
				bind:value={level.get, level.set}
				ondblclick={() => (target.volume = 0)}
			/>
			<div class="scale" aria-hidden="true">
				{#each MINOR_TICKS as db (db)}
					<span class="tick minor" style="--at: {dbToFader(db)}"></span>
				{/each}
				{#each SCALE as mark (mark.text)}
					<span class="tick" class:unity={mark.db === 0} style="--at: {dbToFader(mark.db)}"></span>
					<span class="number" class:unity={mark.db === 0} style="--at: {dbToFader(mark.db)}">{mark.text}</span>
				{/each}
			</div>
		</div>
		<!-- <span class="w-12 text-center font-mono text-xs text-gray-300">{formatDb(target.volume)} dB</span> -->
	</div>
{/snippet}

{#snippet screws()}
	<span class="screw top" aria-hidden="true"></span>
	<span class="screw bottom" aria-hidden="true"></span>
{/snippet}

<section aria-label="Mixer">
	<div class="console">
		{#each mixer.channels as channel (channel.id)}
			{@const send = taper(channel, 'send')}
			<div class="strip">
				{@render screws()}
				<h3 class="strip-name">{channel.name}</h3>

				{#each channel.parts as part (part.id)}
					{@const partLevel = taper(part, 'volume')}
					<label class="knob">
						<span>{part.name}</span>
						<input
							type="range"
							min="0"
							max={STEPS}
							step="1"
							bind:value={partLevel.get, partLevel.set}
							ondblclick={() => (part.volume = 0)}
						/>
						<span class="readout">{formatDb(part.volume)}</span>
					</label>
				{/each}

				<label class="knob">
					<span>Reverb</span>
					<input
						type="range"
						min="0"
						max={UNITY * STEPS}
						step="1"
						bind:value={send.get, send.set}
						ondblclick={() => (channel.send = -12)}
					/>
					<span class="readout">{formatDb(channel.send)}</span>
				</label>

				<label class="knob">
					<span>Pan</span>
					<input
						type="range"
						min="-1"
						max="1"
						step="0.01"
						bind:value={channel.pan}
						ondblclick={() => (channel.pan = 0)}
					/>
					<span class="readout">{formatPan(channel.pan)}</span>
				</label>

				<button
					type="button"
					class="mute"
					class:on={channel.mute}
					aria-pressed={channel.mute}
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

			<label class="knob">
				<span>Decay</span>
				<input type="range" min="0.5" max="8" step="0.1" bind:value={mixer.reverb.decay} />
				<span class="readout">{mixer.reverb.decay.toFixed(1)} s</span>
			</label>

			{@render fader(mixer.reverb, 'Reverb return')}
		</div>

		<div class="strip master">
			{@render screws()}
			<h3 class="strip-name">Master</h3>
			{@render fader(mixer.master, 'Master')}
		</div>
	</div>

	<p class="mt-2 text-xs text-gray-500">Double-click a control to reset it.</p>
</section>

<style>
	/* The console: a recessed dark tray the channel modules sit in */
	.console {
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
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
		gap: 0.75rem;
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

	.knob {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgb(156 163 175);
	}

	.readout {
		min-width: 3.5rem;
		border-radius: 0.2rem;
		background: rgb(8 9 11);
		padding: 0.05rem 0.3rem;
		text-align: center;
		font-family: ui-monospace, monospace;
		font-size: 0.65rem;
		letter-spacing: 0;
		text-transform: none;
		color: rgb(251 191 36);
		box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.8);
	}

	/* Small sliders: a recessed groove with a round cap */
	.knob input {
		width: 5rem;
		height: 1rem;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	.knob input::-webkit-slider-runnable-track {
		height: 0.3rem;
		border-radius: 9999px;
		background: rgb(10 11 13);
		box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.9);
	}

	.knob input::-moz-range-track {
		height: 0.3rem;
		border-radius: 9999px;
		background: rgb(10 11 13);
		box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.9);
	}

	.knob input::-webkit-slider-thumb {
		appearance: none;
		margin-top: -0.35rem;
		width: 1rem;
		height: 1rem;
		border-radius: 9999px;
		background: radial-gradient(circle at 35% 30%, rgb(250 250 250), rgb(150 155 162) 60%, rgb(90 94 100));
		box-shadow: 0 2px 3px rgb(0 0 0 / 0.6);
	}

	.knob input::-moz-range-thumb {
		width: 1rem;
		height: 1rem;
		border: none;
		border-radius: 9999px;
		background: radial-gradient(circle at 35% 30%, rgb(250 250 250), rgb(150 155 162) 60%, rgb(90 94 100));
		box-shadow: 0 2px 3px rgb(0 0 0 / 0.6);
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

	/* Fader: a dark slot, a ridged cap, and a scale with tick marks */
	.fader-wrap {
		--cap: 1.1rem; /* fader cap height; the scale is inset by half of it */
		position: relative;
		display: flex;
		gap: 0.15rem;
		height: 11rem;
	}

	.slot {
		position: absolute;
		top: calc(var(--cap) / 2);
		bottom: calc(var(--cap) / 2);
		left: calc(1.125rem - 0.15rem);
		width: 0.3rem;
		border-radius: 9999px;
		background: rgb(5 6 8);
		box-shadow:
			inset 0 1px 3px rgb(0 0 0 / 1),
			0 0 0 1px rgb(255 255 255 / 0.05);
	}

	.fader {
		position: relative;
		writing-mode: vertical-lr;
		direction: rtl;
		height: 100%;
		width: 2.25rem;
		appearance: none;
		background: transparent;
		cursor: grab;
	}

	.fader:active {
		cursor: grabbing;
	}

	.fader::-webkit-slider-runnable-track {
		background: transparent;
	}

	.fader::-moz-range-track {
		background: transparent;
	}

	.fader::-webkit-slider-thumb {
		appearance: none;
		width: 2.25rem;
		height: var(--cap);
		border-radius: 0.2rem;
		background:
			linear-gradient(rgb(255 255 255 / 0.9), rgb(255 255 255 / 0.9)) center / 100% 2px no-repeat,
			linear-gradient(rgb(235 237 240), rgb(170 175 182) 45%, rgb(120 125 132) 55%, rgb(190 194 200));
		box-shadow:
			0 3px 5px rgb(0 0 0 / 0.7),
			inset 0 1px 0 rgb(255 255 255 / 0.8);
	}

	.fader::-moz-range-thumb {
		width: 2.25rem;
		height: var(--cap);
		border: none;
		border-radius: 0.2rem;
		background:
			linear-gradient(rgb(255 255 255 / 0.9), rgb(255 255 255 / 0.9)) center / 100% 2px no-repeat,
			linear-gradient(rgb(235 237 240), rgb(170 175 182) 45%, rgb(120 125 132) 55%, rgb(190 194 200));
		box-shadow:
			0 3px 5px rgb(0 0 0 / 0.7),
			inset 0 1px 0 rgb(255 255 255 / 0.8);
	}

	.master .fader::-webkit-slider-thumb {
		background:
			linear-gradient(rgb(255 255 255 / 0.9), rgb(255 255 255 / 0.9)) center / 100% 2px no-repeat,
			linear-gradient(rgb(248 113 113), rgb(200 50 50) 50%, rgb(150 30 30));
	}

	.master .fader::-moz-range-thumb {
		background:
			linear-gradient(rgb(255 255 255 / 0.9), rgb(255 255 255 / 0.9)) center / 100% 2px no-repeat,
			linear-gradient(rgb(248 113 113), rgb(200 50 50) 50%, rgb(150 30 30));
	}

	/* Scale: ticks line up with the centre of the fader cap at each level */
	.scale {
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
</style>
