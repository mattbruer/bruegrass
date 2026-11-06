/**
 * Whether the listening setups dialog is open. Shared, because it opens
 * from the mixer's title row and from the note in every EQ window.
 */
export const listeningDialog = $state({ open: false });

export function openListeningDialog() {
	listeningDialog.open = true;
}
