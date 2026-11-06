/**
 * The output stage's tuning: how loud the arranger plays, and the safety
 * margin at the top. Change them here.
 *
 * Why there's an output stage at all: the mix inside the mixer keeps
 * plenty of headroom (peaks around -8 dBFS with every fader at unity),
 * which is right for mixing. But nothing masters it afterwards, so on its
 * own it plays several dB quieter than the mastered music in every other
 * app. The output stage adds that loudness back at the very end, measured
 * the way streaming services measure it, and a true-peak limiter makes sure
 * the extra level can never clip.
 */

/**
 * The loudness "Match" aims for, in LUFS: the level Spotify, YouTube and
 * Tidal normalise music to. Loud enough to sit with other music, without
 * squashing the dynamics that make acoustic music breathe.
 */
export const TARGET_LUFS = -14;

/**
 * The highest the waveform may reach, in dBTP (true peak: including the
 * peaks a converter rebuilds between samples). -1 leaves room for those and
 * for lossy encoders, as streaming services ask.
 */
export const CEILING_DBTP = -1;

/** How far ahead the limiter looks, so it can ease into a peak instead of grabbing it. */
export const LIMITER_LOOKAHEAD_SECONDS = 0.005;
/** How gently the limiter lets go after a peak (longer = smoother, shorter = louder). */
export const LIMITER_RELEASE_SECONDS = 0.15;

/**
 * The output gain a new song starts with, in dB: what brings the starter
 * song's default mix to TARGET_LUFS. Measured in the browser: with no gain
 * it plays at about -21.7 LUFS, and at +7.7 dB the limiter only touches the
 * loudest notes (0.6 dB at most). "Match" fine-tunes it for each song.
 */
export const DEFAULT_OUTPUT_GAIN_DB = 7.7;

/** The output gain's range, in dB. */
export const OUTPUT_GAIN_RANGE = Object.freeze({ min: -12, max: 18 });

/** Match needs at least this much playing to measure (the integrated reading settles). */
export const MATCH_MIN_SECONDS = 3;
