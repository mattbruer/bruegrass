/**
 * Measures how far each guitar sample is out of tune, with the app's own
 * tuner engine, and writes the fixes to
 * src/lib/arranger/instruments/guitarSampleFixes.js.
 *
 *   node scripts/measureSampleTuning.js
 *
 * Run it again whenever the samples change. Needs ffmpeg (to decode the MP3s).
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createTunerEngine } from '../src/lib/audio/tuner/tunerEngine.js';

const SAMPLE_RATE = 48000;
const STRINGS = ['E', 'A', 'D', 'G', 'B', 'ee'];
const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
const FRETS = 13;
/**
 * Only the first part of each note counts: that's what's heard (the next
 * strum cuts it off), and a quiet ringing tail drifts flat or sharp.
 */
const HEARD_SECONDS = 1.2;
const OUTPUT = 'src/lib/arranger/instruments/guitarSampleFixes.js';

/** @param {string} file */
function decode(file) {
	const raw = execFileSync('ffmpeg', [
		'-v',
		'quiet',
		'-i',
		file,
		'-ac',
		'1',
		'-ar',
		String(SAMPLE_RATE),
		'-f',
		'f32le',
		'-'
	]);
	return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

/**
 * The note's cents off, the median of the tuner's steady readings.
 * @param {Float32Array} audio
 * @param {number} midi the note the sample should be
 */
function centsOff(audio, midi) {
	const tuner = createTunerEngine(SAMPLE_RATE);
	const heard = [];
	for (let at = 0; at + 128 <= audio.length && at < HEARD_SECONDS * SAMPLE_RATE; at += 128) {
		const reading = tuner.push(audio.subarray(at, at + 128));
		if (reading?.steady && reading.sounding && reading.note === midi) heard.push(reading.cents);
	}
	if (heard.length === 0) throw new Error(`No steady reading for MIDI ${midi}`);
	heard.sort((a, b) => a - b);
	return heard[heard.length >> 1];
}

const fixes = STRINGS.flatMap((string, index) =>
	Array.from({ length: FRETS }, (_, fret) => {
		const sample = `${string}${fret}`;
		const off = centsOff(decode(`static/samples/guitar/${sample}.mp3`), OPEN_MIDI[index] + fret);
		return { sample, cents: Math.round(-off * 10) / 10 || 0 };
	})
).sort((a, b) => Math.abs(a.cents) - Math.abs(b.cents));

const rows = fixes.map(({ sample, cents }) => `\t${sample}: ${cents}`).join(',\n');
writeFileSync(
	OUTPUT,
	`/**
 * What each guitar sample needs to be in tune: cents to move it (−8.3 =
 * lower it 8.3 cents), most in tune first. Named like the files in
 * static/samples/guitar/ (string, then fret). Measured with the tuner by
 * scripts/measureSampleTuning.js over each note's first ${HEARD_SECONDS} s; run it
 * again when the samples change.
 */
export const GUITAR_SAMPLE_FIXES = {
${rows}
};
`
);
console.log(`Wrote ${OUTPUT}`);
