/**
 * Where the /sampler page saves its samples into the project
 * (samples-source/, see $lib/server/sampleLibrary.js). Dev on localhost
 * only, like the page itself: anywhere else this doesn't exist.
 *
 *   PUT  ?folder=…&file=note/D-f05-hard-t2.wav&size=…   form data: bytes
 *        (form data rather than a raw body: the app's test browser drops
 *        raw binary bodies, and a form upload works everywhere; size is
 *        checked so a file that arrives short is refused, never saved)
 *   POST ?folder=…   body: { keep: [file, …] }   removes the WAVs not listed
 */
import { error, json } from '@sveltejs/kit';
import { isLocalDev } from '$lib/devOnly.js';
import { pruneSampleFiles, writeSampleFile } from '$lib/server/sampleLibrary.js';

/** @param {URL} url */
function folderOf(url) {
	if (!isLocalDev(url)) error(404, 'Not found');
	return url.searchParams.get('folder') ?? '';
}

/**
 * Turn a bad path into a 400 rather than a crash.
 * @template T
 * @param {() => Promise<T>} job
 */
async function asRequest(job) {
	try {
		return await job();
	} catch (problem) {
		const message = problem instanceof Error ? problem.message : String(problem);
		error(message.startsWith('Not a sample path') ? 400 : 500, message);
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ url, request }) {
	const folder = folderOf(url);
	const file = url.searchParams.get('file') ?? '';
	const upload = (await request.formData()).get('bytes');
	if (!(upload instanceof Blob)) error(400, 'No file sent');
	const bytes = new Uint8Array(await upload.arrayBuffer());
	// Never write a short file and call it saved: a recording would be lost quietly
	if (bytes.length !== Number(url.searchParams.get('size')))
		error(400, `${file} arrived with ${bytes.length} bytes, not ${url.searchParams.get('size')}`);
	await asRequest(() => writeSampleFile(folder, file, bytes));
	return new Response(null, { status: 204 });
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ url, request }) {
	const folder = folderOf(url);
	const { keep } = await request.json();
	if (!Array.isArray(keep)) error(400, 'keep must be a list');
	const removed = await asRequest(() => pruneSampleFiles(folder, keep.map(String)));
	return json({ removed });
}
