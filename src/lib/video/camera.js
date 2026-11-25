/**
 * The camera, as getUserMedia asks for it. One place, so every A/V take is
 * filmed the same way.
 *
 * - The front camera (you film yourself playing), or the one chosen: on a
 *   Mac that can be an iPhone, through Continuity Camera, which the browser
 *   lists like any other camera.
 * - 720p: plenty for a tile, and Facebook shows reels at up to 720p.
 *   Filmed upright (a phone held tall) it fills a reel's 9:16 tiles; filmed
 *   sideways, a tall tile crops its sides.
 * - 60 frames a second: A/V takes slow down with the tempo, and at half
 *   speed 30 fps would show as a choppy 15 (60 shows as a smooth 30).
 *   A camera that can't gives what it can.
 */
const QUALITY = Object.freeze({
	width: { ideal: 1280 },
	height: { ideal: 720 },
	frameRate: { ideal: 60 }
});

/**
 * @param {string | null} deviceId the camera chosen (null: the front camera)
 * @returns {MediaTrackConstraints}
 */
export function cameraConstraints(deviceId) {
	return deviceId
		? { ...QUALITY, deviceId: { exact: deviceId } }
		: { ...QUALITY, facingMode: 'user' };
}

/** @typedef {{ id: string, label: string }} Camera */

/**
 * The cameras this device can film with. Their names stay blank until the
 * page has been allowed the camera once.
 * @returns {Promise<Camera[]>}
 */
export async function listCameras() {
	const devices = await navigator.mediaDevices.enumerateDevices();
	return devices
		.filter((device) => device.kind === 'videoinput' && device.deviceId)
		.map((device, index) => ({
			id: device.deviceId,
			label: device.label || `Camera ${index + 1}`
		}));
}
