/**
 * Setting up a transcription, as a wizard: one step at a time, in this
 * order, then the workspace. A new step is one entry here, one in
 * TranscriptionState.setupStep, and its screen in TranscribeWizard.svelte.
 */

/** @typedef {'recording' | 'downbeat' | 'listen'} SetupStep */

export const SETUP_STEPS = /** @type {const} */ ([
	{ id: 'recording', name: 'Choose a recording' },
	{ id: 'downbeat', name: 'Beat 1 and time' },
	{ id: 'listen', name: 'Listen through' }
]);
