/**
 * The camera, as getUserMedia asks for it. One place, so every A/V take is
 * filmed the same way.
 *
 * - The front camera: you film yourself playing.
 * - 720p: plenty for a tile (four share a screen), half the size of 1080p.
 * - 60 frames a second: A/V takes slow down with the tempo, and at half
 *   speed 30 fps would show as a choppy 15 (60 shows as a smooth 30).
 *   A camera that can't gives what it can.
 */
export const CAMERA = Object.freeze({
	facingMode: 'user',
	width: { ideal: 1280 },
	height: { ideal: 720 },
	frameRate: { ideal: 60 }
});
