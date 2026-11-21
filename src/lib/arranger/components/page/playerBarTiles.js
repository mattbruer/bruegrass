/**
 * What the player bar shows, in order: the tiles at its start (left) and at
 * its end (right). This is the one place to change the bar's contents. A new
 * tile is a component that draws one `bar-tile` (see PlayerBar.svelte for
 * its size and look). Recording is on the Tracks page, which has its own
 * controls.
 */
import TransportButtons from '../player/TransportButtons.svelte';
import ToStartTile from '../player/ToStartTile.svelte';
import MetronomeTile from '../player/MetronomeTile.svelte';
import TempoTile from '../player/TempoTile.svelte';
import EditTile from './EditTile.svelte';
import MixerTile from './MixerTile.svelte';

export const PLAYER_BAR_TILES = Object.freeze({
	start: [TransportButtons, ToStartTile, MetronomeTile, TempoTile],
	end: [EditTile, MixerTile]
});
