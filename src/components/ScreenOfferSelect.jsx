/**
 * ScreenOfferSelect — Guided loan configurator (Step 2)
 * Implements the GreenLyne / Grand Bank Merchant Escrow Powered HELOC structure.
 *
 * Math source: merchant_escrow_powered_HELOC_04_19_2026_ver_0.9_sxm.pdf (Appendix A)
 * Verified against: structured_payment_HELOC_simulator_GrandBank_04_19_2026_ver_0.7.xlsx
 */

import { useState, useEffect, useMemo } from 'react'
import {
  calcRate, checkEligibility, calcEscrowLoan,
  formatCurrencyFull,
  IO_TERM_MO, AMORT_TERM_MO, ORIGINATION_FEE,
} from '../lib/loanCalc'

// ─── Demo seed values (stand-ins until underwriting data flows through) ────────
const DEMO_FICO = 740
const DEMO_DTI  = 0.40   // 40%
const PROP_VALUE      = 485_000
const MORTGAGE_BAL    = 190_000

// ─── Program loan size caps (from Excel "PROGRAM DETAILS") ───────────────────
// Up to $150K when CLTV ≤75% | Up to $100K when CLTV >75% | Min $25K
const LOAN_CAP_LOW_LTV  = 150_000   // CLTV ≤75%
const LOAN_CAP_HIGH_LTV = 100_000   // CLTV >75%
const LOAN_MIN          = 25_000

// Effective max for this borrower: use $150K cap if that credit line stays ≤75% CLTV
const _cltv150 = (MORTGAGE_BAL + LOAN_CAP_LOW_LTV) / PROP_VALUE
const SEED_MAX = _cltv150 <= 0.75 ? LOAN_CAP_LOW_LTV : LOAN_CAP_HIGH_LTV  // → $150,000 for demo borrower

const SEED = {
  minCredit: LOAN_MIN,
  maxCredit: SEED_MAX,
  defaultCredit: 120_000,
  defaultWithdraw: 96_000,   // 80% of 120K
}

// ─── IO period options ────────────────────────────────────────────────────────
const IO_OPTIONS = [
  { id: 'pi',  label: 'P+I from day one', years: 0, desc: 'Start building equity immediately. No interest-only period — your full payment from month one.' },
  { id: '2yr', label: '2 years',          years: 2, desc: '24 months of interest-only payments, then full P+I for the remainder of the term.' },
  { id: '3yr', label: '3 years',          years: 3, desc: '36 months of interest-only payments, then full P+I.' },
  { id: '4yr', label: '4 years',          years: 4, desc: '48 months of interest-only payments, then full P+I.' },
  { id: '5yr', label: '5 years',          years: 5, desc: '60 months interest-only (fills the entire draw period), then full P+I.' },
]

// ─── Reduction tier options ───────────────────────────────────────────────────
const REDUCTION_TIERS = [
  { id: 'none',     label: 'No reduction', s: 0,    color: '#6B7280' },
  { id: 'comfort',  label: 'Comfort',      s: 0.10, color: '#016163', desc: '10% lower than your standard payment' },
  { id: 'ease',     label: 'Ease',         s: 0.20, color: '#1D6FA8', desc: '20% lower — a meaningful monthly saving' },
  { id: 'maxease',  label: 'MaxEase',      s: 0.30, color: '#254BCE', desc: '30% lower — maximum payment support' },
]

// ─── Range slider ─────────────────────────────────────────────────────────────
function RangeSlider({ value, min, max, step = 1000, onChange, formatLabel }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ width: '100%' }}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="loan-slider w-full"
        style={{ '--fill-pct': `${pct}%` }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{formatLabel(min)}</span>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{formatLabel(max)}</span>
      </div>
    </div>
  )
}

// ─── Credit-line bar ──────────────────────────────────────────────────────────
function CreditBar({ withdrawNow, creditLimit }) {
  const nowPct   = creditLimit > 0 ? Math.round((withdrawNow / creditLimit) * 100) : 0
  const laterPct = 100 - nowPct
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ height: 26, borderRadius: 8, overflow: 'hidden', display: 'flex', background: 'rgba(0,22,96,0.07)' }}>
        <div style={{ width: `${nowPct}%`, background: '#254BCE', minWidth: nowPct > 0 ? 4 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.2s' }}>
          {nowPct > 12 && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', paddingInline: 6 }}>{formatCurrencyFull(withdrawNow)}</span>}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {laterPct > 12 && <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', whiteSpace: 'nowrap', paddingInline: 6 }}>+{formatCurrencyFull(creditLimit - withdrawNow)} available later</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Accordion decision card ──────────────────────────────────────────────────
function DecCard({ step, title, answered, summary, onEdit, onClose, editing, children }) {
  const isOpen = !answered || editing

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      overflow: 'hidden',
      border: `1.5px solid ${answered && !editing ? 'rgba(1,97,99,0.22)' : isOpen ? 'rgba(37,75,206,0.2)' : 'rgba(0,22,96,0.1)'}`,
      boxShadow: isOpen ? '0 4px 20px rgba(0,22,96,0.08)' : 'none',
      transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: answered && !editing ? '#016163' : '#254BCE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s ease, transform 0.2s ease',
          transform: isOpen ? 'scale(1.05)' : 'scale(1)',
        }}>
          {answered && !editing
            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{step}</span>
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {answered && !editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#001660', flex: 1, minWidth: 0 }}>{summary}</span>
              <button onClick={onEdit}
                style={{ fontSize: 12, fontWeight: 600, color: '#254BCE', background: 'rgba(37,75,206,0.08)', border: 'none', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(37,75,206,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(37,75,206,0.08)'}>
                Edit
              </button>
            </div>
          ) : answered && editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#001660', flex: 1, minWidth: 0, lineHeight: 1.35 }}>{title}</span>
              <button onClick={onClose}
                style={{ fontSize: 12, fontWeight: 600, color: '#016163', background: 'rgba(1,97,99,0.08)', border: 'none', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(1,97,99,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(1,97,99,0.08)'}>
                Done ✓
              </button>
            </div>
          ) : (
            <span style={{ fontSize: 17, fontWeight: 700, color: '#001660', lineHeight: 1.35 }}>{title}</span>
          )}
        </div>
      </div>

      {/* Animated body */}
      <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.32s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '16px 18px 18px',
            borderTop: '1px solid rgba(0,22,96,0.07)',
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? 'translateY(0)' : 'translateY(-6px)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Live loan summary panel ──────────────────────────────────────────────────
function LoanSummary({ product, draw, creditLim, rate, cltv, calc, ioYrsId, zeroStart, tierId, s0Done }) {
  if (!s0Done) {
    return (
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,22,96,0.08)', padding: '32px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,22,96,0.05)' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(37,75,206,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 8, fontFamily: "'SharpSans', sans-serif" }}>Your Loan Plan</div>
        <div style={{ fontSize: 15, color: '#9CA3AF', lineHeight: 1.65 }}>Choose your loan type to see your personalized payment plan — it updates live as you make each selection.</div>
      </div>
    )
  }

  if (!calc) {
    return (
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,22,96,0.08)', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: '#9CA3AF' }}>Complete your selections to see the loan summary.</div>
      </div>
    )
  }

  const { L, B, Red_IO, Red_PI, IO_custom, PI_custom, totalEscrow, origFee } = calc
  const ioOpt  = IO_OPTIONS.find(o => o.id === ioYrsId)
  const tier   = REDUCTION_TIERS.find(t => t.id === tierId)
  const ioYrs  = ioOpt?.years ?? 0
  const s      = tier?.s ?? 0
  const hasIO  = ioYrs > 0
  const hasRed = s > 0
  const hasZ   = zeroStart === true

  // Build payment phases
  const phases = []
  const dot = ['#016163', '#254BCE', '#1e3fa8', '#001660']
  let seq = 0

  if (hasZ) {
    phases.push({ dot: dot[seq++], duration: '6 months', payment: 0, label: '$0 per month', sub: 'Escrow covers your payments — nothing due from you' })
  }
  if (hasIO && hasRed) {
    const reducedMonths = ioYrs * 12 - (hasZ ? 6 : 0)
    phases.push({ dot: dot[Math.min(seq++, 3)], duration: `${reducedMonths} months`, payment: Red_IO, label: `${formatCurrencyFull(Red_IO)}/month`, sub: `${Math.round(s*100)}% below standard — interest only` })
  } else if (hasIO && !hasRed) {
    phases.push({ dot: dot[Math.min(seq++, 3)], duration: `${ioYrs * 12 - (hasZ ? 6 : 0)} months`, payment: IO_custom, label: `${formatCurrencyFull(IO_custom)}/month`, sub: 'Interest only — no principal reduction yet' })
  }
  phases.push({ dot: dot[Math.min(seq++, 3)], duration: `${Math.round(AMORT_TERM_MO / 12)} years`, payment: PI_custom, label: `${formatCurrencyFull(PI_custom)}/month`, sub: 'Full principal + interest until paid off', final: true })

  // No savings widget — replaced with loan structure disclosure

  const rateDisplay = (rate * 100).toFixed(2)

  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,22,96,0.1)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,22,96,0.09)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '20px 22px 18px', background: 'linear-gradient(135deg, #001660 0%, #0d2380 100%)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)', marginBottom: 10, fontFamily: "'SharpSans', sans-serif" }}>
          Your Loan Plan
        </div>

        {/* Primary: loan amount */}
        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1 }}>
          {formatCurrencyFull(L)}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 4, marginBottom: 8 }}>
          Total loan · {product === 'heloc' ? 'HELOC' : 'HELOAN'} · {rateDisplay}% fixed
        </div>

        {/* Secondary: breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>
              {product === 'heloc' ? 'Initial draw to merchant' : 'Disbursed at closing'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{formatCurrencyFull(draw)}</span>
          </div>
          {totalEscrow > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Escrow reserve (payment support)</span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>+{formatCurrencyFull(totalEscrow)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Origination fee (financed in)</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>+{formatCurrencyFull(origFee)}</span>
          </div>
          {product === 'heloc' && creditLim > draw && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>Remaining credit line (draw anytime)</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{formatCurrencyFull(creditLim - draw)}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Payment journey ── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 14, fontFamily: "'SharpSans', sans-serif" }}>
            Your payment journey
          </div>

          <div style={{ position: 'relative', paddingLeft: 2 }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: 7, top: 12, bottom: 12, width: 2, background: 'linear-gradient(to bottom, #93DDBA 0%, #254BCE 55%, #001660 100%)', borderRadius: 2, opacity: 0.35 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {phases.map((ph, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: i < phases.length - 1 ? 22 : 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2, background: ph.dot, boxShadow: `0 0 0 4px ${i === 0 ? 'rgba(1,97,99,0.1)' : 'rgba(37,75,206,0.1)'}`, position: 'relative', zIndex: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{ph.duration}</div>
                    <div style={{ fontSize: ph.payment === 0 ? 28 : 24, fontWeight: 900, color: ph.final ? '#001660' : ph.dot, letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 4 }}>
                      {ph.payment === 0 ? '$0' : formatCurrencyFull(ph.payment)}
                      {ph.payment !== 0 && <span style={{ fontSize: 14, fontWeight: 400, color: '#9CA3AF' }}>/mo</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55 }}>{ph.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Loan structure disclosure ── */}
        <div style={{ padding: '14px 16px', background: 'rgba(0,22,96,0.03)', border: '1px solid rgba(0,22,96,0.07)', borderRadius: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9CA3AF', marginBottom: 10, fontFamily: "'SharpSans', sans-serif" }}>
            How your loan is funded
          </div>

          {/* Row: system cost */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#4B5563' }}>Solar system cost</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#001660' }}>{formatCurrencyFull(draw)}</span>
          </div>

          {/* Row: escrow reserve (only shown when active) */}
          {totalEscrow > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
              <span style={{ fontSize: 12, color: '#4B5563', flex: 1 }}>Payment reserve <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(held in escrow)</span></span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>+{formatCurrencyFull(totalEscrow)}</span>
            </div>
          )}

          {/* Row: origination fee */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, paddingBottom: 10, borderBottom: '1px dashed rgba(0,22,96,0.1)' }}>
            <span style={{ fontSize: 12, color: '#4B5563' }}>1.99% origination fee <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(financed in)</span></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>+{formatCurrencyFull(origFee)}</span>
          </div>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#001660' }}>Total loan amount</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#001660' }}>{formatCurrencyFull(L)}</span>
          </div>

          {/* Disclosure note */}
          <div style={{ marginTop: 10, fontSize: 11, color: '#9CA3AF', lineHeight: 1.6, borderTop: '1px solid rgba(0,22,96,0.07)', paddingTop: 8 }}>
            The payment reserve is part of your loan principal — not a fee or buydown. You pay interest on the full loan amount, including the escrowed portion. All payment obligations are fully disclosed at closing.
          </div>
        </div>

        {/* ── Lender ── */}
        <div style={{ paddingTop: 4, borderTop: '1px solid rgba(0,22,96,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>Financed by <span style={{ fontWeight: 700, color: '#374151' }}>Grand Bank</span></div>
          <div style={{ fontSize: 10, color: '#B0B7C3' }}>NMLS #2611</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ScreenOfferSelect({ step2, step1, dispatch, savedConfig }) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [creditLim,   setCreditLim]   = useState(savedConfig?.creditLim   ?? SEED.defaultCredit)
  const [drawAmt,     setDrawAmt]     = useState(savedConfig?.drawAmt     ?? SEED.defaultWithdraw)
  const [amtDone,     setAmtDone]     = useState(savedConfig?.amtDone     ?? false)
  const [zeroStart,   setZeroStart]   = useState(savedConfig?.zeroStart   ?? null)  // null=unanswered, true/false
  const [ioYrsId,     setIoYrsId]     = useState(savedConfig?.ioYrsId     ?? null)  // IO_OPTIONS id
  const [tierId,      setTierId]      = useState(savedConfig?.tierId      ?? null)  // REDUCTION_TIERS id
  const [editingCard, setEditingCard] = useState(null)

  // ── Persist to POSDemo state ───────────────────────────────────────────────
  useEffect(() => {
    dispatch({ type: 'SAVE_STEP2_CONFIG', config: { product: 'heloc', creditLim, drawAmt, amtDone, zeroStart, ioYrsId, tierId } })
  }, [creditLim, drawAmt, amtDone, zeroStart, ioYrsId, tierId]) // eslint-disable-line

  // ── Derived: CLTV, rate, and program cap ─────────────────────────────────
  const minDraw  = Math.ceil(creditLim * 0.8)
  const safeDraw = Math.max(drawAmt, minDraw)

  const cltv = useMemo(() => {
    return (MORTGAGE_BAL + creditLim) / PROP_VALUE
  }, [creditLim])

  // Live program cap: if adding this credit line keeps CLTV ≤75%, allow $150K; else $100K
  const programCap = useMemo(() => {
    const cltvAt150 = (MORTGAGE_BAL + LOAN_CAP_LOW_LTV) / PROP_VALUE
    return cltvAt150 <= 0.75 ? LOAN_CAP_LOW_LTV : LOAN_CAP_HIGH_LTV
  }, [])

  const rate = useMemo(() => calcRate(DEMO_FICO, cltv) ?? 0.0825, [cltv])

  const eligibility = useMemo(() => checkEligibility(DEMO_FICO, cltv, DEMO_DTI), [cltv])

  // ── Step unlock ────────────────────────────────────────────────────────────
  const s0Done = amtDone                      // product is always HELOC now
  const s1Done = s0Done && zeroStart !== null
  const s2Done = s1Done && ioYrsId !== null
  const ioOpt  = IO_OPTIONS.find(o => o.id === ioYrsId)
  const ioYrs  = ioOpt?.years ?? 0
  // If IO = P&I from day 1, reduction card auto-skips to "none"
  const needsRedCard = s2Done && ioYrs > 0
  const s3Done = needsRedCard ? tierId !== null : s2Done
  const allDone = s3Done

  // ── Reduction options (filtered by eligibility) ────────────────────────────
  const availableTiers = useMemo(() => {
    return REDUCTION_TIERS.filter(t => t.s * 100 <= eligibility.maxReductionPct)
  }, [eligibility.maxReductionPct])

  // Auto-select "none" when reduction card is not needed (P&I from day 1)
  useEffect(() => {
    if (s2Done && ioYrs === 0 && tierId === null) setTierId('none')
  }, [s2Done, ioYrs, tierId])

  // ── Escrow loan calculation ────────────────────────────────────────────────
  const calc = useMemo(() => {
    if (!amtDone || !rate || ioYrsId === null) return null
    const tier  = REDUCTION_TIERS.find(t => t.id === (tierId ?? 'none'))
    const s     = tier?.s ?? 0
    const n1    = zeroStart === true ? 6 : 0
    const ioMo  = ioYrs * 12  // total IO window in months

    // n2 (partially subsidised months) only applies when a reduction is active (s > 0)
    // Both windows end together (per Sid's spec: "same time span as IO period")
    const n2_IO = s > 0 ? Math.max(0, ioMo - n1) : 0
    const n2_PI = (ioYrs === 0 && s > 0) ? Math.max(0, 24 - n1) : 0  // P&I-mode: 24-month reduction window

    return calcEscrowLoan({
      C:       safeDraw,
      rate,
      f:       ORIGINATION_FEE,
      n1,
      n2_IO,
      n2_PI,
      s,
      amortMo: AMORT_TERM_MO,
    })
  }, [s0Done, rate, ioYrsId, tierId, zeroStart, ioYrs, safeDraw])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function goEdit(i)   { setEditingCard(i) }
  function closeEdit() { setEditingCard(null) }

  function handleReset() {
    setCreditLim(SEED.defaultCredit); setDrawAmt(SEED.defaultWithdraw)
    setAmtDone(false); setZeroStart(null); setIoYrsId(null); setTierId(null); setEditingCard(null)
    dispatch({ type: 'SAVE_STEP2_CONFIG', config: null })
  }

  function handleConfirm() {
    const tier = REDUCTION_TIERS.find(t => t.id === (tierId ?? 'none'))
    const loanObj = {
      creditLimit: creditLim, withdrawNow: safeDraw,
      rate, cltv,
      apr: (rate * 100).toFixed(2),
      originationFee: calc?.origFee ?? 0,
      totalLoan: calc?.L ?? safeDraw,
      drawPayment:  calc?.IO_custom ?? calc?.PI_custom ?? 0,
      repayPayment: calc?.PI_custom ?? 0,
      reducedPayment: calc?.Red_IO ?? 0,
      deferredMonths: zeroStart ? 6 : 0,
      availableAfter: creditLim - safeDraw,
      ioYears: ioYrs,
      reductionPct: (tier?.s ?? 0) * 100,
      productType: 'heloc',
    }
    dispatch({ type: 'NEXT', step2: { creditLimit: creditLim, withdrawNow: safeDraw, deferredMonths: zeroStart ? 6 : 0, autopay: true }, loan: loanObj })
  }

  const rateDisplay = rate ? `${(rate * 100).toFixed(2)}%` : '—'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, fontFamily: "'SharpSans', sans-serif" }}>
          HELOC · Step 2 of 7
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 5 }}>
          <h1 style={{ fontSize: 25, fontWeight: 700, color: '#001660', margin: 0, letterSpacing: '0em', fontFamily: "'PostGrotesk', sans-serif" }}>
            Build your loan plan
          </h1>
          <button onClick={handleReset}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: '#C4C9D4', whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseOver={e => e.currentTarget.style.color = '#9CA3AF'}
            onMouseOut={e => e.currentTarget.style.color = '#C4C9D4'}>
            ↺ Reset · demo only
          </button>
        </div>
        <p style={{ fontSize: 17, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
          Answer each question — your plan summary updates live on the right.
        </p>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

        {/* ── Left: decision cards ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Card 1 — Amount */}
          <DecCard
            step={1}
            title="Set your credit line and initial draw"
            answered={s0Done}
            editing={editingCard === 0}
            summary={`Credit line ${formatCurrencyFull(creditLim)} · Draw ${formatCurrencyFull(safeDraw)} at closing`}
            onEdit={() => goEdit(0)}
            onClose={closeEdit}
          >
            <div>
              {/* Credit line */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#001660' }}>Total credit line</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#001660' }}>{formatCurrencyFull(creditLim)}</div>
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>
                  Program maximum: {formatCurrencyFull(programCap)} · You only pay interest on what you draw.
                </div>
                <RangeSlider value={creditLim} min={SEED.minCredit} max={programCap} step={5000} onChange={v => { setCreditLim(v); if (drawAmt > v) setDrawAmt(v) }} formatLabel={v => formatCurrencyFull(v)} />
              </div>
              {/* Initial draw */}
              <div style={{ padding: '14px 16px', background: 'rgba(37,75,206,0.04)', border: '1px solid rgba(37,75,206,0.1)', borderRadius: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#001660' }}>Initial draw at closing</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#254BCE' }}>{formatCurrencyFull(safeDraw)}</div>
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>Minimum 80% of your credit line. The remainder stays available to draw anytime.</div>
                <RangeSlider value={Math.max(drawAmt, minDraw)} min={minDraw} max={creditLim} step={5000} onChange={v => setDrawAmt(v)} formatLabel={v => formatCurrencyFull(v)} />
                <CreditBar withdrawNow={safeDraw} creditLimit={creditLim} />
              </div>
              {/* Rate info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: 'rgba(37,75,206,0.04)', borderRadius: 8 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
                <span style={{ fontSize: 12, color: '#254BCE', fontWeight: 500 }}>Your rate: <strong>{rateDisplay}</strong> fixed · Grand Bank NMLS #2611</span>
              </div>
              <button onClick={() => { setAmtDone(true); closeEdit() }}
                style={{ width: '100%', padding: '12px', borderRadius: 11, fontSize: 17, fontWeight: 700, background: '#254BCE', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 3px 14px rgba(37,75,206,0.3)' }}>
                Confirm — draw {formatCurrencyFull(safeDraw)} →
              </button>
            </div>
          </DecCard>

          {/* Card 2 — $0 start */}
          {s0Done && (
            <DecCard
              step={2}
              title="Would you like your first 6 months payment-free?"
              answered={s1Done}
              editing={editingCard === 1}
              summary={zeroStart ? 'Yes — first payment in month 7' : 'No — payments begin right away'}
              onEdit={() => goEdit(1)}
              onClose={closeEdit}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  { val: true,  label: 'Yes — no payments for 6 months', benefit: 'Your solar savings cover costs from day one. Take 6 months before your first payment is due.', tag: 'Escrow-funded', tagColor: '#016163' },
                  { val: false, label: 'No — start paying right away',    benefit: 'Begin paying down your loan immediately. Nothing extra is added to your balance.', tag: 'Standard start', tagColor: '#6B7280' },
                ].map(({ val, label, benefit, tag, tagColor }) => {
                  const active = zeroStart === val
                  return (
                    <button key={String(val)} onClick={() => { setZeroStart(val); closeEdit() }}
                      style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`, background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC', boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none', transition: 'all 0.15s', outline: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.2)'}`, background: active ? '#254BCE' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: active ? '#254BCE' : '#001660', lineHeight: 1.3 }}>{label}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{benefit}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: tagColor, background: `${tagColor}14`, borderRadius: 6, padding: '3px 8px', display: 'inline-block' }}>{tag}</div>
                    </button>
                  )
                })}
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(1,97,99,0.05)', border: '1px solid rgba(1,97,99,0.16)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.65 }}>
                  <strong style={{ color: '#016163' }}>How this works:</strong> These 6 months count inside your payment-support window — your solar savings accumulate while an escrow reserve covers the payments on your behalf.
                </div>
              </div>
            </DecCard>
          )}

          {/* Card 3 — Interest-only period */}
          {s1Done && (
            <DecCard
              step={3}
              title="How long would you like interest-only payments?"
              answered={s2Done}
              editing={editingCard === 2}
              summary={ioYrs === 0 ? 'P+I from day one — building equity immediately' : `${ioYrs}-year interest-only period`}
              onEdit={() => goEdit(2)}
              onClose={closeEdit}
            >
              <p style={{ margin: '0 0 14px', fontSize: 15, color: '#4B5563', lineHeight: 1.65 }}>
                During an interest-only period your monthly payment is lower — you're not paying down principal yet. After the IO period ends, you'll switch to full principal + interest payments.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 4 }}>
                {IO_OPTIONS.map(({ id, label, years, desc }) => {
                  const active = ioYrsId === id
                  return (
                    <button key={id} onClick={() => { setIoYrsId(id); setTierId(null); closeEdit() }}
                      style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`, background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC', boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none', transition: 'all 0.15s', outline: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: active ? '#254BCE' : '#001660' }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>{desc.split('.')[0]}.</div>
                    </button>
                  )
                })}
              </div>
            </DecCard>
          )}

          {/* Card 4 — Payment reduction (only when IO period > 0) */}
          {s2Done && ioYrs > 0 && (
            <DecCard
              step={4}
              title="Choose your payment reduction level"
              answered={s3Done}
              editing={editingCard === 3}
              summary={
                !tierId || tierId === 'none'
                  ? 'No reduction — full interest-only payment'
                  : `${REDUCTION_TIERS.find(t => t.id === tierId)?.label} — ${Math.round((REDUCTION_TIERS.find(t => t.id === tierId)?.s ?? 0) * 100)}% off for ${ioYrs} ${ioYrs === 1 ? 'year' : 'years'}`
              }
              onEdit={() => goEdit(3)}
              onClose={closeEdit}
            >
              <p style={{ margin: '0 0 6px', fontSize: 15, color: '#4B5563', lineHeight: 1.65 }}>
                During your {ioYrs}-year interest-only period{zeroStart ? ' (after the 6-month $0 opening)' : ''}, you can reduce your payment even further. The difference is covered by an escrow reserve funded into your loan at closing.
              </p>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#9CA3AF', lineHeight: 1.55 }}>
                A larger reduction means a slightly higher total loan amount — but significantly lower payments when it matters most.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                {availableTiers.map(({ id, label, s, color, desc }) => {
                  const active = tierId === id
                  const pct    = Math.round(s * 100)
                  return (
                    <button key={id} onClick={() => { setTierId(id); closeEdit() }}
                      style={{ padding: '16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: `1.5px solid ${active ? color : 'rgba(0,22,96,0.1)'}`, background: active ? `${color}10` : '#F8F9FC', boxShadow: active ? `0 0 0 3px ${color}18` : 'none', transition: 'all 0.15s', outline: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: active ? color : '#001660' }}>
                        {id === 'none' ? '—' : `${pct}% off`}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: active ? color : '#374151' }}>{label}</div>
                      {desc && <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>{desc}</div>}
                    </button>
                  )
                })}
              </div>
              {eligibility.maxReductionPct < 30 && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#92400e' }}>
                    Based on your debt-to-income ratio, some higher-reduction options are not available. Options shown are pre-qualified.
                  </div>
                </div>
              )}
            </DecCard>
          )}

          {/* Trust signals */}
          {s0Done && (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {['No obligation', 'No hard pull yet', 'Loan terms disclosed at closing'].map(t => (
                  <div key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid rgba(0,22,96,0.09)', borderRadius: 100, padding: '4px 11px' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#016163" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>{t}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
                Estimates are illustrative only. Final terms subject to full underwriting and property appraisal. Not a commitment to lend. Payment support is funded through an escrow reserve embedded in the loan principal — not a deferral or rate reduction.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ paddingTop: 16, borderTop: '1px solid rgba(0,22,96,0.08)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => dispatch({ type: 'BACK' })}
              style={{ padding: '10px 20px', fontSize: 17, fontWeight: 600, borderRadius: 10, border: '1.5px solid rgba(0,22,96,0.15)', background: 'none', color: '#001660', cursor: 'pointer' }}>
              ← Back
            </button>
            {allDone && (
              <button onClick={handleConfirm}
                style={{ padding: '11px 26px', fontSize: 17, fontWeight: 800, borderRadius: 11, background: '#254BCE', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,75,206,0.35)', transition: 'transform 0.15s' }}
                onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseOut={e => (e.currentTarget.style.transform = '')}>
                Confirm your plan →
              </button>
            )}
          </div>

        </div>{/* end left */}

        {/* ── Right: sticky summary ── */}
        <div style={{ width: 296, flexShrink: 0, position: 'sticky', top: 24 }}>
          <LoanSummary
            product="heloc"
            draw={safeDraw}
            creditLim={creditLim}
            rate={rate}
            cltv={cltv}
            calc={calc}
            ioYrsId={ioYrsId}
            zeroStart={zeroStart}
            tierId={tierId}
            s0Done={amtDone}
          />
        </div>

      </div>{/* end two-column */}
    </div>
  )
}
