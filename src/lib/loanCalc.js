/**
 * Greenlyne HELOC Loan Calculation Helpers
 */

export const FEE_TIERS = [
  { label: 'Standard',  fee: 2.5, rate: 7.75, rateLabel: '7.75%', feeLabel: '2.5%' },
  { label: 'Lower',     fee: 3.5, rate: 7.35, rateLabel: '7.35%', feeLabel: '3.5%' },
  { label: 'Lowest',    fee: 4.5, rate: 6.95, rateLabel: '6.95%', feeLabel: '4.5%' },
]

export const DEFERRED_OPTIONS = [
  { months: 0,  label: 'None',    multiplier: 1.000 },
  { months: 3,  label: '3 Months', multiplier: 1.075 },
  { months: 6,  label: '6 Months', multiplier: 1.135 },
  { months: 12, label: '12 Months', multiplier: 1.225 },
]

/**
 * Calculate monthly interest-only payment during draw period
 */
export function calcDrawPayment(withdrawAmount, annualRate) {
  const monthlyRate = annualRate / 100 / 12
  return withdrawAmount * monthlyRate
}

/**
 * Calculate fully amortized payment for repayment period
 * @param {number} balance - loan balance at end of draw period
 * @param {number} annualRate - APR in percent (e.g. 7.75)
 * @param {number} repayMonths - repayment period in months (e.g. 240)
 */
export function calcRepayPayment(balance, annualRate, repayMonths = 240) {
  const r = annualRate / 100 / 12
  if (r === 0) return balance / repayMonths
  return balance * (r * Math.pow(1 + r, repayMonths)) / (Math.pow(1 + r, repayMonths) - 1)
}

/**
 * Full loan summary
 */
export function calcLoan({ creditLimit, withdrawNow, tier, deferredMonths }) {
  const { rate, fee } = FEE_TIERS[tier]
  const deferred = DEFERRED_OPTIONS.find(d => d.months === deferredMonths) || DEFERRED_OPTIONS[0]

  const originationFee = Math.round(creditLimit * (fee / 100))
  const drawPayment = calcDrawPayment(withdrawNow, rate) * deferred.multiplier
  const repayPayment = calcRepayPayment(withdrawNow, rate, 240)
  const availableAfter = creditLimit - withdrawNow

  // APR approximation (slightly higher than rate due to origination fee)
  const apr = rate + (fee * 0.08)

  return {
    creditLimit,
    withdrawNow,
    availableAfter,
    rate,
    fee,
    originationFee,
    drawPayment: Math.round(drawPayment),
    repayPayment: Math.round(repayPayment),
    deferredMonths,
    apr: apr.toFixed(2),
  }
}

export function formatCurrency(n) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'k'
  return '$' + n.toLocaleString()
}

export function formatCurrencyFull(n) {
  return '$' + Math.round(n).toLocaleString()
}
