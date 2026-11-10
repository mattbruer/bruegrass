/**
 * On a computer, a song file dragged onto the page opens it (the receive
 * dialog checks it's one). Any file dropped is caught, so a missed drop
 * never makes the browser leave the page for the file. A part of the page
 * with its own drop zone handles the drop first (and prevents the default).
 * @param {(file: File) => void} onFile
 * @returns {() => void} stop
 */
export function openDroppedSongFiles(onFile) {
	/** @param {DragEvent} event */
	const over = (event) => {
		if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
	};
	/** @param {DragEvent} event */
	const drop = (event) => {
		const file = event.dataTransfer?.files[0];
		if (!file || event.defaultPrevented) return;
		event.preventDefault();
		onFile(file);
	};
	addEventListener('dragover', over);
	addEventListener('drop', drop);
	return () => {
		removeEventListener('dragover', over);
		removeEventListener('drop', drop);
	};
}
