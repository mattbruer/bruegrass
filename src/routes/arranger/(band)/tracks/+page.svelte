<script>
	/**
	 * The open song as tracks, like a DAW, laid out like Transcribe: a
	 * control bar (Play, Record, the click and the tempo), then the track
	 * grid: the band's parts and the audio lanes you record on, on the
	 * song's bars at its steady tempo. No player bar here: this page has its
	 * own controls, and each lane its own mute, solo and volume. The band
	 * plays the whole song once from the playhead; the arranger's loop is
	 * kept for when you go back. Picking a part's lane opens its editor
	 * under the lanes (the part pane); which part is open is in the page's
	 * history, so Back (a swipe on iPhone) closes it.
	 */
	import { onDestroy, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { pushState, replaceState } from '$app/navigation';
	import { useArranger } from '$lib/arranger/state/context.js';
	import SongBar from '$lib/arranger/components/song/SongBar.svelte';
	import TracksControls from '$lib/arranger/components/tracks/TracksControls.svelte';
	import TracksView from '$lib/arranger/components/tracks/TracksView.svelte';
	import RecordingNotes from '$lib/arranger/components/recording/RecordingNotes.svelte';
	import PartPane from '$lib/arranger/components/tracks/PartPane.svelte';
	import { partName } from '$lib/arranger/melody/partNames.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { recording, loop, player, song } = useArranger();
	onDestroy(loop.playThroughWhile());

	/** The part whose editor is open (a lane id; null: none). */
	const editing = $derived(/** @type {{ editing?: string }} */ (page.state).editing ?? null);

	/** @type {HTMLElement | undefined} */
	let pane = $state();
	/** The sticky control bar's height: the editor scrolls into view below it. */
	let controlsHeight = $state(0);

	/** @param {string} id */
	async function edit(id) {
		if (id === editing) return;
		if (editing) replaceState('', { editing: id });
		else {
			// After a reload this entry can still hold an editor that isn't open, which Back would bring back
			replaceState('', {});
			pushState('', { editing: id });
		}
		await tick();
		pane?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}

	/** What the editor follows: the band, from the playhead. */
	const bandClock = {
		get playing() {
			return player.isPlaying;
		},
		quarters: () => player.melodyTimeNow(),
		/** @param {number} quarters */
		seek: (quarters) => player.goTo(quarters)
	};
</script>

<svelte:head>
	<title>Tracks · Bluegrass Arranger</title>
</svelte:head>

<main class="ui-page-width flex flex-col gap-4 pt-6 pb-16">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-2xl font-bold">Tracks</h1>
		<a
			href={resolve('/arranger')}
			class="ui-button px-4 py-2 text-sm"
			use:tooltip={TIPS.tracks.back}
		>
			‹ Arranger
		</a>
	</div>
	<SongBar />
	<TracksControls bind:height={controlsHeight} />
	<RecordingNotes />
	<TracksView {editing} onEdit={edit} />
	{#if editing}
		<div
			bind:this={pane}
			style:scroll-margin-top="calc(var(--top-bar-height, 3.5rem) + {controlsHeight}px + 1rem)"
		>
			<PartPane
				voice={editing}
				name={partName(editing, song.partNames)}
				clock={bandClock}
				bind:view={settings.tracks.partView}
				onClose={() => history.back()}
			/>
		</div>
	{/if}
	{#if recording.lanes.length === 0}
		<p class="text-sm text-ink-soft">
			Add an audio lane to record on: a voice, or a real instrument along with the band.
		</p>
	{/if}
</main>
