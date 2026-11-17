/**
 * Setting up a transcription, as a wizard: one step at a time, in this
 * order, then the workspace. Most people want one part (a mandolin solo):
 * then only that part is set up. The whole song also has every part named. A new step is one entry here, one in
 * TranscriptionState.setupStep, and its screen in TranscribeWizard.svelte.
 */

/** @typedef {'recording' | 'focus' | 'downbeat' | 'listen'} SetupStep */

export const SETUP_STEPS = /** @type {const} */ ([
	{ id: 'recording', name: 'Choose a recording' },
	{ id: 'focus', name: 'Whole song or one part' },
	{ id: 'downbeat', name: 'Beat 1 and time' },
	{ id: 'listen', name: 'Listen through' }
]);
