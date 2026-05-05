/**
 * Demo-scenario controller.
 *
 * Switch demo paths by appending `?scenario=<name>` to the URL.
 *   /pos-demo?scenario=identityChallenge
 *   /pos-demo?scenario=addressChallenge
 *   /pos-demo?scenario=dtiChallenge
 *   /pos-demo?scenario=adjustedLoanAmount
 *   /pos-demo?scenario=decline
 *   (default = cleanApproval)
 *
 * The current SmartPOS state machine already branches on a `sim` object
 * (offerCheck / propertyCheck / appraisalRequired / opsReview). This module
 * maps a scenario name to the right `sim` flags so the rest of the app
 * doesn't need to know about scenarios at all — they just read `state.sim`.
 */

export const SCENARIOS = [
  'cleanApproval',
  'identityChallenge',
  'addressChallenge',
  'dtiChallenge',
  'adjustedLoanAmount',
  'decline',
]

const DEFAULT_SCENARIO = 'cleanApproval'

/** Read `?scenario=` off the URL. Falls back to cleanApproval if missing/invalid. */
export function getDemoScenario() {
  if (typeof window === 'undefined') return DEFAULT_SCENARIO
  try {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('scenario')
    return SCENARIOS.includes(s) ? s : DEFAULT_SCENARIO
  } catch {
    return DEFAULT_SCENARIO
  }
}

/** Map a scenario name to the SmartPOS `sim` flags. */
export function simForScenario(scenario = DEFAULT_SCENARIO) {
  // Base — clean approval, no challenges
  const base = {
    offerCheck:        'ok',
    propertyCheck:     'ok',
    appraisalRequired: false,
    opsReview:         false,
    notaryMethod:      'enotary',
  }
  switch (scenario) {
    case 'identityChallenge':
      return { ...base, offerCheck: 'identity_challenge' }
    case 'addressChallenge':
      return { ...base, offerCheck: 'address_mismatch' }
    case 'dtiChallenge':
      // DTI is computed from form values; offer flow shows DTI gate when calc trips.
      // Marker sim flag so screens that want to force the gate can read it.
      return { ...base, offerCheck: 'dti_gate' }
    case 'decline':
      return { ...base, propertyCheck: 'decline' }
    case 'adjustedLoanAmount':
      // No sim change — handled in offer-amount logic by reading the persona's
      // requestedLoanAmount and capping it to approvedLoanLimit.
      return base
    case 'cleanApproval':
    default:
      return base
  }
}

/**
 * Persona overrides that scenarios apply on top of DEMO_PERSONA.
 * - identityChallenge  → name flip ("Alex Johnson") so SSN match logic trips
 * - addressChallenge   → mailing address differs from filed property address
 * - adjustedLoanAmount → request more than the approved cap so the cap kicks in
 */
export function personaOverridesForScenario(scenario = DEFAULT_SCENARIO) {
  switch (scenario) {
    case 'identityChallenge':
      return { firstName: 'Alex', lastName: 'Johnson' }
    case 'addressChallenge':
      // Borrower-entered address differs from property-of-record
      return { address: '742 Evergreen Terrace', city: 'Sacramento', state: 'CA', zip: '95823' }
    case 'adjustedLoanAmount':
      // Request more than the approved cap on purpose; offer flow caps it
      return { requestedLoanAmount: '200000' }
    case 'dtiChallenge':
      // High monthly expenses + lower income to push DTI over threshold
      return { monthlyExpenses: '5800', annualIncome: '74000' }
    default:
      return {}
  }
}
