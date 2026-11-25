<script>
	/**
	 * The A/V lanes' videos under the tracks, folded shut until opened: the
	 * Video toggle, a link to the Video page (the same tiles, as big as the
	 * screen allows), and, open, the camera and layout keys and the tiles.
	 * Shows only once the song has an A/V lane.
	 */
	import { resolve } from '$app/paths';
	import { useArranger } from '../../state/context.js';
	import VideoWall from './VideoWall.svelte';
	import VideoLayoutPicker from './VideoLayoutPicker.svelte';
	import CameraPicker from './CameraPicker.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ open?: boolean }} */
	let { open = $bindable(false) } = $props();

	const { recording } = useArranger();
</script>

{#if recording.filmedLanes.length > 0}
	<section class="flex flex-col gap-3" aria-label="Video">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<button
				type="button"
				class="ui-button px-4 py-2 text-sm font-semibold"
				aria-expanded={open}
				onclick={() => (open = !open)}
				use:tooltip={TIPS.video.show}
			>
				{open ? '▾' : '▸'} Video
			</button>
			<div class="flex flex-wrap items-center gap-3">
				{#if open}
					<CameraPicker disabled={recording.isRecording} />
					<VideoLayoutPicker />
				{/if}
				<a
					href={resolve('/arranger/video')}
					class="ui-button px-4 py-2 text-sm"
					use:tooltip={TIPS.video.open}>Watch ›</a
				>
			</div>
		</div>
		{#if open}
			<VideoWall />
		{/if}
	</section>
{/if}
