<script>
	/**
	 * The menu under the tracks ruler for a bar's number: its section marker,
	 * named as in Transcribe (a name starts a section here; clear it to take
	 * the marker away). Escape or ✕ closes it.
	 */
	import { MARKER_NAMES } from '../../transcription/markerNames.js';
	import { setSectionMarker } from '../../builder/sectionMarkers.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   bar: import('../../tracks/ruler.js').RulerBar,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>,
	 *   arrangement: import('../../state/ArrangementState.svelte.js').ArrangementState,
	 *   onClose: () => void
	 * }}
	 */
	let { bar, scale, arrangement, onClose } = $props();

	/** @param {HTMLElement} element */
	function focusOnOpen(element) {
		element.focus();
	}

	/** @param {string} name */
	function markBar(name) {
		if (!bar.place) return;
		const place = bar.place;
		arrangement.editWritten((chart) => setSectionMarker(chart, place, name));
	}
</script>

<!-- The ruler's click plays from the spot: a click on the menu must not -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="menu ui-floating ui-card"
	style:left="{scale.toX(bar.start)}px"
	onclick={(event) => event.stopPropagation()}
>
	<div class="flex items-center gap-2">
		<strong>{bar.label ?? `Bar ${bar.number}`}</strong>
		<button
			type="button"
			class="ml-auto size-7 ui-button text-sm"
			onclick={onClose}
			aria-label="Close"
			use:tooltip={TIPS.transcription.closeMenu}>✕</button
		>
	</div>
	<label class="flex items-center gap-2">
		<span>Marker</span>
		<input
			type="text"
			class="min-w-0 flex-1 ui-field px-2 py-1"
			list="tracks-marker-names"
			placeholder="Verse, Banjo solo…"
			value={bar.sectionName ?? ''}
			onchange={(event) => markBar(event.currentTarget.value)}
			onkeydown={(event) => {
				if (event.key === 'Enter') {
					event.currentTarget.blur();
					onClose();
				}
				if (event.key === 'Escape') onClose();
			}}
			use:focusOnOpen
			use:tooltip={TIPS.transcription.marker}
		/>
		<datalist id="tracks-marker-names">
			{#each MARKER_NAMES as name (name)}
				<option value={name}></option>
			{/each}
		</datalist>
	</label>
</div>

<style>
	.menu {
		position: absolute;
		top: calc(100% + 0.25rem);
		z-index: 5;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 13rem;
		padding: 0.6rem 0.75rem;
		font-size: 0.85rem;
		cursor: default;
	}
</style>
