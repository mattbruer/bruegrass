/**
 * Setting up a transcription, as a wizard: one step at a time, in this
 * order, then the workspace. A new step is one entry here, one in
 * TranscriptionState.setupStep, and its screen in TranscribeWizard.svelte.
 */

/** @typedef {'recording' | 'downbeat' | 'parts'} SetupStep */

export const SETUP_STEPS = /** @type {const} */ ([
	{ id: 'recording', name: 'Choose a recording' },
	{ id: 'downbeat', name: 'Find beat 1' },
	{ id: 'parts', name: 'Mark the parts' }
]);

/** The names offered for a part, biggest first; anything else can be typed. */
export const PART_NAMES = Object.freeze(['Intro', 'Verse', 'Chorus', 'Break', 'Ending']);
