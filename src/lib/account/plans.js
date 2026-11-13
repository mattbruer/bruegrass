/**
 * What each plan includes: the one place that decides what's behind the
 * paywall. Code asks planAllows('someFeature') and never checks a plan's
 * name, so moving a feature between plans is a one-line change here.
 *
 * There are no accounts yet, so everyone is on the free plan. When accounts
 * come, currentPlan() returns the signed-in person's plan (sent by the
 * server with the page) and nothing else changes. Anything the server does
 * for a paid plan must be checked on the server too, from this same list.
 */

/** @typedef {'free' | 'paid'} PlanId */

/** @type {Record<PlanId, { name: string, features: string[] }>} */
export const PLANS = {
	free: { name: 'Free', features: [] },
	paid: { name: 'Paid', features: ['losslessSharing'] }
};

/** @returns {PlanId} */
export function currentPlan() {
	return 'free';
}

/**
 * @param {string} feature e.g. 'losslessSharing': takes sent at full quality (WAV)
 */
export function planAllows(feature) {
	return PLANS[currentPlan()].features.includes(feature);
}
