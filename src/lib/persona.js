/**
 * GreenLyne demo persona — single source of truth for the borrower used across
 * SmartPOS (POSDemo), PMPro (Pipeline.jsx), email preview, and the prescreen modal.
 *
 * Every screen should read these values via DEMO_PERSONA so values stay
 * consistent end-to-end. Where the user can edit a value, the form state
 * (step1, step3) takes over from this seed but defaults remain pre-filled.
 */

export const DEMO_PERSONA = {
  // ── Identity ────────────────────────────────────────────────────────────────
  firstName:     'Alex',
  middleInitial: '',
  lastName:      'Rivera',
  dob:           '07/15/1985',
  phone:         '(415) 555-0142',
  email:         'alex.rivera@gmail.com',

  // ── Property ────────────────────────────────────────────────────────────────
  address:        '1482 Sunridge Drive',
  city:           'Sacramento',
  state:          'CA',
  zip:            '95826',
  propValue:      '485000',
  mortgageBalance:'190000',

  // ── Loan request ────────────────────────────────────────────────────────────
  // The requested amount drives the offer/draw target. The approved cap is the
  // maximum we'd ever offer this borrower. Demo math compares the two.
  requestedLoanAmount: '45000',
  projectCost:         '45000',
  approvedLoanLimit:   '150000',

  // ── Income / employment ─────────────────────────────────────────────────────
  annualIncome:    '124000',
  employer:        'Horizon Tech Solutions',
  yearsEmployed:   '6',
  monthlyExpenses: '3200',
  incomeSource:    'W-2',

  // ── Property descriptors (used in Step 1 tile pickers) ──────────────────────
  propType:   'Primary property',
  ownership:  'Sole owner',
  marital:    'Married',
  purpose:    'Home improvement',

  // ── Sensitive values left blank intentionally ──────────────────────────────
  ssn: '',
}

// Derived constants downstream tooling can read directly without parseInt'ing
DEMO_PERSONA.propValueN          = Number(DEMO_PERSONA.propValue)
DEMO_PERSONA.mortgageBalanceN    = Number(DEMO_PERSONA.mortgageBalance)
DEMO_PERSONA.requestedLoanAmountN= Number(DEMO_PERSONA.requestedLoanAmount)
DEMO_PERSONA.approvedLoanLimitN  = Number(DEMO_PERSONA.approvedLoanLimit)
DEMO_PERSONA.annualIncomeN       = Number(DEMO_PERSONA.annualIncome)
