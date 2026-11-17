/**
 * Setting up a transcription, as a wizard: one step at a time, in this
 * order, then the workspace. Every part of the song gets a name, start to
 * end (the user's call, while trying it out: easy to loosen later). A new step is one entry here, one in
 * TranscriptionState.setupStep, and its screen in TranscribeWizard.svelte.
 */

/** @typedef {'recording' | 'downbeat' | 'parts'} SetupStep */

export const SETUP_STEPS = /** @type {const} */ ([
	{ id: 'recording', name: 'Choose a recording' },
	{ id: 'downbeat', name: 'Beat 1 and time' },
	{ id: 'parts', name: 'Name the parts' }
]);
