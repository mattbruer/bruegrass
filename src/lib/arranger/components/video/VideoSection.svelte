<script>
	/**
	 * The A/V lanes' videos under the tracks: the layout keys, a link to the
	 * Video page (the same tiles, as big as the screen allows), then the
	 * tiles. Shows only once the song has an A/V lane.
	 */
	import { resolve } from '$app/paths';
	import { useArranger } from '../../state/context.js';
	import VideoWall from './VideoWall.svelte';
	import VideoLayoutPicker from './VideoLayoutPicker.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { recording } = useArranger();
</script>

{#if recording.filmedLanes.length > 0}
	<section class="flex flex-col gap-3" aria-label="Video">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="text-lg font-semibold">Video</h2>
			<div class="flex flex-wrap items-center gap-3">
				<VideoLayoutPicker />
				<a
					href={resolve('/arranger/video')}
					class="ui-button px-4 py-2 text-sm"
					use:tooltip={TIPS.video.open}>Watch ›</a
				>
			</div>
		</div>
		<VideoWall />
	</section>
{/if}
