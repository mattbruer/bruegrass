/**
 * Hand the user a file to save (the browser's normal download).
 * @param {BlobPart} contents
 * @param {string} fileName
 * @param {string} type MIME type, e.g. 'audio/midi'
 */
export function downloadFile(contents, fileName, type) {
	const url = URL.createObjectURL(new Blob([contents], { type }));

	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	link.click();

	// Give the download a moment to start before freeing the file
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
