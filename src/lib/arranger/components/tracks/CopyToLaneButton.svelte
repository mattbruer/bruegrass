<script>
	/**
	 * Copy a harmony part to a lane of its own, to change its notes by hand
	 * (the harmony part itself follows the melody and the chords). The host
	 * places it; `onCopied` hears the new lane's id, to open it.
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{ part: string, class?: string, onCopied?: (id: string) => void }}
	 *   part: the harmony part's id
	 */
	let { part, class: className = '', onCopied } = $props();

	const { parts } = useArranger();

	function copy() {
		const id = parts.copy(part);
		if (id) onCopied?.(id);
	}
</script>

<button
	type="button"
	class="ui-button {className}"
	disabled={!parts.canAdd}
	onclick={copy}
	use:tooltip={parts.canAdd ? TIPS.tracks.copyPart : TIPS.tracks.copyPartFull}
	>Copy to a new lane</button
>
