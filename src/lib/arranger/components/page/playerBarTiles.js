/**
 * What the player bar shows, in order: the tiles at its start (left) and at
 * its end (right). This is the one place to change the bar's contents. A new
 * tile is a component that draws one `bar-tile` (see PlayerBar.svelte for
 * its size and look). When the bar needs different tiles for different
 * work (recording, say), this becomes one list per mode.
 */
import TransportButtons from '../player/TransportButtons.svelte';
import ToStartTile from '../player/ToStartTile.svelte';
import TempoButton from '../player/TempoButton.svelte';
import CountInTile from '../player/CountInTile.svelte';
import RecordTile from '../recording/RecordTile.svelte';
import EditTile from './EditTile.svelte';
import MixerTile from './MixerTile.svelte';

export const PLAYER_BAR_TILES = Object.freeze({
	start: [TransportButtons, ToStartTile, RecordTile, TempoButton, CountInTile],
	end: [EditTile, MixerTile]
});
