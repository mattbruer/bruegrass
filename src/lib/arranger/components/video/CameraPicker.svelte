<script>
	/**
	 * Which camera A/V lanes film with: the front camera, or any the device
	 * lists (on a Mac, an iPhone nearby through Continuity Camera). Kept on
	 * this device (settings.video.camera). Names show once the camera has
	 * been allowed; plugging one in or out updates the list.
	 */
	import { onMount } from 'svelte';
	import { listCameras } from '$lib/video/camera.js';
	import { watchInputs } from '$lib/audio/recording/micInput.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ disabled?: boolean }} */
	let { disabled = false } = $props();

	let cameras = $state.raw(/** @type {import('$lib/video/camera.js').Camera[]} */ ([]));

	async function refresh() {
		cameras = await listCameras();
	}

	onMount(() => {
		refresh();
		return watchInputs(refresh);
	});

	/** The one chosen is gone (unplugged): the front camera until it's back. */
	const chosen = $derived(
		cameras.some((camera) => camera.id === settings.video.camera) ? settings.video.camera : ''
	);
</script>

<select
	class="ui-field px-2 py-1.5 text-sm"
	aria-label="Camera"
	value={chosen}
	{disabled}
	onchange={(event) => (settings.video.camera = event.currentTarget.value || null)}
	onfocus={refresh}
	use:tooltip={TIPS.video.camera}
>
	<option value="">Front camera</option>
	{#each cameras as camera (camera.id)}
		<option value={camera.id}>{camera.label}</option>
	{/each}
</select>
