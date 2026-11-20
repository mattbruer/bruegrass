<script>
	/**
	 * Settings → Appearance: the theme choices (see $lib/theme).
	 * Changes show immediately: the root layout applies settings.appearance
	 * to the page whenever it changes.
	 */
	import { settings } from '../settings.svelte.js';
	import SettingRow from '../controls/SettingRow.svelte';
	import ColorSwatch from '../controls/ColorSwatch.svelte';
	import ToggleSwitch from '../controls/ToggleSwitch.svelte';
	import {
		APPEARANCE_PRESETS,
		DEFAULT_APPEARANCE,
		READABLE_CONTRAST,
		contrastRatio
	} from '$lib/theme/theme.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** How readable the text is on the background (warns below READABLE_CONTRAST). */
	let textContrast = $derived(
		contrastRatio(settings.appearance.text, settings.appearance.background)
	);
	let textIsHardToRead = $derived(textContrast < READABLE_CONTRAST);

	/** @param {import('$lib/theme/theme.js').Appearance} appearance */
	function useAppearance(appearance) {
		Object.assign(settings.appearance, appearance);
	}

	/** @param {import('$lib/theme/theme.js').Appearance} preset */
	function isCurrentLook(preset) {
		const current = settings.appearance;
		return (
			current.background === preset.background &&
			current.text === preset.text &&
			current.accent === preset.accent
		);
	}
</script>

<div class="flex flex-col gap-5">
	<!-- Presets: a whole look in one tap -->
	<section>
		<h3 class="mb-3 text-xs font-bold tracking-wider text-ink-faint uppercase">Presets</h3>
		<div class="flex flex-wrap gap-3">
			{#each APPEARANCE_PRESETS as preset (preset.name)}
				<button
					type="button"
					class="flex items-center gap-2 ui-button px-3 py-2 text-sm"
					class:ui-button-on={isCurrentLook(preset.appearance)}
					aria-pressed={isCurrentLook(preset.appearance)}
					onclick={() => useAppearance(preset.appearance)}
					use:tooltip={TIPS.settings.preset}
				>
					<!-- A little preview: the background, with the accent as a dot -->
					<span
						class="preview"
						style:background={preset.appearance.background}
						style:color={preset.appearance.accent}
						aria-hidden="true"
					></span>
					{preset.name}
				</button>
			{/each}
		</div>
	</section>

	<section class="ui-well px-4 py-2">
		<h3 class="mt-2 text-xs font-bold tracking-wider text-ink-faint uppercase">Colours</h3>

		<SettingRow
			id="setting-background"
			label="Background"
			description="The surface everything sits on."
		>
			<ColorSwatch bind:color={settings.appearance.background} labelledBy="setting-background" />
		</SettingRow>

		<SettingRow id="setting-text" label="Text">
			<ColorSwatch bind:color={settings.appearance.text} labelledBy="setting-text" />
		</SettingRow>
		{#if textIsHardToRead}
			<p class="mb-2 text-sm text-danger" role="status">
				This text may be hard to read on this background (contrast {textContrast.toFixed(1)}:1; aim
				for at least {READABLE_CONTRAST}:1).
			</p>
		{/if}

		<SettingRow
			id="setting-accent"
			label="Accent"
			description="Buttons that are on, the playing note, the page you're on."
		>
			<ColorSwatch bind:color={settings.appearance.accent} labelledBy="setting-accent" />
		</SettingRow>
	</section>

	<section class="ui-well px-4 py-3">
		<h3 class="mb-1 text-xs font-bold tracking-wider text-ink-faint uppercase">Shape</h3>

		<SettingRow
			id="setting-drop-shadows"
			label="3D depth"
			description="Things stand up off the page and sink into it. Off: the whole app is flat."
		>
			<ToggleSwitch
				bind:on={settings.appearance.dropShadows}
				labelledBy="setting-drop-shadows"
				tip={TIPS.settings.dropShadows}
			/>
		</SettingRow>
		{#if settings.appearance.dropShadows}
			<label class="block pb-2">
				<span class="flex justify-between font-semibold">
					Drop shadow strength
					<span class="font-mono text-sm text-ink-soft"
						>{settings.appearance.dropStrength.toFixed(1)}</span
					>
				</span>
				<span class="block text-sm text-ink-soft">From a hint (0) to towering (2).</span>
				<input
					type="range"
					min="0"
					max="2"
					step="0.1"
					bind:value={settings.appearance.dropStrength}
					class="range"
				/>
			</label>
			<label class="block pb-2">
				<span class="flex justify-between font-semibold">
					Sink depth
					<span class="font-mono text-sm text-ink-soft"
						>{settings.appearance.sinkDepth.toFixed(1)}</span
					>
				</span>
				<span class="block text-sm text-ink-soft"
					>How deep the chord strip, piano roll, lanes, fields and meters sit in the page, from a
					dent (0) to a deep slot (2).</span
				>
				<input
					type="range"
					min="0"
					max="2"
					step="0.1"
					bind:value={settings.appearance.sinkDepth}
					class="range"
				/>
			</label>
			<label class="block pb-2">
				<span class="flex justify-between font-semibold">
					Edge shading
					<span class="font-mono text-sm text-ink-soft">{settings.appearance.depth.toFixed(1)}</span
					>
				</span>
				<span class="block text-sm text-ink-soft"
					>The soft shading around every edge, from none (0) to deep (2).</span
				>
				<input
					type="range"
					min="0"
					max="2"
					step="0.1"
					bind:value={settings.appearance.depth}
					class="range"
				/>
			</label>
		{/if}

		<label class="block py-2">
			<span class="flex justify-between font-semibold">
				Corner roundness
				<span class="font-mono text-sm text-ink-soft"
					>{settings.appearance.roundness.toFixed(1)}</span
				>
			</span>
			<span class="block text-sm text-ink-soft">From square (0) to extra round (2).</span>
			<input
				type="range"
				min="0"
				max="2"
				step="0.1"
				bind:value={settings.appearance.roundness}
				class="range"
			/>
		</label>
	</section>

	<button
		type="button"
		class="self-start ui-button px-4 py-2 text-sm"
		onclick={() => useAppearance(DEFAULT_APPEARANCE)}
		use:tooltip={TIPS.settings.resetAppearance}
	>
		Reset to the original look
	</button>
</div>

<style>
	/* Preset preview: a circle of the background colour with an accent dot */
	.preview {
		position: relative;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		box-shadow: var(--shadow-inset-small);
	}

	.preview::after {
		content: '';
		position: absolute;
		inset: 0.4rem;
		border-radius: 9999px;
		background: currentColor;
	}

	.range {
		margin-top: 0.5rem;
		width: 100%;
		accent-color: var(--color-accent);
	}
</style>
