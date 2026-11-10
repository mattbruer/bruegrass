<script>
	/**
	 * Send the song to someone who uses this app on another device: as a
	 * link (no takes) or one song file (takes included, compressed). It's
	 * prepared as soon as a way is picked, so the button hands it over at
	 * once: an iPhone only opens the share sheet straight from a tap.
	 */
	import { useArranger } from '../../state/context.js';
	import { gatherSong } from '../../share/gatherSong.js';
	import { shareLink } from '../../share/shareLink.js';
	import { SONG_FILE_EXTENSION, SONG_FILE_TYPE, songFileBytes } from '../../share/songFile.js';
	import { handOverFile, handOverLink, usesShareSheet } from '../../share/handOver.js';
	import { slugify } from '$lib/utils/slugify.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ onClose: () => void }} */
	let { onClose } = $props();

	/** Longer links may be cut short by some messaging apps (characters). */
	const LONG_LINK = 8000;

	const arranger = useArranger();
	const takeCount = arranger.recording.takes.filter((take) => take.inUse).length;

	let way = $state(/** @type {'link' | 'file'} */ (takeCount > 0 ? 'file' : 'link'));
	/** @type {{ way: 'link', url: string } | { way: 'file', bytes: Uint8Array, name: string } | null} */
	let ready = $state.raw(null);
	let problem = $state('');
	let done = $state('');
	const shareSheet = usesShareSheet();

	// Prepare it whenever the way changes (the latest choice wins)
	$effect(() => {
		const wanted = way;
		ready = null;
		problem = '';
		done = '';
		prepare(wanted).then(
			(result) => {
				if (way === wanted) ready = result;
			},
			(error) => (problem = `The song couldn’t be packed: ${error?.message ?? error}`)
		);
	});

	/** @param {'link' | 'file'} chosen */
	async function prepare(chosen) {
		const title = arranger.song.name || arranger.song.suggestedName;
		const { songPackage, audioFiles } = await gatherSong(arranger, {
			withTakes: chosen === 'file'
		});
		if (chosen === 'link') {
			return { way: chosen, url: await shareLink(songPackage, `${location.origin}/arranger`) };
		}
		const name = `${slugify(title)}.${SONG_FILE_EXTENSION}`;
		return { way: chosen, bytes: songFileBytes(songPackage, audioFiles), name };
	}

	async function handOver() {
		if (!ready) return;
		problem = '';
		try {
			const title = arranger.song.name || arranger.song.suggestedName;
			const result =
				ready.way === 'link'
					? await handOverLink(ready.url, title)
					: await handOverFile(ready.bytes, ready.name, SONG_FILE_TYPE);
			done = {
				copied: 'Link copied. Paste it into a message or email.',
				downloaded: 'Saved to your downloads. Send the file however you like.',
				shared: 'Sent.',
				cancelled: ''
			}[result];
		} catch (error) {
			problem = `It couldn’t be handed over: ${error instanceof Error ? error.message : error}`;
		}
	}

	let size = $derived(
		ready?.way === 'file'
			? ready.bytes.length < 1_000_000
				? `${Math.ceil(ready.bytes.length / 1000)} KB`
				: `${(ready.bytes.length / 1_000_000).toFixed(1)} MB`
			: ''
	);
	let buttonLabel = $derived(
		way === 'link'
			? shareSheet
				? 'Share link'
				: 'Copy link'
			: shareSheet
				? 'Share file'
				: 'Save file'
	);
	const WAYS = /** @type {const} */ ([
		{ id: 'link', name: 'Link', about: 'The song in a link to paste into a message. No takes.' },
		{
			id: 'file',
			name: 'Song file',
			about: 'One file with everything, takes included (compressed, about 1 MB a minute).'
		}
	]);
</script>

<div class="mt-4 flex flex-col gap-3 ui-well p-4 text-sm">
	<p>
		Everything in the song: chart, tune and harmonies, bass line, tempo, capo, key, the mix and any
		of your own chord shapes it uses. They open it in this app on their own device.
	</p>
	<div class="flex flex-col gap-2" role="radiogroup" aria-label="How to send it">
		{#each WAYS as option (option.id)}
			<button
				type="button"
				role="radio"
				aria-checked={way === option.id}
				class={['ui-button px-4 py-2 text-left', way === option.id && 'ui-button-on']}
				onclick={() => (way = option.id)}
				use:tooltip={TIPS.share[option.id]}
			>
				<span class="block font-semibold">{option.name}</span>
				<span class="block text-xs font-normal text-ink-soft">{option.about}</span>
			</button>
		{/each}
	</div>
	{#if way === 'link' && takeCount > 0}
		<p class="text-xs text-ink-soft">
			This song has {takeCount} take{takeCount === 1 ? '' : 's'}: only a song file carries them.
		</p>
	{/if}
	{#if ready?.way === 'link' && ready.url.length > LONG_LINK}
		<p class="text-xs text-ink-soft">
			This link is long, and some apps cut long links short. If it doesn’t open for them, send a
			song file instead.
		</p>
	{/if}
	<p class="text-xs text-ink-soft">
		{way === 'link'
			? 'The link opens the song in the app.'
			: 'They open it from Open → Open a song file.'}
		Changes after you send it don’t reach them: send it again to update their copy.
	</p>
</div>

{#if problem}
	<p class="mt-3 text-sm text-danger" role="alert">{problem}</p>
{/if}
{#if done}
	<p class="mt-3 text-sm" role="status">{done}</p>
{/if}

<div class="mt-5 flex items-center justify-end gap-3">
	{#if size}
		<span class="mr-auto text-xs text-ink-soft">{size}</span>
	{/if}
	<button type="button" class="ui-button px-4 py-2" onclick={onClose}>
		{done ? 'Close' : 'Cancel'}
	</button>
	<button
		type="button"
		class="ui-button px-5 py-2 ui-button-primary"
		disabled={!ready}
		onclick={handOver}
		use:tooltip={TIPS.share.send}
	>
		{ready ? buttonLabel : 'Preparing…'}
	</button>
</div>
