<script>
	/**
	 * Move up and Move down, in a lane's menu: the way to reorder lanes
	 * from the keyboard, or for anyone who'd rather tap than drag the grip.
	 */
	import { useArranger } from '../../state/context.js';
	import { withLaneMoved } from '../../tracks/laneOrder.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ id: string, lanes: { id: string }[] }} lanes: every lane, in its order now */
	let { id, lanes } = $props();

	const { parts } = useArranger();

	const at = $derived(lanes.findIndex((lane) => lane.id === id));

	/** @param {number} to */
	function moveTo(to) {
		parts.setOrder(withLaneMoved(lanes, id, to));
	}
</script>

<div class="flex gap-2">
	<button
		type="button"
		class="flex-1 ui-button px-3 py-1.5 text-sm"
		disabled={at <= 0}
		onclick={() => moveTo(at - 1)}
		use:tooltip={TIPS.tracks.moveUp}>↑ Move up</button
	>
	<button
		type="button"
		class="flex-1 ui-button px-3 py-1.5 text-sm"
		disabled={at < 0 || at >= lanes.length - 1}
		onclick={() => moveTo(at + 2)}
		use:tooltip={TIPS.tracks.moveDown}>↓ Move down</button
	>
</div>
