import { useReducer } from 'react'
import { DEMO_PERSONA } from '../lib/persona'
import { getDemoScenario, simForScenario, personaOverridesForScenario } from '../lib/demoScenario'
import { getDemoSession } from '../lib/demoSession'

import ScreenBasicInfo       from './screens/ScreenBasicInfo'
import ScreenAnalyzing       from './screens/ScreenAnalyzing'
import ScreenPlanSelect      from './screens/ScreenPlanSelect'
import ScreenIdentityChallenge from './screens/ScreenIdentityChallenge'
import ScreenAddressMismatch   from './screens/ScreenAddressMismatch'
import ScreenDebtConsolidation from './screens/ScreenDebtConsolidation'
import ScreenMoreInfo        from './screens/ScreenMoreInfo'
import ScreenLinkIncome      from './screens/ScreenLinkIncome'
import ScreenVerifyIdentity  from './screens/ScreenVerifyIdentity'
import ScreenAppraisalWait   from './screens/ScreenAppraisalWait'
import ScreenOpsReviewWait   from './screens/ScreenOpsReviewWait'
import ScreenFinalOffer      from './screens/ScreenFinalOffer'
import ScreenDeclined        from './screens/ScreenDeclined'
import ScreenDocsPreparing   from './screens/ScreenDocsPreparing'
import ScreenReadyToSchedule from './screens/ScreenReadyToSchedule'
import ScreenNotaryScheduled from './screens/ScreenNotaryScheduled'
import ScreenSigningInProgress from './screens/ScreenSigningInProgress'
import ScreenLoanClosed      from './screens/ScreenLoanClosed'
import ScreenFunded          from './screens/ScreenFunded'

/* ── State machine ─────────────────────────────────────────────────────── */
export const S = {
  BASIC_INFO:            'basic_info',
  OFFER_LOADING:         'offer_loading',
  OFFER_REANALYZING:     'offer_reanalyzing',
  OUTCOME_PICKER:        'outcome_picker',
  OFFER_SELECT:          'offer_select',
  IDENTITY_CHALLENGE:    'identity_challenge',
  ADDRESS_MISMATCH:      'address_mismatch',
  DEBT_CONSOLIDATION:    'debt_consolidation',
  MORE_INFO:             'more_info',
  LINK_INCOME:           'link_income',
  VERIFY_IDENTITY:       'verify_identity',
  PROPERTY_VERIFY_WAIT:  'property_verify_wait',
  APPRAISAL_WAIT:        'appraisal_wait',
  OPS_REVIEW_WAIT:       'ops_review_wait',
  FINAL_OFFER:           'final_offer',
  DECLINED:              'declined',
  DOCS_PREPARING:        'docs_preparing',
  READY_TO_SCHEDULE:     'ready_to_schedule',
  NOTARY_SCHEDULED:      'notary_scheduled',
  SIGNING_IN_PROGRESS:   'signing_in_progress',
  LOAN_CLOSED:           'loan_closed',
  FUNDED:                'funded',
}

// Map state → progress-rail step (1..7) and meaningful labels.
export const STATE_TO_STEP = {
  [S.BASIC_INFO]:           1,
  [S.OFFER_LOADING]:        2,
  [S.OFFER_REANALYZING]:    2,
  [S.OUTCOME_PICKER]:       2,
  [S.OFFER_SELECT]:         2,
  [S.IDENTITY_CHALLENGE]:   2,
  [S.ADDRESS_MISMATCH]:     2,
  [S.DEBT_CONSOLIDATION]:   2,
  [S.MORE_INFO]:            3,
  [S.LINK_INCOME]:          3,
  [S.VERIFY_IDENTITY]:      3,
  [S.PROPERTY_VERIFY_WAIT]: 3,
  [S.APPRAISAL_WAIT]:       4,
  [S.OPS_REVIEW_WAIT]:      4,
  [S.FINAL_OFFER]:          4,
  [S.DECLINED]:             4,
  [S.DOCS_PREPARING]:       5,
  [S.READY_TO_SCHEDULE]:    5,
  [S.NOTARY_SCHEDULED]:     6,
  [S.SIGNING_IN_PROGRESS]:  6,
  [S.LOAN_CLOSED]:          7,
  [S.FUNDED]:               7,
}

const ACTIVE_SCENARIO = getDemoScenario()
const SESSION = getDemoSession()
const PERSONA = { ...DEMO_PERSONA, ...personaOverridesForScenario(ACTIVE_SCENARIO), ...SESSION }

const SEED_STEP1 = {
  firstName: PERSONA.firstName, middleInitial: PERSONA.middleInitial, lastName: PERSONA.lastName,
  dob: PERSONA.dob, phone: PERSONA.phone, email: PERSONA.email,
  marital: PERSONA.marital, purpose: PERSONA.purpose,
  address: PERSONA.address, unit: '', city: PERSONA.city, state: PERSONA.state, zip: PERSONA.zip,
  propType: PERSONA.propType, ownership: PERSONA.ownership,
  propValue: PERSONA.propValue, mortgageBalance: PERSONA.mortgageBalance,
  forSale: false,
  annualIncome: '', otherIncome: '', incomeSource: PERSONA.incomeSource,
  loanAmount: PERSONA.requestedLoanAmount, projectCost: PERSONA.projectCost,
}

const initialState = {
  app: S.BASIC_INFO,
  step1Screen: 0,
  step1: { ...SEED_STEP1 },
  step3: { ssn: '', employer: PERSONA.employer, yearsEmployed: PERSONA.yearsEmployed, monthlyExpenses: PERSONA.monthlyExpenses },
  step4: { bankLinked: false, idVerified: false },
  loan: null,
  sim: simForScenario(ACTIVE_SCENARIO),
  scenario: ACTIVE_SCENARIO,
  step2Config: null,
}

function appReducer(state, action) {
  switch (action.type) {
    case 'NEXT': {
      if (state.app === S.VERIFY_IDENTITY) {
        const { propertyCheck, opsReview, appraisalRequired } = state.sim
        if (propertyCheck === 'decline') return { ...state, app: S.DECLINED }
        if (propertyCheck === 'bpo' && appraisalRequired) return { ...state, app: S.APPRAISAL_WAIT }
        return { ...state, app: opsReview ? S.OPS_REVIEW_WAIT : S.FINAL_OFFER }
      }
      const nextMap = {
        [S.BASIC_INFO]:        S.OFFER_LOADING,
        [S.OFFER_SELECT]:      S.MORE_INFO,
        [S.MORE_INFO]:         S.LINK_INCOME,
        [S.LINK_INCOME]:       S.VERIFY_IDENTITY,
        [S.DOCS_PREPARING]:    S.READY_TO_SCHEDULE,
        [S.READY_TO_SCHEDULE]: S.NOTARY_SCHEDULED,
        [S.NOTARY_SCHEDULED]:  S.SIGNING_IN_PROGRESS,
        [S.SIGNING_IN_PROGRESS]: S.LOAN_CLOSED,
      }
      const next = nextMap[state.app]
      if (!next) return state
      const updates = {}
      if (action.loan)  updates.loan = action.loan
      if (action.step2) updates.step2 = action.step2
      if (state.app === S.BASIC_INFO) updates.step1Screen = 0
      return { ...state, app: next, ...updates }
    }
    case 'BACK': {
      const backMap = {
        [S.OFFER_SELECT]:        S.BASIC_INFO,
        [S.IDENTITY_CHALLENGE]:  S.BASIC_INFO,
        [S.ADDRESS_MISMATCH]:    S.BASIC_INFO,
        [S.DEBT_CONSOLIDATION]:  S.OUTCOME_PICKER,
        [S.MORE_INFO]:           S.OFFER_SELECT,
        [S.LINK_INCOME]:         S.MORE_INFO,
        [S.VERIFY_IDENTITY]:     S.LINK_INCOME,
        [S.DOCS_PREPARING]:      S.FINAL_OFFER,
      }
      const prev = backMap[state.app]
      if (!prev) return state
      const step1Screen = state.app === S.OFFER_SELECT ? 5 : 0
      return { ...state, app: prev, step1Screen }
    }
    case 'JUMP_TO':
      return { ...state, app: action.state }
    case 'AUTO_ADVANCE':
      if (state.app === S.OFFER_LOADING) return { ...state, app: S.OUTCOME_PICKER }
      return state
    case 'PICK_OUTCOME': {
      const map = {
        success: S.OFFER_SELECT, identity: S.IDENTITY_CHALLENGE, address: S.ADDRESS_MISMATCH,
        property: S.DECLINED, decline: S.DECLINED, debt_consolidation: S.DEBT_CONSOLIDATION,
      }
      return { ...state, app: map[action.outcome] || state.app }
    }
    case 'IDENTITY_CONFIRMED': {
      const [first, ...rest] = String(action.fullName).split(' ')
      return {
        ...state, app: S.OFFER_REANALYZING,
        step1: { ...state.step1, firstName: first || state.step1.firstName, lastName: rest.join(' ') || state.step1.lastName },
      }
    }
    case 'ADDRESS_CONFIRMED':  return { ...state, app: S.OFFER_REANALYZING }
    case 'ACCEPT':             return { ...state, app: S.DOCS_PREPARING }
    case 'DECLINE_OFFER':      return { ...state, app: S.DECLINED }
    case 'ADVANCE_NOTARY':     return { ...state, app: S.NOTARY_SCHEDULED }
    case 'NOTARY_ARRIVED':     return { ...state, app: S.SIGNING_IN_PROGRESS }
    case 'SIGN':               return { ...state, app: S.LOAN_CLOSED }
    case 'CLOSE_LOAN':         return { ...state, app: S.FUNDED }
    case 'SET_STEP1':          return { ...state, step1: { ...state.step1, [action.field]: action.value } }
    case 'SET_STEP3':          return { ...state, step3: { ...state.step3, [action.field]: action.value } }
    case 'SET_STEP1_SCREEN':   return { ...state, step1Screen: action.value }
    case 'SAVE_STEP2_CONFIG':  return { ...state, step2Config: action.config }
    case 'RESTART':            return { ...initialState }
    default: return state
  }
}

export default function POSDemoV2() {
  const [state, dispatch] = useReducer(appReducer, undefined, () => {
    const session = getDemoSession()
    return { ...initialState, step1: { ...initialState.step1, ...session } }
  })

  const props = { state, dispatch }
  const step  = STATE_TO_STEP[state.app] || 1

  switch (state.app) {
    case S.BASIC_INFO:           return <ScreenBasicInfo {...props} step={step} />
    case S.OFFER_LOADING:        return <ScreenAnalyzing {...props} step={step} mode="initial" />
    case S.OFFER_REANALYZING:    return <ScreenAnalyzing {...props} step={step} mode="reanalyze" />
    case S.OUTCOME_PICKER:       return <ScreenAnalyzing {...props} step={step} mode="picker" />
    case S.OFFER_SELECT:         return <ScreenPlanSelect {...props} step={step} />
    case S.IDENTITY_CHALLENGE:   return <ScreenIdentityChallenge {...props} step={step} />
    case S.ADDRESS_MISMATCH:     return <ScreenAddressMismatch {...props} step={step} />
    case S.DEBT_CONSOLIDATION:   return <ScreenDebtConsolidation {...props} step={step} />
    case S.MORE_INFO:            return <ScreenMoreInfo {...props} step={step} />
    case S.LINK_INCOME:          return <ScreenLinkIncome {...props} step={step} />
    case S.VERIFY_IDENTITY:      return <ScreenVerifyIdentity {...props} step={step} />
    case S.APPRAISAL_WAIT:       return <ScreenAppraisalWait {...props} step={step} />
    case S.OPS_REVIEW_WAIT:      return <ScreenOpsReviewWait {...props} step={step} />
    case S.FINAL_OFFER:          return <ScreenFinalOffer {...props} step={step} />
    case S.DECLINED:             return <ScreenDeclined {...props} step={step} />
    case S.DOCS_PREPARING:       return <ScreenDocsPreparing {...props} step={step} />
    case S.READY_TO_SCHEDULE:    return <ScreenReadyToSchedule {...props} step={step} />
    case S.NOTARY_SCHEDULED:     return <ScreenNotaryScheduled {...props} step={step} />
    case S.SIGNING_IN_PROGRESS:  return <ScreenSigningInProgress {...props} step={step} />
    case S.LOAN_CLOSED:          return <ScreenLoanClosed {...props} step={step} />
    case S.FUNDED:               return <ScreenFunded {...props} step={step} />
    default: return <ScreenBasicInfo {...props} step={step} />
  }
}
