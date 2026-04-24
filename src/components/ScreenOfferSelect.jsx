/**
 * ScreenOfferSelect — Step 2 "Select Offer" (v3 — simplified two-bookend design)
 *
 * Shows two pre-configured offers: baseline (standard) and low-monthly (escrow-powered).
 * Each card is grounded in three metrics: monthly payment, APR, total loan amount.
 * Advanced customization is hidden behind a de-emphasized "Advanced" section.
 *
 * Math source: merchant_escrow_powered_HELOC_04_19_2026_ver_0.9_sxm.pdf (Appendix A)
 */

import { useState, useMemo } from 'react'
import {
  calcRate, calcEscrowLoan,
  formatCurrencyFull,
  AMORT_TERM_MO, ORIGINATION_FEE,
} from '../lib/loanCalc'

// ─── Borrower fixtures ────────────────────────────────────────────────────────
const DEMO_FICO    = 740
const PROP_VALUE   = 485_000
const MORTGAGE_BAL = 190_000
const APPLICATION_ID = '1-26022-1758'

const LOAN_CAP_LOW_LTV  = 150_000
const LOAN_CAP_HIGH_LTV = 100_000
const DEFAULT_CREDIT    = 120_000
const DEFAULT_DRAW      = 96_000

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
  navy:   '#001660',
  blue:   '#254BCE',
  blueHi: '#1E3FA8',
  teal:   '#016163',
  green:  '#10B981',
  red:    '#B91C1C',
  amber:  '#B45309',
  text:   '#0F172A',
  body:   '#334155',
  muted:  '#64748B',
  faint:  '#94A3B8',
  border: '#E2E8F0',
  line:   '#F1F5F9',
  panel:  '#F8FAFC',
  white:  '#FFFFFF',
}
const NUM = { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontVariantNumeric: 'tabular-nums' }

// ─── Effective APR via IRR solve (Newton's method) ──────────────────────────
// Solve for monthly r such that: C = Σ (payment_t / (1+r)^t) for t=1..N
function effectiveAPR(fundsReceived, paymentSchedule) {
  let r = 0.007 // ~8.4% annual initial guess
  for (let iter = 0; iter < 80; iter++) {
    let pv = 0, dPv = 0
    for (let i = 0; i < paymentSchedule.length; i++) {
      const t   = i + 1
      const p   = paymentSchedule[i]
      const disc = Math.pow(1 + r, t)
      pv  += p / disc
      dPv += -t * p / (disc * (1 + r))
    }
    const f  = pv - fundsReceived
    const df = dPv
    if (Math.abs(df) < 1e-12) break
    const step = f / df
    r -= step
    if (r < 0) r = 0.0001
    if (Math.abs(step) < 1e-9) break
  }
  return r * 12 // annualize
}

// Build the payment schedule for a given config (C = project cost)
function buildSchedule(calc, cfg) {
  const { B, Red_IO, IO_custom, PI_custom } = calc
  const n1 = cfg.zeroStart ? 6 : 0
  const ioMo = cfg.ioYrs * 12
  const redMo = (cfg.reductionYrs ?? cfg.ioYrs) * 12
  const N = AMORT_TERM_MO + ioMo  // total months

  const s = cfg.s
  const schedule = []
  for (let t = 1; t <= N; t++) {
    if (t <= n1) {
      schedule.push(0)  // fully subsidized
    } else if (t <= ioMo) {
      schedule.push(s > 0 && t <= redMo ? Red_IO : IO_custom)
    } else {
      schedule.push(PI_custom || B)
    }
  }
  return schedule
}

// Compute an offer from a preset config
function computeOffer({ C, rate, preset }) {
  const n1   = preset.zeroStart ? 6 : 0
  const redMo = (preset.reductionYrs ?? preset.ioYrs) * 12
  const s    = preset.s
  const n2_IO = s > 0 ? Math.max(0, redMo - n1) : 0
  const n2_PI = (preset.ioYrs === 0 && s > 0) ? Math.max(0, 24 - n1) : 0

  const calc = calcEscrowLoan({
    C, rate, f: ORIGINATION_FEE,
    n1, n2_IO, n2_PI, s,
    amortMo: AMORT_TERM_MO,
  })
  if (!calc) return null

  const schedule = buildSchedule(calc, preset)
  const apr = effectiveAPR(C, schedule)

  // Active monthly payment (what borrower pays during ramp-up / baseline period)
  // - If there's reduction: use Red_IO (during the reduced-IO period)
  // - If there's just IO (no reduction): use IO_custom
  // - Otherwise: full P&I (calc.B ≈ PI_custom on baseline config)
  let activeMonthly
  if (s > 0) activeMonthly = calc.Red_IO
  else if (preset.ioYrs > 0) activeMonthly = calc.IO_custom
  else activeMonthly = calc.B

  // Description of phases
  let phases = []
  if (n1 > 0) phases.push({ months: n1, payment: 0, label: `$0/mo for first ${n1} months` })
  if (preset.ioYrs > 0) {
    const ioActive = preset.ioYrs * 12 - n1
    phases.push({
      months: ioActive,
      payment: s > 0 ? calc.Red_IO : calc.IO_custom,
      label: s > 0
        ? `Reduced IO for ${Math.round(ioActive / 12 * 10) / 10} yrs`
        : `Interest-only for ${preset.ioYrs} yrs`,
    })
  }
  phases.push({
    months: AMORT_TERM_MO,
    payment: calc.PI_custom || calc.B,
    label: 'Full P+I until paid off',
  })

  return {
    loanAmount: calc.L,
    monthly:    activeMonthly,
    fullPI:     calc.PI_custom || calc.B,
    apr,
    rate,
    phases,
    calc,
  }
}

// ─── Offer card ───────────────────────────────────────────────────────────────
function OfferCard({ title, tagline, offer, accent, isSelected, onSelect, recommended }) {
  if (!offer) return null

  const bgTint = accent === 'blue' ? 'rgba(37,75,206,0.04)' : 'rgba(16,185,129,0.05)'
  const selBorder = accent === 'blue' ? T.blue : T.green
  const pillBg = accent === 'blue' ? 'rgba(37,75,206,0.1)' : 'rgba(16,185,129,0.12)'
  const pillFg = accent === 'blue' ? T.blue : T.green

  return (
    <button
      onClick={onSelect}
      style={{
        textAlign: 'left',
        width: '100%',
        padding: 0,
        background: isSelected ? bgTint : T.white,
        border: `2px solid ${isSelected ? selBorder : T.border}`,
        borderRadius: 18,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s, background 0.15s',
        boxShadow: isSelected ? `0 12px 32px -16px ${selBorder}66` : '0 2px 6px rgba(15,23,42,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseOver={e => { if (!isSelected) e.currentTarget.style.borderColor = '#CBD5E1' }}
      onMouseOut={e => { if (!isSelected) e.currentTarget.style.borderColor = T.border }}
    >
      {recommended && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: pillFg, background: pillBg,
          padding: '4px 10px', borderRadius: 100,
        }}>
          Recommended
        </div>
      )}

      <div style={{ padding: '22px 24px 20px' }}>
        {/* Title + tagline */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: pillFg,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 6,
          }}>
            {title}
          </div>
          <div style={{
            fontSize: 15, fontWeight: 500, color: T.muted, letterSpacing: '-0.01em',
            lineHeight: 1.35,
          }}>
            {tagline}
          </div>
        </div>

        {/* Metric: Monthly payment (hero) */}
        <div style={{
          padding: '18px 20px',
          background: T.panel,
          borderRadius: 12,
          marginBottom: 12,
          border: `1px solid ${T.line}`,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: T.muted,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 6,
          }}>
            Monthly payment
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontSize: 34, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', ...NUM,
            }}>
              {formatCurrencyFull(Math.round(offer.monthly))}
            </span>
            <span style={{ fontSize: 14, color: T.muted, fontWeight: 500 }}>/mo</span>
          </div>
          <div style={{ fontSize: 11.5, color: T.muted, marginTop: 4, lineHeight: 1.4 }}>
            {offer.phases[0]?.label || `Fixed from day 1`}
          </div>
        </div>

        {/* Two sub-metrics: APR + Total loan */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{
            padding: '14px 16px', background: T.panel, borderRadius: 10, border: `1px solid ${T.line}`,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.muted,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4,
            }}>
              APR
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, ...NUM, letterSpacing: '-0.01em' }}>
              {(offer.apr * 100).toFixed(2)}%
            </div>
          </div>
          <div style={{
            padding: '14px 16px', background: T.panel, borderRadius: 10, border: `1px solid ${T.line}`,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.muted,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4,
            }}>
              Total loan amount
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, ...NUM, letterSpacing: '-0.01em' }}>
              {formatCurrencyFull(Math.round(offer.loanAmount))}
            </div>
          </div>
        </div>

        {/* Select indicator */}
        <div style={{
          marginTop: 18, paddingTop: 16,
          borderTop: `1px dashed ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: isSelected ? selBorder : T.white,
            border: `2px solid ${isSelected ? selBorder : T.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}>
            {isSelected && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? selBorder : T.body }}>
            {isSelected ? 'Selected' : 'Select this offer'}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Advanced customization panel ─────────────────────────────────────────────
function AdvancedPanel({ config, setConfig, offer, isActive, onActivate, isEligibleForMax }) {
  const { zeroStart, ioYrs, s, reductionYrs } = config

  const setField = (k, v) => {
    setConfig(prev => ({ ...prev, [k]: v }))
    if (!isActive) onActivate()
  }

  const tierOptions = [
    { s: 0,    label: 'No reduction' },
    { s: 0.10, label: 'Comfort · 10% lower' },
    { s: 0.20, label: 'Ease · 20% lower' },
    { s: 0.30, label: 'MaxEase · 30% lower', lockedOut: !isEligibleForMax },
  ]

  return (
    <div style={{
      background: 'rgba(185,28,28,0.02)',
      border: `1.5px dashed rgba(185,28,28,0.25)`,
      borderRadius: 14,
      padding: '20px 22px',
      marginTop: 4,
    }}>
      {/* Warning header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.red, letterSpacing: '-0.01em' }}>
            Red zone — only if you know what you're doing
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.5 }}>
            Manual dials change the loan structure. The two offers above cover 95% of borrowers. Proceed only if you understand HELOC mechanics and escrow reserves.
          </div>
        </div>
      </div>

      {/* Dials */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Zero-start toggle */}
        <Dial label="Payment-free months">
          <Segmented
            value={zeroStart}
            onChange={v => setField('zeroStart', v)}
            options={[{ value: false, label: 'None' }, { value: true, label: '6 months' }]}
          />
        </Dial>

        {/* IO years */}
        <Dial label="Interest-only period">
          <Segmented
            value={ioYrs}
            onChange={v => setField('ioYrs', v)}
            options={[0,1,2,3,4,5].map(y => ({ value: y, label: y === 0 ? 'None' : `${y} yr${y > 1 ? 's' : ''}` }))}
          />
        </Dial>

        {/* Reduction tier */}
        <Dial label="Payment reduction tier" span={2}>
          <Segmented
            value={s}
            onChange={v => setField('s', v)}
            options={tierOptions.map(o => ({ value: o.s, label: o.label, disabled: o.lockedOut }))}
          />
        </Dial>

        {/* Reduction years */}
        {s > 0 && ioYrs > 0 && (
          <Dial label="Reduction duration" span={2}>
            <Segmented
              value={reductionYrs ?? ioYrs}
              onChange={v => setField('reductionYrs', v)}
              options={Array.from({ length: ioYrs }, (_, i) => i + 1).map(y => ({ value: y, label: `${y} yr${y > 1 ? 's' : ''}` }))}
            />
          </Dial>
        )}
      </div>

      {/* Custom preview */}
      {isActive && offer && (
        <div style={{
          marginTop: 18, padding: '14px 16px',
          background: T.white,
          borderRadius: 10,
          border: `1px solid ${T.border}`,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: T.muted,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
          }}>
            Your custom configuration
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <MetricInline label="Monthly payment" value={formatCurrencyFull(Math.round(offer.monthly))} suffix="/mo" />
            <MetricInline label="APR" value={`${(offer.apr * 100).toFixed(2)}%`} />
            <MetricInline label="Total loan" value={formatCurrencyFull(Math.round(offer.loanAmount))} />
          </div>
        </div>
      )}
    </div>
  )
}

function Dial({ label, span, children }) {
  return (
    <div style={{ gridColumn: span === 2 ? '1 / -1' : 'auto' }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: T.muted,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={{
      display: 'flex', gap: 4,
      background: T.line,
      borderRadius: 10,
      padding: 3,
      flexWrap: 'wrap',
    }}>
      {options.map(o => {
        const active = value === o.value
        return (
          <button
            key={String(o.value)}
            onClick={() => !o.disabled && onChange(o.value)}
            disabled={o.disabled}
            style={{
              flex: 1, minWidth: 60,
              padding: '7px 10px',
              fontSize: 12, fontWeight: 600,
              border: 'none',
              background: active ? T.white : 'transparent',
              color: o.disabled ? T.faint : active ? T.text : T.muted,
              borderRadius: 7,
              cursor: o.disabled ? 'not-allowed' : 'pointer',
              boxShadow: active ? '0 1px 3px rgba(15,23,42,0.1)' : 'none',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function MetricInline({ label, value, suffix }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: T.muted,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.text, ...NUM }}>
        {value}{suffix && <span style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ScreenOfferSelect({ step2, step1, dispatch, savedConfig }) {
  const firstName = step1?.firstName ?? 'Alex'

  // Fixed amounts for both presets (savvy users can change via advanced)
  const C = DEFAULT_DRAW

  // CLTV + rate from property values (same for both presets)
  const cltv = (MORTGAGE_BAL + DEFAULT_CREDIT) / PROP_VALUE
  const rate = calcRate(DEMO_FICO, cltv) ?? 0.0825

  // Program cap (display only)
  const programCap = useMemo(() => {
    const cltvAt150 = (MORTGAGE_BAL + LOAN_CAP_LOW_LTV) / PROP_VALUE
    return cltvAt150 <= 0.75 ? LOAN_CAP_LOW_LTV : LOAN_CAP_HIGH_LTV
  }, [])

  // ── Presets ──
  const BASELINE_PRESET = { zeroStart: false, ioYrs: 0, s: 0,    reductionYrs: null, label: 'Baseline' }
  const LOWMO_PRESET    = { zeroStart: true,  ioYrs: 5, s: 0.30, reductionYrs: 5,    label: 'Low monthly' }

  // ── State ──
  const [selected, setSelected] = useState(savedConfig?.selected || 'lowMonthly')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customCfg, setCustomCfg] = useState({
    zeroStart: LOWMO_PRESET.zeroStart,
    ioYrs:     LOWMO_PRESET.ioYrs,
    s:         LOWMO_PRESET.s,
    reductionYrs: LOWMO_PRESET.reductionYrs,
  })

  // ── Compute offers ──
  const baselineOffer   = useMemo(() => computeOffer({ C, rate, preset: BASELINE_PRESET }), [C, rate])
  const lowMonthlyOffer = useMemo(() => computeOffer({ C, rate, preset: LOWMO_PRESET }),    [C, rate])
  const customOffer     = useMemo(() => computeOffer({ C, rate, preset: customCfg }),        [C, rate, customCfg])

  // Check eligibility for max reduction tier (simple gate — adjust if real underwriting wires up)
  const isEligibleForMax = true

  const currentOffer = selected === 'baseline'   ? baselineOffer
                     : selected === 'lowMonthly' ? lowMonthlyOffer
                     : customOffer

  const currentPreset = selected === 'baseline'   ? BASELINE_PRESET
                      : selected === 'lowMonthly' ? LOWMO_PRESET
                      : customCfg

  function handleConfirm() {
    if (!currentOffer) return
    const calc = currentOffer.calc
    const preset = currentPreset
    const n1 = preset.zeroStart ? 6 : 0
    const loanObj = {
      creditLimit: DEFAULT_CREDIT,
      withdrawNow: DEFAULT_DRAW,
      rate,
      cltv,
      apr: (currentOffer.apr * 100).toFixed(2),
      originationFee: calc?.origFee ?? 0,
      totalLoan: calc?.L ?? DEFAULT_DRAW,
      drawPayment:  calc?.IO_custom ?? calc?.PI_custom ?? 0,
      repayPayment: calc?.PI_custom ?? 0,
      reducedPayment: calc?.Red_IO ?? 0,
      deferredMonths: n1,
      availableAfter: DEFAULT_CREDIT - DEFAULT_DRAW,
      ioYears: preset.ioYrs,
      reductionYears: preset.reductionYrs ?? preset.ioYrs,
      reductionPct: (preset.s ?? 0) * 100,
      productType: 'heloc',
      offerTier: selected,
    }
    dispatch({
      type: 'NEXT',
      step2: { creditLimit: DEFAULT_CREDIT, withdrawNow: DEFAULT_DRAW, deferredMonths: n1, autopay: true },
      loan: loanObj,
    })
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: T.faint, ...NUM }}>Step 2 of 7 · Application #{APPLICATION_ID}</span>
        </div>
        <h1 style={{
          fontSize: 32, fontWeight: 700, color: T.text,
          margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15,
          fontFamily: "'PostGrotesk', sans-serif", maxWidth: '85%',
        }}>
          Congratulations, {firstName}! You're approved to borrow up to{' '}
          <span style={{ color: T.green, ...NUM }}>{formatCurrencyFull(programCap)}</span>
        </h1>
        <p style={{ fontSize: 15, color: T.muted, margin: '10px 0 0', lineHeight: 1.55, maxWidth: '70%' }}>
          Two ways to shape your loan. Pick the one that fits your cash flow.
        </p>
      </div>

      {/* Two bookend offers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 28 }}>
        <OfferCard
          title="Baseline"
          tagline="Simple, straightforward. Start building equity from day one."
          offer={baselineOffer}
          accent="green"
          isSelected={selected === 'baseline'}
          onSelect={() => setSelected('baseline')}
        />
        <OfferCard
          title="Low monthly payment"
          tagline="Lower payments during ramp-up. Ideal if solar savings offset your monthly cost."
          offer={lowMonthlyOffer}
          accent="blue"
          isSelected={selected === 'lowMonthly'}
          onSelect={() => setSelected('lowMonthly')}
          recommended
        />
      </div>

      {/* Advanced toggle — de-emphasized */}
      <div style={{ marginBottom: showAdvanced ? 14 : 32 }}>
        <button
          onClick={() => {
            if (showAdvanced) {
              setShowAdvanced(false)
              // If user was on 'custom', fall back to Low Monthly
              if (selected === 'custom') setSelected('lowMonthly')
            } else {
              setShowAdvanced(true)
            }
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'transparent',
            border: `1px dashed ${T.border}`,
            borderRadius: 10,
            padding: '9px 14px',
            fontSize: 12, fontWeight: 600, color: T.muted,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(185,28,28,0.35)'; e.currentTarget.style.color = T.red }}
          onMouseOut={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {showAdvanced ? 'Hide advanced customization' : 'Advanced customization — red zone'}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      {/* Advanced panel */}
      {showAdvanced && (
        <div style={{ marginBottom: 32 }}>
          <AdvancedPanel
            config={customCfg}
            setConfig={setCustomCfg}
            offer={customOffer}
            isActive={selected === 'custom'}
            onActivate={() => setSelected('custom')}
            isEligibleForMax={isEligibleForMax}
          />
        </div>
      )}

      {/* Major confirm action */}
      <div style={{
        marginTop: 24,
        background: T.white,
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        padding: '26px 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => dispatch({ type: 'BACK' })}
            style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.muted, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            ← Back
          </button>
          <div style={{ width: 1, height: 32, background: T.border }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Selected: {selected === 'baseline' ? 'Baseline' : selected === 'lowMonthly' ? 'Low monthly payment' : 'Custom configuration'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', lineHeight: 1.2, ...NUM }}>
              {currentOffer ? (
                <>
                  {formatCurrencyFull(Math.round(currentOffer.monthly))}/mo · {(currentOffer.apr * 100).toFixed(2)}% APR · {formatCurrencyFull(Math.round(currentOffer.loanAmount))} loan
                </>
              ) : 'Configure your offer'}
            </div>
          </div>
        </div>
        <button
          onClick={handleConfirm}
          disabled={!currentOffer}
          style={{
            flexShrink: 0,
            padding: '16px 32px',
            borderRadius: 12,
            background: currentOffer ? T.blue : 'rgba(15,23,42,0.08)',
            color: currentOffer ? T.white : T.faint,
            border: 'none',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            cursor: currentOffer ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            boxShadow: currentOffer ? '0 6px 20px rgba(37,75,206,0.35)' : 'none',
            transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseOver={e => { if (currentOffer) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(37,75,206,0.4)'; e.currentTarget.style.background = T.blueHi } }}
          onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = currentOffer ? '0 6px 20px rgba(37,75,206,0.35)' : 'none'; if (currentOffer) e.currentTarget.style.background = T.blue }}
        >
          Confirm your plan →
        </button>
      </div>

      {/* Trust signals */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 20, justifyContent: 'center' }}>
        {['No obligation', 'No hard pull yet', 'Terms disclosed at closing'].map(t => (
          <div key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{t}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: T.faint, lineHeight: 1.55, marginTop: 18, textAlign: 'center', maxWidth: 640, margin: '18px auto 0' }}>
        Estimates only. Final terms subject to underwriting and property appraisal. Payment support is funded via an escrow reserve within the loan principal — not a deferral or rate buydown. Financed by Grand Bank · NMLS #2611.
      </div>
    </div>
  )
}
