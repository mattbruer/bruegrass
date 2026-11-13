/**
 * Plays a whole song at any speed without changing its pitch (the transcribe
 * page). The page decodes the song and hands it over once; from then on
 * play, pause, jumps and speed changes are small messages, and the
 * stretching happens here on the audio thread.
 *
 * Messages in:  { type: 'load', left, right? }  the song's samples (Float32Array per channel)
 *               { type: 'play' } { type: 'pause' }
 *               { type: 'seek', seconds } { type: 'speed', speed }
 *               { type: 'frame', seconds }  the stretcher's frame length (the page's Sound)
 *               { type: 'clicks', times, accents }  clicks on these song times (empty: none)
 *               { type: 'loop', from, to }  play this stretch over and over (from null: no loop)
 *               { type: 'notes', notes }  the written parts' notes to play (partNotes.js)
 *               { type: 'levels', recording, parts }  0 to 1: the recording's, and each part's
 *               { type: 'tune', cents }  move the song's pitch a little (fine tuning)
 * Messages out: { type: 'time', seconds } about 40 times a second while playing,
 *               { type: 'ended' } when the song runs out.
 *
 * Unlike the other processors this one imports its DSP (shared with the
 * tests); worklets.js loads it bundled into one file.
 */
import { createStretcher, frameSizeFor } from '../../../transcribe/stretch/stretcher.js';
import { withPitchShift } from '../../../transcribe/stretch/withPitchShift.js';
import { createBeatClicks } from '../../../transcribe/beatClicks.js';
import { createPartNotes } from '../../../transcribe/partNotes.js';

/** Play and pause fade over this long, so they never click. */
const FADE_SECONDS = 0.01;
/** Render quanta (128 frames each) between time reports. */
const QUANTA_PER_REPORT = 8;

class StretchPlayerProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		/** @type {ReturnType<typeof withPitchShift> | null} */
		this.stretcher = null;
		this.cents = 0;
		/** @type {{ left: Float32Array, right?: Float32Array } | null} */
		this.song = null;
		this.frameSize = frameSizeFor(sampleRate);
		this.playing = false;
		this.speed = 1;
		this.level = 0;
		this.fadeStep = 1 / (FADE_SECONDS * sampleRate);
		this.quantaSinceReport = 0;
		this.spareRight = new Float32Array(128);
		this.clicks = createBeatClicks(sampleRate);
		this.notes = createPartNotes(sampleRate);
		this.recordingLevel = 1;
		this.heardRecordingLevel = 1;
		/** @type {{ from: number, to: number } | null} */
		this.loop = null;
		this.port.onmessage = ({ data }) => this.receive(data);
	}

	/** @param {any} message */
	receive(message) {
		if (message.type === 'load') {
			this.song = { left: message.left, right: message.right };
			this.startStretcher(0);
			this.playing = false;
			this.level = 0;
		} else if (message.type === 'frame') {
			this.frameSize = frameSizeFor(sampleRate, message.seconds);
			if (this.stretcher) this.startStretcher(this.stretcher.time);
		} else if (message.type === 'play') {
			this.playing = true;
		} else if (message.type === 'pause') {
			this.playing = false;
		} else if (message.type === 'seek') {
			this.stretcher?.seek(message.seconds);
			this.report();
		} else if (message.type === 'speed') {
			this.speed = message.speed;
		} else if (message.type === 'loop') {
			this.loop = message.from === null ? null : { from: message.from, to: message.to };
		} else if (message.type === 'clicks') {
			this.clicks.set(message.times, message.accents);
		} else if (message.type === 'notes') {
			this.notes.set(message.notes);
		} else if (message.type === 'tune') {
			this.cents = message.cents;
			this.stretcher?.setCents(this.cents);
		} else if (message.type === 'levels') {
			this.recordingLevel = message.recording;
			this.notes.setLevels(message.parts);
		}
	}

	/**
	 * @param {Float32Array[][]} _inputs
	 * @param {Float32Array[][]} outputs
	 */
	process(_inputs, outputs) {
		const stretcher = this.stretcher;
		if (!stretcher || (!this.playing && this.level === 0)) return true;

		const left = outputs[0][0];
		const right = outputs[0][1] ?? this.spareRight;
		const from = stretcher.time;
		stretcher.render(left, right, this.speed);
		this.applyRecordingLevel(left, right);
		this.notes.mixInto(left, right, from, stretcher.time);
		this.fade(left, right);
		if (this.playing) this.clicks.mixInto(left, right, from, stretcher.time);
		if (this.playing && this.loop && stretcher.time >= this.loop.to) {
			stretcher.seek(this.loop.from);
			this.report();
		}

		if (this.playing && stretcher.time >= stretcher.duration) {
			this.playing = false;
			this.port.postMessage({ type: 'ended' });
		}
		if (++this.quantaSinceReport >= QUANTA_PER_REPORT) this.report();
		return true;
	}

	/**
	 * The recording at its level (0 when muted), ramped so a change never clicks.
	 * @param {Float32Array} left
	 * @param {Float32Array} right
	 */
	applyRecordingLevel(left, right) {
		const target = this.recordingLevel;
		if (this.heardRecordingLevel === 1 && target === 1) return;
		for (let i = 0; i < left.length; i++) {
			const gap = target - this.heardRecordingLevel;
			this.heardRecordingLevel += Math.max(-this.fadeStep, Math.min(this.fadeStep, gap));
			left[i] *= this.heardRecordingLevel;
			right[i] *= this.heardRecordingLevel;
		}
	}

	/**
	 * Ramp towards full level while playing and to silence when paused.
	 * @param {Float32Array} left
	 * @param {Float32Array} right
	 */
	fade(left, right) {
		const target = this.playing ? 1 : 0;
		if (this.level === target) return;
		for (let i = 0; i < left.length; i++) {
			this.level =
				target > this.level
					? Math.min(target, this.level + this.fadeStep)
					: Math.max(target, this.level - this.fadeStep);
			left[i] *= this.level;
			right[i] *= this.level;
		}
	}

	/**
	 * A fresh stretcher on the song with the current frame size, from `seconds`.
	 * @param {number} seconds
	 */
	startStretcher(seconds) {
		if (!this.song) return;
		this.stretcher = withPitchShift(
			createStretcher({ ...this.song, sampleRate, frameSize: this.frameSize })
		);
		this.stretcher.setCents(this.cents);
		this.stretcher.seek(seconds);
	}

	report() {
		this.quantaSinceReport = 0;
		if (this.stretcher) this.port.postMessage({ type: 'time', seconds: this.stretcher.time });
	}
}

registerProcessor('stretch-player', StretchPlayerProcessor);
