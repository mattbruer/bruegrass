/**
 * The time signatures a transcription can be in. Beats are always the
 * strums the beat finder hears (quarter notes), so a bar of 2/2 is the
 * same four strums as 4/4, counted and written in two (cut time). An odd
 * bar is written in quarters whatever the song's time (`[5/4]`, `[3/4]`).
 * A new one is one entry (the chart takes x/4 and x/2).
 */
export const TIME_SIGNATURES = Object.freeze([
	{ id: '2/4', beatsPerBar: 2, count: 'ONE two', about: 'a fast two-step' },
	{ id: '3/4', beatsPerBar: 3, count: 'ONE two three', about: 'a waltz' },
	{ id: '4/4', beatsPerBar: 4, count: 'ONE two three four', about: 'most songs' },
	{
		id: '2/2',
		beatsPerBar: 4,
		count: 'ONE and TWO and',
		about: 'cut time, as much bluegrass is written'
	}
]);

export const DEFAULT_TIME = '4/4';

/** @param {string} id */
export function timeSignature(id) {
	return TIME_SIGNATURES.find((time) => time.id === id) ?? TIME_SIGNATURES[2];
}
