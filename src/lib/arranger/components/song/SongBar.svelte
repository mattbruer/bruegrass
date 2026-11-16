<script>
	/**
	 * The song that's open: its name, and New, Open and Rename. Songs save
	 * themselves (state/autosave.svelte.js), so there's no Save.
	 */
	import { useArranger } from '../../state/context.js';
	import RenameSongDialog from './RenameSongDialog.svelte';
	import OpenSongDialog from './OpenSongDialog.svelte';
	import ExampleSongSelect from './ExampleSongSelect.svelte';
	import ExportButton from '../export/ExportButton.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { song } = useArranger();

	let renameDialogOpen = $state(false);
	let openDialogOpen = $state(false);

	let displayName = $derived(song.name || song.suggestedName);
	let status = $derived(
		song.isNew ? 'Change anything to make it your own song' : 'Saved on this device'
	);
</script>

<section class="mb-6 flex flex-wrap items-center gap-3" aria-label="Song">
	<div class="mr-auto min-w-0">
		<h2 class="truncate text-lg font-bold">{displayName}</h2>
		<p class="text-sm text-ink-soft" aria-live="polite">{status}</p>
	</div>

	<ExampleSongSelect />
	<ExportButton />
	<button
		type="button"
		class="ui-button px-4 py-2"
		onclick={() => song.startNew()}
		use:tooltip={TIPS.song.new}>New</button
	>
	<button
		type="button"
		class="ui-button px-4 py-2"
		onclick={() => (openDialogOpen = true)}
		use:tooltip={TIPS.song.open}
	>
		Open
	</button>
	<button
		type="button"
		class="ui-button px-4 py-2"
		onclick={() => (renameDialogOpen = true)}
		use:tooltip={TIPS.song.rename}
	>
		Rename
	</button>
</section>

<RenameSongDialog bind:open={renameDialogOpen} />
<OpenSongDialog bind:open={openDialogOpen} />
