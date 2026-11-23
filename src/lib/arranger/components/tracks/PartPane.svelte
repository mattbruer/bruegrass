<script>
	/**
	 * The picked part under a track grid, like Logic's bottom pane: its piano
	 * roll, or the same part as sheet music (the tune with all its voices, or
	 * the bass line), or as TAB. The host says which part, what the roll
	 * follows (`clock`) and where the view choice is kept; `onClose` given,
	 * a × closes the pane.
	 */
	import MelodyDrawing from '../pianoRoll/MelodyDrawing.svelte';
	import SheetMusic from '../melody/SheetMusic.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { useArranger } from '../../state/context.js';
	import { PART_VIEWS } from '../../tracks/partViews.js';
	import { BASS_VOICE } from '../../bass/readBass.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   voice: string,
	 *   name: string,
	 *   clock: { playing: boolean, quarters: () => number, seek?: (quarters: number) => void },
	 *   view: string,
	 *   bassStartsEmpty?: boolean,
	 *   keyMenu?: boolean,
	 *   onClose?: () => void
	 * }}
	 *   voice: the part (a lane id); view: an id in tracks/partViews.js;
	 *   bassStartsEmpty: an unwritten bass starts empty, to write by ear
	 */
	let {
		voice,
		name,
		clock,
		view = $bindable(),
		bassStartsEmpty = false,
		keyMenu = true,
		onClose
	} = $props();

	const { melody, bass } = useArranger();

	const sheetNotation = $derived(voice === BASS_VOICE ? bass.notation : undefined);
	const nothingWritten = $derived((sheetNotation ?? melody.notation).trim() === '');
</script>

<section class="flex flex-col gap-2 ui-card p-3 sm:p-4" aria-label="The picked part">
	<div class="flex flex-wrap items-center gap-3">
		<TabSwitch
			bind:value={view}
			tabs={PART_VIEWS}
			tips={TIPS.partPane.views}
			label="Show the part as"
		/>
		<h2 class="text-sm font-bold">{name}</h2>
		{#if onClose}
			<button
				type="button"
				class="ml-auto ui-button px-3 py-1 text-sm"
				aria-label="Close {name}"
				onclick={onClose}
				use:tooltip={TIPS.partPane.close}>✕</button
			>
		{/if}
	</div>
	{#if view === 'sheet'}
		{#if nothingWritten}
			<p class="text-sm text-ink-soft">Nothing written yet. Draw it in the piano roll.</p>
		{:else}
			<SheetMusic notation={sheetNotation} {clock} />
		{/if}
	{:else}
		<MelodyDrawing
			{voice}
			{clock}
			{bassStartsEmpty}
			{keyMenu}
			view={view === 'tab' ? 'tab' : 'roll'}
		/>
	{/if}
</section>
