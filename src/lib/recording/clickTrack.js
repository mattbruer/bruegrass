/**
 * A metronome click, scheduled on the audio clock: every click of the run
 * is placed up front at an exact time, so it never drifts. Works in any
 * AudioContext (the sampler's recording context now; the arranger's click
 * channel later).
 */

/** How the click sounds. Bar 1's downbeat is higher, so you can count bars. */
const CLICK = Object.freeze({
	accentHz: 1600,
	beatHz: 1000,
	seconds: 0.03,
	level: 0.5
});

/** Time to get everything scheduled before the first click. */
const START_DELAY_SECONDS = 0.1;

/**
 * @typedef {{ tempo: number, beatsPerBar: number, bars: number }} ClickRun
 *   tempo in beats per minute; bars counts every bar clicked, count-in included
 */

/**
 * Click `run.bars` bars at `run.tempo`, starting now (or at `start`).
 * @param {BaseAudioContext} context
 * @param {ClickRun} run
 * @param {AudioNode} [destination] default: the speakers
 * @param {number} [start] the audio-clock time of the first click (default: just after now)
 * @returns {() => void} stop (also safe once it has finished)
 */
export function playClicks(
	context,
	run,
	destination = context.destination,
	start = context.currentTime + START_DELAY_SECONDS
) {
	const accent = clickSound(context, CLICK.accentHz);
	const beat = clickSound(context, CLICK.beatHz);
	const secondsPerBeat = 60 / run.tempo;

	const players = clickTimes(run).map(({ beat: index, downbeat }) => {
		const player = context.createBufferSource();
		player.buffer = downbeat ? accent : beat;
		player.connect(destination);
		player.start(start + index * secondsPerBeat);
		return player;
	});

	return () => {
		for (const player of players) {
			player.stop();
			player.disconnect();
		}
		players.length = 0;
	};
}

/**
 * Every click of a run, in beats from the first.
 * @param {ClickRun} run
 */
export function clickTimes(run) {
	const total = run.bars * run.beatsPerBar;
	return Array.from({ length: total }, (_, beat) => ({
		beat,
		downbeat: beat % run.beatsPerBar === 0
	}));
}

/**
 * A short sine blip that dies away fast.
 * @param {BaseAudioContext} context
 * @param {number} hz
 */
function clickSound(context, hz) {
	const frames = Math.round(CLICK.seconds * context.sampleRate);
	const buffer = context.createBuffer(1, frames, context.sampleRate);
	const samples = buffer.getChannelData(0);
	for (let i = 0; i < frames; i++) {
		const fade = (1 - i / frames) ** 3;
		samples[i] = CLICK.level * fade * Math.sin((2 * Math.PI * hz * i) / context.sampleRate);
	}
	return buffer;
}
