/**
 * The microphone or audio interface, as a Web Audio source.
 *
 * Browsers process a microphone for video calls by default: echo
 * cancellation, automatic gain and noise suppression. All three ruin a
 * recording (gain that rides your dynamics, a guitar's ring gated as
 * "noise"), so they're turned off here, and `processingLeftOn` reports any
 * the browser kept anyway.
 */

/** What we ask the browser for. One place for these, so every recording gets the same. */
const RAW_INPUT = Object.freeze({
	echoCancellation: false,
	autoGainControl: false,
	noiseSuppression: false
});

/**
 * How many input channels to ask for: two mics (e.g. a condenser and a
 * dynamic on inputs 1 and 2). The browser may give fewer.
 */
const WANTED_CHANNELS = 2;

/** @typedef {{ id: string, label: string, named: boolean }} InputDevice */

/**
 * The audio inputs on this computer. Their names stay blank until you've
 * allowed the page to use the microphone once.
 * @returns {Promise<InputDevice[]>}
 */
export async function listInputs() {
	const devices = await navigator.mediaDevices.enumerateDevices();
	return devices
		.filter((device) => device.kind === 'audioinput')
		.map((device, index) => ({
			id: device.deviceId,
			label: device.label || `Input ${index + 1}`,
			named: device.label !== ''
		}));
}

/**
 * Call `onChange` whenever an input is plugged in or unplugged.
 * Returns a function that stops watching.
 * @param {() => void} onChange
 */
export function watchInputs(onChange) {
	navigator.mediaDevices.addEventListener('devicechange', onChange);
	return () => navigator.mediaDevices.removeEventListener('devicechange', onChange);
}

/**
 * Open an input in `context`. Asks for microphone permission the first time.
 * @param {BaseAudioContext & { createMediaStreamSource: AudioContext['createMediaStreamSource'] }} context
 * @param {string | null} deviceId which input (null: the computer's default)
 * @param {{ channels?: number }} [options] how many input channels to ask for
 */
export async function openMicInput(context, deviceId, { channels = WANTED_CHANNELS } = {}) {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: {
			...RAW_INPUT,
			...(deviceId ? { deviceId: { exact: deviceId } } : {}),
			channelCount: { ideal: channels },
			sampleRate: { ideal: context.sampleRate },
			sampleSize: { ideal: 24 }
		}
	});
	const track = stream.getAudioTracks()[0];
	const settings = track.getSettings();
	const source = context.createMediaStreamSource(stream);

	return {
		source,
		/** The input actually opened (the default resolves to a real device). */
		deviceId: settings.deviceId ?? deviceId,
		label: track.label,
		/** The browser's estimate of the input's delay, in seconds (0 when it doesn't say). */
		latency: typeof settings.latency === 'number' ? settings.latency : 0,
		channelCount: settings.channelCount ?? source.channelCount,
		/** Call-style processing the browser left on despite being asked not to (names). */
		processingLeftOn: Object.keys(RAW_INPUT).filter(
			(name) => settings[/** @type {keyof typeof RAW_INPUT} */ (name)] === true
		),

		/** Let go of the input (the browser's recording light goes off). */
		close() {
			source.disconnect();
			for (const each of stream.getTracks()) each.stop();
		}
	};
}

/** @typedef {Awaited<ReturnType<typeof openMicInput>>} MicInput */
