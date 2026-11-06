<script>
	/**
	 * The player's top row, in three fixed areas (not free wrapping), so
	 * nothing jumps around as the screen narrows:
	 *
	 *   wide:    [Play Stop]  [Tempo Capo Key]  [Mixer .mid]
	 *   medium:  [Play Stop]                    [Mixer .mid]
	 *            [Tempo Capo Key]
	 *   narrow:  each area on its own row
	 *
	 * (.mid is hidden on touch screens.)
	 */
	import TransportButtons from './TransportButtons.svelte';
	import TempoField from './TempoField.svelte';
	import CapoSelect from './CapoSelect.svelte';
	import KeySelect from './KeySelect.svelte';
	import MixerToggleButton from './MixerToggleButton.svelte';
	import ExportButton from '../export/ExportButton.svelte';
</script>

<div class="toolbar">
	<div class="transport">
		<TransportButtons />
	</div>

	<div class="settings">
		<TempoField />
		<CapoSelect />
		<KeySelect />
	</div>

	<div class="actions">
		<MixerToggleButton />
		<ExportButton />
	</div>
</div>

<style>
	.toolbar {
		display: grid;
		grid-template-columns: auto 1fr auto;
		grid-template-areas: 'transport settings actions';
		align-items: center;
		gap: 0.75rem 1.5rem;
		margin-bottom: 0.75rem;
	}

	.transport {
		grid-area: transport;
	}

	.settings {
		grid-area: settings;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.25rem;
	}

	.actions {
		grid-area: actions;
		display: flex;
		gap: 0.5rem;
	}

	@media (max-width: 900px) {
		.toolbar {
			grid-template-columns: auto auto;
			grid-template-areas:
				'transport actions'
				'settings settings';
			justify-content: space-between;
		}
	}

	@media (max-width: 560px) {
		.toolbar {
			grid-template-columns: 1fr;
			grid-template-areas: 'transport' 'actions' 'settings';
			justify-content: stretch;
		}
	}
</style>
