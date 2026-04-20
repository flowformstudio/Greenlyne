/**
 * Greenlyne / Grand Bank — Merchant Escrow Powered HELOC Loan Calculations
 *
 * Implements the closed-form loan-sizing equation from Appendix A of:
 * "Merchant Escrow Powered Lower Payment HELOC Solution" (ver 0.9)
 *
 * Verified against: structured_payment_HELOC_simulator_GrandBank_04_19_2026_ver_0.7.xlsx
 *
 * Key formula:
 *   L = (C − n2_IO·Red_IO − n2_PI·Red_PI) / (1 − r·(n1+n2_IO) − pf·n2_PI − f)
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export const WSJ_PRIME        = 0.0675   // 6.75% — update as rate changes
export const ORIGINATION_FEE  = 0.0199   // 1.99%
export const IO_TERM_MO       = 60        // 5-year draw period (fixed)
export const AMORT_TERM_MO    = 300       // 25-year amortization after draw
export const RATE_FLOOR       = 0.060    // 6.00%
export const RATE_CAP         = 0.180    // 18.00%

// ─── FICO × LTV margin table ──────────────────────────────────────────────────
// Columns: [≤65%, 65.01-70%, 70.01-75%, 75.01-80%, 80.01-85%]
// null = ineligible combination
export const MARGIN_TABLE = {
  740: [0.0100, 0.0125, 0.0150, 0.0175, 0.0225],
  700: [0.0150, 0.0175, 0.0200, 0.0225, 0.0275],
  680: [0.0200, 0.0225, 0.0250, 0.0275, 0.0325],
  660: [0.0250, 0.0275, 0.0300, 0.0325, 0.0375],
  640: [0.0350, 0.0375, 0.0400, 0.0425, 0.0475],
  620: [0.0450, 0.0475, 0.0500, 0.0550, null  ],
  600: [0.0550, 0.0575, 0.0600, 0.0650, null  ],
}

// ─── Rate helpers ─────────────────────────────────────────────────────────────

/** Get LTV bucket index (0-4) from CLTV decimal, or -1 if out of range */
export function getLtvBucket(cltv) {
  const pct = cltv * 100
  if (pct <= 65)    return 0
  if (pct <= 70)    return 1
  if (pct <= 75)    return 2
  if (pct <= 80)    return 3
  if (pct <= 85)    return 4
  return -1
}

/** Get closest FICO row key from the margin table */
export function getFicoKey(fico) {
  const keys = [740, 700, 680, 660, 640, 620, 600]
  for (const k of keys) { if (fico >= k) return k }
  return null
}

/**
 * Calculate the fixed interest rate for a borrower.
 * @param {number} fico   - credit score (e.g. 740)
 * @param {number} cltv   - combined LTV as decimal (e.g. 0.75 = 75%)
 * @returns {number|null} - annual rate as decimal, or null if ineligible
 */
export function calcRate(fico, cltv) {
  const ficoKey = getFicoKey(fico)
  const ltvCol  = getLtvBucket(cltv)
  if (!ficoKey || ltvCol < 0) return null
  const margin = MARGIN_TABLE[ficoKey]?.[ltvCol]
  if (margin === null || margin === undefined) return null
  const raw = WSJ_PRIME + margin
  return Math.max(RATE_FLOOR, Math.min(RATE_CAP, raw))
}

// ─── Eligibility ──────────────────────────────────────────────────────────────

/**
 * Check whether a borrower qualifies for the program and which options they can access.
 * @param {number} fico   - credit score
 * @param {number} cltv   - CLTV as decimal
 * @param {number} dti    - debt-to-income ratio as decimal
 */
export function checkEligibility(fico, cltv, dti) {
  const ltvPct = cltv * 100
  const dtiPct = dti  * 100

  const minFico = ltvPct > 80 ? 640 : 600
  const maxDti  = ltvPct > 75 ? 45  : 50

  const ficoOk = fico >= minFico
  const dtiOk  = dtiPct <= maxDti

  // Reduction tier gating (conservative thresholds for demo)
  const maxReductionPct =
    !ficoOk || !dtiOk ? 0
    : dtiPct <= 36    ? 30  // MaxEase available
    : dtiPct <= 43    ? 20  // Ease available
    : dtiPct <= maxDti ? 10  // Comfort only
    : 0

  return { ficoOk, dtiOk, eligible: ficoOk && dtiOk, maxDti, minFico, maxReductionPct }
}

// ─── Core payment-factor helper ───────────────────────────────────────────────
/** Monthly payment factor: pf = r / (1 − (1+r)^−N) */
function pf(r, N) {
  if (r === 0) return 1 / N
  return r / (1 - Math.pow(1 + r, -N))
}

// ─── Main closed-form loan calculator ─────────────────────────────────────────
/**
 * Calculate the full loan structure using the escrow closed-form formula.
 *
 * @param {object} p
 * @param {number}  p.C          - base system / project cost (merchant receives this)
 * @param {number}  p.rate       - annual interest rate as decimal (from calcRate)
 * @param {number} [p.f]         - origination fee percentage (default ORIGINATION_FEE)
 * @param {number} [p.n1]        - fully-subsidised months ($0 period; sits inside IO window)
 * @param {number} [p.n2_IO]     - partially-subsidised months within the IO window
 * @param {number} [p.n2_PI]     - partially-subsidised months in the P&I phase (reduction outlasts IO)
 * @param {number} [p.s]         - subsidy fraction (e.g. 0.30 for 30% reduction)
 * @param {number} [p.amortMo]   - amortization months after IO period (default 300)
 * @returns {object|null}         - null when configuration is infeasible
 */
export function calcEscrowLoan({
  C,
  rate,
  f        = ORIGINATION_FEE,
  n1       = 0,
  n2_IO    = 0,
  n2_PI    = 0,
  s        = 0,
  amortMo  = AMORT_TERM_MO,
}) {
  const r           = rate / 12
  const pf_baseline = pf(r, amortMo)         // payment factor on 300-month amortization

  // ── Baseline (no escrow) ──
  const L_baseline  = C / (1 - f)
  const B           = L_baseline * pf_baseline  // baseline monthly P&I

  // ── Fixed reduced-payment amounts (anchored to B, independent of L) ──
  const Red_PI      = B * (1 - s)               // reduced P&I borrower pays during overlap
  const Red_IO      = Red_PI * (r / pf_baseline) // interest-only slice of Red_PI

  // ── Closed-form loan size ──
  const numerator   = C - n2_IO * Red_IO - n2_PI * Red_PI
  const denominator = 1 - r * (n1 + n2_IO) - pf_baseline * n2_PI - f

  if (denominator <= 0 || numerator <= 0) return null

  const L           = numerator / denominator

  // ── Payments on the custom loan ──
  const IO_custom   = L * r              // full IO payment (escrow + borrower together)
  const PI_custom   = L * pf_baseline   // full P&I payment after IO ends

  // ── Escrow breakdown ──
  const initialEscrow  = n1  * IO_custom                          // fully-funded $0 months
  const ongoingEscrow  = n2_IO * (IO_custom - Red_IO)            // gap during IO overlap
                       + n2_PI * (PI_custom - Red_PI)            // gap during P&I overlap
  const totalEscrow    = initialEscrow + ongoingEscrow
  const origFee        = f * L

  return {
    L,               // total loan amount borrower signs for
    L_baseline,      // equivalent loan with no escrow features
    B,               // baseline monthly P&I (reference payment)
    Red_IO,          // what borrower pays during IO overlap phase
    Red_PI,          // what borrower pays during P&I overlap phase
    IO_custom,       // unsubsidised contractual IO payment
    PI_custom,       // full P&I payment (from month max(IO,red)+1 to 360)
    initialEscrow,
    ongoingEscrow,
    totalEscrow,
    origFee,
    // convenience
    r,
    pf_baseline,
  }
}

// ─── Legacy compatibility stubs (used by LoanConfigurator / Pipeline) ────────
export const FEE_TIERS = [
  { label: 'Standard', fee: 2.5, rate: 7.75, rateLabel: '7.75%', feeLabel: '2.5%' },
  { label: 'Lower',    fee: 3.5, rate: 7.35, rateLabel: '7.35%', feeLabel: '3.5%' },
  { label: 'Lowest',   fee: 4.5, rate: 6.95, rateLabel: '6.95%', feeLabel: '4.5%' },
]
export const DEFERRED_OPTIONS = [
  { months: 0,  label: 'None',      multiplier: 1.000 },
  { months: 3,  label: '3 Months',  multiplier: 1.075 },
  { months: 6,  label: '6 Months',  multiplier: 1.135 },
  { months: 12, label: '12 Months', multiplier: 1.225 },
]
export function calcLoan({ creditLimit, withdrawNow, tier = 0, deferredMonths = 0 }) {
  const { rate, fee } = FEE_TIERS[tier]
  const deferred = DEFERRED_OPTIONS.find(d => d.months === deferredMonths) || DEFERRED_OPTIONS[0]
  const r = rate / 100 / 12
  const originationFee = Math.round(creditLimit * (fee / 100))
  const drawPayment = Math.round(withdrawNow * r * deferred.multiplier)
  const N = 240
  const repayPayment = Math.round(withdrawNow * r / (1 - Math.pow(1+r, -N)))
  return { creditLimit, withdrawNow, availableAfter: creditLimit - withdrawNow, rate, fee, originationFee, drawPayment, repayPayment, deferredMonths, apr: (rate + fee * 0.08).toFixed(2) }
}

// ─── Formatting ───────────────────────────────────────────────────────────────
export function formatCurrency(n) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'k'
  return '$' + Math.round(n).toLocaleString()
}

export function formatCurrencyFull(n) {
  return '$' + Math.round(n).toLocaleString()
}
