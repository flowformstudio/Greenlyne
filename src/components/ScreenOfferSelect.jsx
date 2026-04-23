/**
 * ScreenOfferSelect — Step 2 "Select Offer"
 *
 * Shows the pre-qualified base loan as a fixed anchor, lets the user modify it,
 * and visualizes each modification so a non-finance user can see — at a glance —
 * how their tweaks transform the base loan.
 *
 * Math source: merchant_escrow_powered_HELOC_04_19_2026_ver_0.9_sxm.pdf (Appendix A)
 */

import { useState, useEffect, useMemo } from 'react'
import {
  calcRate, calcEscrowLoan,
  formatCurrencyFull,
  AMORT_TERM_MO, ORIGINATION_FEE,
} from '../lib/loanCalc'

// ─── Borrower fixtures (stand-ins until underwriting wires through) ───────────
const DEMO_FICO = 740
const DEMO_DTI  = 0.40
const PROP_VALUE   = 485_000
const MORTGAGE_BAL = 190_000
const APPLICATION_ID = '1-26022-1758'

// ─── Program caps (Excel "PROGRAM DETAILS") ───────────────────────────────────
const LOAN_CAP_LOW_LTV  = 150_000
const LOAN_CAP_HIGH_LTV = 100_000
const LOAN_MIN          = 25_000

const _cltv150 = (MORTGAGE_BAL + LOAN_CAP_LOW_LTV) / PROP_VALUE
const SEED_MAX = _cltv150 <= 0.75 ? LOAN_CAP_LOW_LTV : LOAN_CAP_HIGH_LTV

const SEED = {
  minCredit: LOAN_MIN,
  maxCredit: SEED_MAX,
  defaultCredit: 120_000,
  defaultWithdraw: 96_000,
}

const IO_OPTIONS = [
  { id: 'pi',  label: 'P+I from day one', years: 0, desc: 'Start building equity immediately. No interest-only period.' },
  { id: '1yr', label: '1 year',           years: 1, desc: '12 months interest-only, then full P+I.' },
  { id: '2yr', label: '2 years',          years: 2, desc: '24 months interest-only, then full P+I.' },
  { id: '3yr', label: '3 years',          years: 3, desc: '36 months interest-only, then full P+I.' },
  { id: '4yr', label: '4 years',          years: 4, desc: '48 months interest-only, then full P+I.' },
  { id: '5yr', label: '5 years',          years: 5, desc: '60 months interest-only, then full P+I.' },
]

const REDUCTION_TIERS = [
  { id: 'none',    label: 'No reduction', s: 0,    color: '#9CA3AF' },
  { id: 'comfort', label: 'Comfort',      s: 0.10, color: '#016163', desc: '10% lower than standard' },
  { id: 'ease',    label: 'Ease',         s: 0.20, color: '#1D6FA8', desc: '20% lower — meaningful savings' },
  { id: 'maxease', label: 'MaxEase',      s: 0.30, color: '#254BCE', desc: '30% lower — max support' },
]

// Base loan = pre-qualified offer with zero modifications
const BASE_CFG = {
  zeroStart:   false,
  ioYrsId:     'pi',
  tierId:      'none',
  reductionYrs: null,
}

// ─── Design tokens (modern fintech) ──────────────────────────────────────────
const T = {
  navy:   '#001660',
  blue:   '#254BCE',
  blueHi: '#1E3FA8',
  teal:   '#016163',
  green:  '#10B981',
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

const NUM = { fontVariantNumeric: 'tabular-nums' }

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
        <span style={{ fontSize: 10, color: T.faint, ...NUM }}>{formatLabel(min)}</span>
        <span style={{ fontSize: 10, color: T.faint, ...NUM }}>{formatLabel(max)}</span>
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
      <div style={{ height: 26, borderRadius: 8, overflow: 'hidden', display: 'flex', background: T.line }}>
        <div style={{ width: `${nowPct}%`, background: T.blue, minWidth: nowPct > 0 ? 4 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.2s' }}>
          {nowPct > 12 && <span style={{ fontSize: 10, fontWeight: 700, color: T.white, whiteSpace: 'nowrap', paddingInline: 6, ...NUM }}>{formatCurrencyFull(withdrawNow)}</span>}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {laterPct > 12 && <span style={{ fontSize: 10, fontWeight: 600, color: T.faint, whiteSpace: 'nowrap', paddingInline: 6, ...NUM }}>+{formatCurrencyFull(creditLimit - withdrawNow)} available later</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Pre-qual banner ──────────────────────────────────────────────────────────
function PrequalBanner({ firstName, maxBorrow }) {
  return (
    <div style={{
      background: T.white,
      borderRadius: 14,
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 20,
      border: `1px solid ${T.border}`,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'rgba(16,185,129,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            Pre-qualification complete
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.01em' }}>
            {firstName}, you're approved to borrow up to{' '}
            <span style={{ color: T.green, ...NUM }}>{formatCurrencyFull(maxBorrow)}</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: T.faint, ...NUM, whiteSpace: 'nowrap' }}>
        Application #{APPLICATION_ID}
      </div>
    </div>
  )
}

// ─── Loan card (used for both Base and Modified sides) ────────────────────────
function Row({ label, value, accent, muted, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 12, color: muted ? T.faint : T.muted, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: strong ? 14 : 13, fontWeight: strong ? 800 : 700, color: accent ?? (muted ? T.faint : T.text), ...NUM }}>
        {value}
      </span>
    </div>
  )
}

function LoanCard({ variant, calc, rate, creditLim, draw, modsCount = 0, featured = false }) {
  const isBase = variant === 'base'
  const isActive = !isBase && modsCount > 0

  const L       = calc?.L ?? 0
  const fee     = calc?.origFee ?? 0
  const reserve = calc?.totalEscrow ?? 0

  return (
    <div style={{
      background: isActive ? 'linear-gradient(180deg, #FFFFFF 0%, rgba(37,75,206,0.03) 100%)' : T.white,
      border: `1.5px solid ${isActive ? 'rgba(37,75,206,0.3)' : T.border}`,
      borderRadius: 14,
      padding: featured ? '24px 26px 22px' : '20px 20px 18px',
      boxShadow: isActive
        ? '0 6px 24px rgba(37,75,206,0.1)'
        : '0 1px 2px rgba(15,23,42,0.04)',
      transition: 'all 0.2s ease',
      position: 'relative',
      display: featured ? 'grid' : 'flex',
      gridTemplateColumns: featured ? '1fr 1fr' : undefined,
      flexDirection: featured ? undefined : 'column',
      gap: featured ? 28 : undefined,
      minHeight: featured ? 0 : 210,
    }}>
      {/* Left column when featured, full when not */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: isBase ? T.muted : T.blue, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {isBase ? (featured ? 'Your pre-configured loan' : 'Base offer') : 'Updated loan plan'}
          </span>
          {!isBase && (
            modsCount > 0 ? (
              <span style={{
                fontSize: 10, fontWeight: 700, color: T.blue,
                background: 'rgba(37,75,206,0.1)', borderRadius: 20, padding: '3px 10px',
                whiteSpace: 'nowrap',
              }}>
                {modsCount} change{modsCount === 1 ? '' : 's'} applied
              </span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 600, color: T.faint }}>
                Identical to base
              </span>
            )
          )}
        </div>

        {/* Primary amount */}
        <div style={{ fontSize: featured ? 40 : 32, fontWeight: 900, color: T.navy, letterSpacing: '-0.02em', lineHeight: 1, ...NUM }}>
          {formatCurrencyFull(L)}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.body, marginTop: 8, marginBottom: featured ? 0 : 14, letterSpacing: '-0.01em' }}>
          HELOC · <span style={{ ...NUM }}>{(rate * 100).toFixed(2)}%</span> fixed
        </div>

        {featured && (
          <div style={{ marginTop: 'auto', paddingTop: 14, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
            This is the loan you were pre-qualified for. Customize any option below — a side-by-side comparison will appear once you make changes.
          </div>
        )}
      </div>

      {/* Breakdown — right column when featured, below when not */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 7,
        paddingTop: featured ? 0 : 12,
        paddingLeft: featured ? 24 : 0,
        borderTop: featured ? 'none' : `1px dashed ${T.border}`,
        borderLeft: featured ? `1px dashed ${T.border}` : 'none',
        flex: 1,
      }}>
        <Row label="Solar system cost" value={formatCurrencyFull(draw)} />
        {!isBase && reserve > 0 && (
          <Row label="Payment reserve (held in escrow)" value={`+${formatCurrencyFull(reserve)}`} accent={T.amber} />
        )}
        <Row label="Origination fee (1.99%)" value={`+${formatCurrencyFull(fee)}`} muted />
      </div>
    </div>
  )
}

// ─── Modification chip ────────────────────────────────────────────────────────
function ModChip({ label, onRemove }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: T.white,
      border: `1px solid rgba(37,75,206,0.3)`,
      borderRadius: 100, padding: '5px 5px 5px 13px',
      fontSize: 12, fontWeight: 600, color: T.blue,
    }}>
      <span>{label}</span>
      <button onClick={onRemove}
        aria-label={`Remove ${label}`}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'rgba(37,75,206,0.14)',
          border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, flexShrink: 0,
          transition: 'background 0.15s',
          fontFamily: 'inherit',
        }}
        onMouseOver={e => (e.currentTarget.style.background = T.blue, e.currentTarget.querySelector('svg').setAttribute('stroke', '#fff'))}
        onMouseOut={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.14)', e.currentTarget.querySelector('svg').setAttribute('stroke', T.blue))}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="4" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Comparison panel (side-by-side Base vs Modified) ─────────────────────────
function ComparisonPanel({ calcBase, calcMod, rate, creditLim, draw, modifications, onReset }) {
  const hasMods = modifications.length > 0

  return (
    <div style={{ marginBottom: 53 }}>
      {/* Cards */}
      {hasMods ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 1fr', gap: 0, alignItems: 'stretch' }}>
          <LoanCard variant="base" calc={calcBase} rate={rate} creditLim={creditLim} draw={draw} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(37,75,206,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
          </div>
          <LoanCard variant="modified" calc={calcMod} rate={rate} creditLim={creditLim} draw={draw} modsCount={modifications.length} />
        </div>
      ) : (
        <LoanCard variant="base" calc={calcBase} rate={rate} creditLim={creditLim} draw={draw} featured />
      )}

    </div>
  )
}

// ─── Accordion decision card ──────────────────────────────────────────────────
function DecCard({ step, title, summary, onEdit, onClose, editing, locked, modified, children }) {
  const isOpen = !locked && editing
  const showModified = modified && !locked

  if (locked) {
    return (
      <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, opacity: 0.55 }}>
        <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: T.line, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.faint }}>{step}</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.faint }}>{title}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: showModified
        ? 'linear-gradient(180deg, #FFFFFF 0%, rgba(37,75,206,0.025) 100%)'
        : T.white,
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${isOpen ? 'rgba(37,75,206,0.35)' : showModified ? 'rgba(37,75,206,0.28)' : T.border}`,
      boxShadow: isOpen
        ? '0 4px 20px rgba(37,75,206,0.1)'
        : showModified
          ? '0 2px 10px rgba(37,75,206,0.08)'
          : '0 1px 2px rgba(15,23,42,0.04)',
      transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
      position: 'relative',
    }}>
      {/* Left accent bar when modified */}
      {showModified && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: `linear-gradient(180deg, ${T.blue} 0%, ${T.navy} 100%)`,
          borderRadius: '12px 0 0 12px',
        }} />
      )}

      <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, paddingLeft: showModified ? 22 : 18 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: isOpen || showModified ? T.blue : T.line,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
          boxShadow: showModified && !isOpen ? '0 0 0 3px rgba(37,75,206,0.14)' : 'none',
        }}>
          {showModified && !isOpen ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, color: isOpen ? T.white : T.muted }}>{step}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: showModified ? T.blue : T.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {title}
                  </div>
                  {showModified && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 9, fontWeight: 800, color: T.white,
                      background: T.blue,
                      padding: '2px 7px', borderRadius: 100,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      Modified
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {summary}
                </div>
              </div>
              <button onClick={onEdit}
                style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: 'rgba(37,75,206,0.08)', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.16)')}
                onMouseOut={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.08)')}>
                Change
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text, flex: 1, minWidth: 0, letterSpacing: '-0.01em' }}>{title}</span>
              <button onClick={onClose}
                style={{ fontSize: 12, fontWeight: 600, color: T.green, background: 'rgba(16,185,129,0.12)', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                Done ✓
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '14px 18px 18px',
            borderTop: `1px solid ${T.line}`,
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? 'translateY(0)' : 'translateY(-4px)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Payment timeline (right column, sticky) ──────────────────────────────────
function PaymentTimeline({ calc, calcBase, ioYrsId, zeroStart, tierId, reductionYrs, hasMods, onConfirm, canConfirm }) {
  if (!calc) return null

  const { IO_custom, PI_custom, Red_IO, Red_PI } = calc
  const basePayment = calcBase?.PI_custom ?? 0
  const ioOpt = IO_OPTIONS.find(o => o.id === ioYrsId)
  const tier  = REDUCTION_TIERS.find(t => t.id === tierId)
  const ioYrs = ioOpt?.years ?? 0
  const s     = tier?.s ?? 0
  const hasIO  = ioYrs > 0
  const hasRed = s > 0
  const hasZ   = zeroStart === true

  const n1 = hasZ ? 6 : 0
  const redYrs = reductionYrs ?? ioYrs

  // Build phases sequentially
  const phases = []
  if (hasZ) {
    phases.push({ months: 6, duration: '6 months', payment: 0, sub: 'Escrow covers your payments — nothing due from you', color: T.green })
  }
  if (hasIO) {
    const redMo    = hasRed ? Math.max(0, redYrs * 12 - n1) : 0
    const fullIoMo = Math.max(0, ioYrs * 12 - n1 - redMo)
    if (hasRed && redMo > 0) {
      phases.push({ months: redMo, duration: labelMonths(redMo), payment: Red_IO, sub: `${Math.round(s * 100)}% below standard · interest only`, color: T.blue })
    }
    if (fullIoMo > 0) {
      phases.push({ months: fullIoMo, duration: labelMonths(fullIoMo), payment: IO_custom, sub: 'Interest only — no principal paid down yet', color: T.blueHi })
    }
  } else if (hasRed) {
    const redMo = Math.max(0, redYrs * 12 - n1)
    if (redMo > 0) {
      phases.push({ months: redMo, duration: labelMonths(redMo), payment: Red_PI, sub: `${Math.round(s * 100)}% below standard · principal + interest`, color: T.blue })
    }
  }
  phases.push({ months: 300, duration: '25 years', payment: PI_custom, sub: 'Full principal + interest until paid off', color: T.navy, final: true })

  return (
    <div style={{
      background: T.white,
      border: `1px solid ${T.border}`,
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
      position: 'sticky', top: 20,
    }}>
      {/* Header */}
      <div style={{ padding: '20px 22px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          What you'll pay
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
          Payment timeline
        </div>
        {hasMods && basePayment > 0 ? (
          <div style={{ fontSize: 12, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>
            Base payment is{' '}
            <span style={{ fontWeight: 700, color: T.text, ...NUM }}>{formatCurrencyFull(Math.round(basePayment))}/mo</span>
            {' '}flat. Your plan below:
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>One flat payment for the full term.</div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ padding: '4px 22px 20px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 7, top: 10, bottom: 10, width: 2, background: `linear-gradient(to bottom, ${T.green} 0%, ${T.blue} 55%, ${T.navy} 100%)`, opacity: 0.2, borderRadius: 2 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {phases.map((ph, i) => {
              const delta =
                basePayment > 0 && ph.payment !== 0 && hasMods
                  ? Math.round(ph.payment - basePayment)
                  : null
              const deltaLabel =
                delta === null || delta === 0 ? null
                : delta < 0 ? `${formatCurrencyFull(Math.abs(delta))} less than base`
                : `${formatCurrencyFull(delta)} more than base`
              const deltaColor = delta < 0 ? T.green : delta > 0 ? T.amber : T.muted
              return (
                <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < phases.length - 1 ? 20 : 0 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                    background: ph.color,
                    boxShadow: `0 0 0 4px ${ph.color}1A`,
                    position: 'relative', zIndex: 1,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                      {ph.duration}
                    </div>
                    <div style={{ fontSize: ph.payment === 0 ? 26 : 22, fontWeight: 800, color: ph.final ? T.navy : ph.color, letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 4, ...NUM }}>
                      {ph.payment === 0 ? '$0' : formatCurrencyFull(Math.round(ph.payment))}
                      {ph.payment !== 0 && <span style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>/mo</span>}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{ph.sub}</div>
                    {deltaLabel && (
                      <div style={{
                        fontSize: 11, color: deltaColor, fontWeight: 600, marginTop: 5,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        ...NUM,
                      }}>
                        <span style={{ display: 'inline-block', width: 10, height: 1.5, background: deltaColor }} />
                        {deltaLabel}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Lender footer */}
      <div style={{ padding: '12px 22px 14px', borderTop: `1px solid ${T.line}`, background: T.panel }}>
        <div style={{ fontSize: 10, color: T.faint, textAlign: 'center', lineHeight: 1.5 }}>
          Financed by Grand Bank · NMLS #2611
        </div>
      </div>
    </div>
  )
}

// ─── Plain-language summary (Lyne AI guidance) ────────────────────────────────
function fmtMoney(n) { return '$' + Math.round(n).toLocaleString() }

function buildPlanNarrative({ firstName, calc, calcBase, zeroStart, ioYrs, reductionYrs, s, creditLim, safeDraw }) {
  if (!calc || !calcBase) return null

  const modL      = Math.round(calc.L)
  const baseL     = Math.round(calcBase.L)
  const extra     = modL - baseL
  const reserve   = Math.round(calc.totalEscrow ?? 0)
  const basePI    = Math.round(calcBase.PI_custom)
  const modPI     = Math.round(calc.PI_custom)
  const modIO     = Math.round(calc.IO_custom)
  const redIO     = Math.round(calc.Red_IO ?? 0)
  const redPI     = Math.round(calc.Red_PI ?? 0)
  const paymentUp = modPI - basePI
  const hasMods   = zeroStart === true || ioYrs > 0 || s > 0
  const name      = firstName || 'there'

  // Base-loan narrative (no modifications)
  if (!hasMods) {
    return {
      body: `Here's the plain read, ${name} — you borrow ${fmtMoney(baseL)} to install solar, then pay ${fmtMoney(basePI)}/mo for 25 years. Flat. No surprises, no payment jumps, no reserve baked in. It's the simplest version of the deal: lowest loan amount, steadiest monthly number, and you start building equity from month one.`,
      verdict: `If ${fmtMoney(basePI)}/mo fits your budget comfortably, this is a solid baseline. Customize below if you want to shape it differently.`,
      tone: 'good',
    }
  }

  // Build the "what you pay when" timeline in prose
  const phases = []
  if (zeroStart) {
    phases.push(`**$0 for your first 6 months** (the escrow reserve covers it)`)
  }
  if (ioYrs > 0) {
    const redYrs = reductionYrs ?? ioYrs
    const redMo  = Math.max(0, redYrs * 12 - (zeroStart ? 6 : 0))
    const fullIoMo = Math.max(0, ioYrs * 12 - (zeroStart ? 6 : 0) - redMo)
    if (s > 0 && redMo > 0) {
      phases.push(`**${fmtMoney(redIO)}/mo** for the next ${redMo >= 12 && redMo % 12 === 0 ? `${redMo / 12} year${redMo / 12 === 1 ? '' : 's'}` : `${redMo} months`} (${Math.round(s * 100)}% below the standard IO payment)`)
    }
    if (fullIoMo > 0) {
      phases.push(`**${fmtMoney(modIO)}/mo** interest-only for ${fullIoMo >= 12 && fullIoMo % 12 === 0 ? `${fullIoMo / 12} year${fullIoMo / 12 === 1 ? '' : 's'}` : `${fullIoMo} months`}`)
    }
  } else if (s > 0) {
    const redYrs = reductionYrs ?? 2
    phases.push(`**${fmtMoney(redPI)}/mo** for the first ${redYrs} year${redYrs === 1 ? '' : 's'} (${Math.round(s * 100)}% below base)`)
  }
  phases.push(`**${fmtMoney(modPI)}/mo** for the rest of the 25-year term`)

  const phaseStr = phases.length === 2
    ? `${phases[0]}, then ${phases[1]}.`
    : phases.slice(0, -1).join(', then ') + `, and finally ${phases[phases.length - 1]}.`

  // Tradeoff sentence
  let tradeoff = ''
  if (reserve > 0) {
    tradeoff = ` The tradeoff: we added a ${fmtMoney(reserve)} reserve to your loan to fund those lower early payments, which bumps your long-term monthly up by ${fmtMoney(Math.abs(paymentUp))}/mo vs. the base offer (${fmtMoney(basePI)}/mo).`
  }

  // Verdict
  let verdict = ''
  let tone = 'neutral'
  if (zeroStart && ioYrs > 0 && s > 0) {
    verdict = `**Makes sense** if you want maximum breathing room up front and expect your income or savings to grow. **Skip it** if you'd rather keep the loan lean and start building equity right away.`
    tone = 'caution'
  } else if (zeroStart && (ioYrs > 0 || s > 0)) {
    verdict = `**Makes sense** if cash flow matters more than total loan size in the next few years. **Skip it** if you'd rather start paying down principal from day one.`
    tone = 'neutral'
  } else if (zeroStart) {
    verdict = `**Good call** if your budget is tight right after install. The ${fmtMoney(extra)} it adds to your loan is a fair price for 6 months of zero payments — as long as you're comfortable with the step up afterward.`
    tone = 'good'
  } else if (ioYrs > 0 && s > 0) {
    verdict = `**Good for** easing in while solar savings ramp, at the cost of a larger total loan. Just be ready: once the interest-only window closes, your payment jumps to ${fmtMoney(modPI)}/mo.`
    tone = 'caution'
  } else if (ioYrs > 0) {
    verdict = `**Good for** lower payments while you adjust. Just know the payment steps up to ${fmtMoney(modPI)}/mo when the interest-only period ends.`
    tone = 'neutral'
  } else if (s > 0) {
    verdict = `**Smart** if you want a meaningful monthly drop in the early years — the cost is a slightly larger loan and a step up later.`
    tone = 'neutral'
  }

  return {
    body: `Here's the plain read, ${name} — you'll borrow **${fmtMoney(modL)}** (${extra >= 0 ? `${fmtMoney(extra)} more than the base ${fmtMoney(baseL)}` : 'less than the base'}). Your payment moves in phases: ${phaseStr}${tradeoff}`,
    verdict,
    tone,
  }
}

// Render markdown-lite **bold** segments as <strong>
function richText(str) {
  const parts = String(str).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => p.startsWith('**') && p.endsWith('**')
    ? <strong key={i} style={{ color: '#1E1B4B', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
    : <span key={i}>{p}</span>
  )
}

function PlanNarrative({ calc, calcBase, zeroStart, ioYrs, reductionYrs, s, creditLim, safeDraw, firstName }) {
  const narrative = useMemo(
    () => buildPlanNarrative({ firstName, calc, calcBase, zeroStart, ioYrs, reductionYrs, s, creditLim, safeDraw }),
    [firstName, calc, calcBase, zeroStart, ioYrs, reductionYrs, s, creditLim, safeDraw]
  )
  if (!narrative) return null

  const toneBg = narrative.tone === 'good'    ? 'rgba(16,185,129,0.06)'
              : narrative.tone === 'caution' ? 'rgba(245,158,11,0.06)'
              : 'rgba(99,102,241,0.05)'
  const toneBorder = narrative.tone === 'good'    ? 'rgba(16,185,129,0.2)'
                  : narrative.tone === 'caution' ? 'rgba(245,158,11,0.22)'
                  : 'rgba(99,102,241,0.2)'

  return (
    <div style={{
      marginTop: 14,
      padding: '16px 18px',
      background: toneBg,
      border: `1px solid ${toneBorder}`,
      borderRadius: 16,
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 9,
          background: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(124,58,237,0.25)', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
            <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"/>
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1E1B4B', letterSpacing: '-0.01em' }}>Lyne</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#6366F1', background: 'rgba(99,102,241,0.12)', padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            AI guidance
          </span>
        </div>
      </div>

      {/* Body */}
      <p style={{ fontSize: 13, color: '#1F2937', lineHeight: 1.65, margin: 0 }}>
        {richText(narrative.body)}
      </p>

      {/* Verdict */}
      {narrative.verdict && (
        <p style={{ fontSize: 13, color: '#1F2937', lineHeight: 1.65, margin: '10px 0 0', paddingTop: 10, borderTop: '1px dashed rgba(99,102,241,0.2)' }}>
          {richText(narrative.verdict)}
        </p>
      )}
    </div>
  )
}

function labelMonths(mo) {
  if (mo >= 12 && mo % 12 === 0) {
    const y = mo / 12
    return `${y} ${y === 1 ? 'year' : 'years'}`
  }
  return `${mo} months`
}

// ─── Picker sub-components (card body content) ────────────────────────────────
function CreditAndDraw({ creditLim, setCreditLim, drawAmt, setDrawAmt, programCap, minDraw, safeDraw, rateDisplay, onDone }) {
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Total credit line</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.navy, ...NUM }}>{formatCurrencyFull(creditLim)}</div>
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>
          Up to {formatCurrencyFull(programCap)} · Interest only on what you draw.
        </div>
        <RangeSlider value={creditLim} min={SEED.minCredit} max={programCap} step={5000}
          onChange={v => { setCreditLim(v); if (drawAmt > v) setDrawAmt(v) }}
          formatLabel={v => formatCurrencyFull(v)} />
      </div>

      <div style={{ padding: '14px 16px', background: T.panel, border: `1px solid ${T.border}`, borderRadius: 11, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Initial draw at closing</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.blue, ...NUM }}>{formatCurrencyFull(safeDraw)}</div>
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>Min 80% of credit line. Remainder stays available to draw later.</div>
        <RangeSlider value={Math.max(drawAmt, minDraw)} min={minDraw} max={creditLim} step={5000}
          onChange={v => setDrawAmt(v)}
          formatLabel={v => formatCurrencyFull(v)} />
        <CreditBar withdrawNow={safeDraw} creditLimit={creditLim} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: 'rgba(37,75,206,0.05)', borderRadius: 8 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
        <span style={{ fontSize: 12, color: T.blue, fontWeight: 500 }}>Your rate: <strong>{rateDisplay}</strong> fixed · Grand Bank NMLS #2611</span>
      </div>

      <button onClick={onDone}
        style={{ width: '100%', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: T.blue, color: T.white, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(37,75,206,0.25)' }}>
        Done →
      </button>
    </div>
  )
}

function ZeroStartPicker({ zeroStart, setZeroStart, onDone }) {
  const options = [
    { val: true,  label: 'Yes — no payments for 6 months', benefit: 'Your solar savings cover costs from day one. Take 6 months before your first payment is due.', tag: 'Escrow-funded', tagColor: T.teal },
    { val: false, label: 'No — start paying right away',    benefit: 'Begin paying down your loan immediately. Keeps the loan amount smaller.', tag: 'Base loan',      tagColor: T.muted },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {options.map(({ val, label, benefit, tag, tagColor }) => {
          const active = zeroStart === val
          return (
            <button key={String(val)} onClick={() => setZeroStart(val)}
              style={{
                padding: '14px 14px', borderRadius: 11, cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${active ? T.blue : T.border}`,
                background: active ? 'rgba(37,75,206,0.05)' : T.white,
                boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                transition: 'all 0.15s', outline: 'none',
                display: 'flex', flexDirection: 'column', gap: 8,
                fontFamily: 'inherit',
              }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${active ? T.blue : T.faint}`, background: active ? T.blue : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: T.white }} />}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: active ? T.blue : T.text, lineHeight: 1.3 }}>{label}</div>
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.55 }}>{benefit}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: tagColor, background: `${tagColor}14`, borderRadius: 6, padding: '3px 8px', display: 'inline-block', alignSelf: 'flex-start' }}>{tag}</div>
            </button>
          )
        })}
      </div>
      <div style={{ padding: '10px 14px', background: 'rgba(1,97,99,0.05)', border: '1px solid rgba(1,97,99,0.16)', borderRadius: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: T.body, lineHeight: 1.6 }}>
          <strong style={{ color: T.teal }}>How this works:</strong> An escrow reserve is added to your loan principal, and it pays your first 6 months on your behalf. You don't pay interest on those months — but the reserve does grow the total loan amount.
        </div>
      </div>
      <button onClick={onDone}
        style={{ width: '100%', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: T.blue, color: T.white, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        Done →
      </button>
    </div>
  )
}

function IoPicker({ ioYrsId, setIoYrsId, setTierId, setReductionYrs, onDone }) {
  return (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: T.body, lineHeight: 1.6 }}>
        During an interest-only period your monthly payment is lower — you're not paying down principal yet. After the IO period, you'll switch to full principal + interest.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
        {IO_OPTIONS.map(({ id, label, desc, years }) => {
          const active = ioYrsId === id
          const isBase = id === 'pi'
          return (
            <button key={id}
              onClick={() => { setIoYrsId(id); setTierId('none'); setReductionYrs(years > 0 ? years : null) }}
              style={{
                padding: '13px 14px', borderRadius: 11, cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${active ? T.blue : T.border}`,
                background: active ? 'rgba(37,75,206,0.05)' : T.white,
                boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                transition: 'all 0.15s', outline: 'none',
                display: 'flex', flexDirection: 'column', gap: 5,
                fontFamily: 'inherit', position: 'relative',
              }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: active ? T.blue : T.text }}>{label}</div>
              <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.5 }}>{desc.split('.')[0]}.</div>
              {isBase && (
                <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, color: T.muted, background: T.line, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Base</div>
              )}
            </button>
          )
        })}
      </div>
      <button onClick={onDone}
        style={{ width: '100%', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: T.blue, color: T.white, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        Done →
      </button>
    </div>
  )
}

function ReductionPicker({ tierId, setTierId, reductionYrs, setReductionYrs, ioYrs, zeroStart, onDone }) {
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 13, color: T.body, lineHeight: 1.6 }}>
        During your {ioYrs}-year interest-only period{zeroStart ? ' (after the 6-month $0 opening)' : ''}, you can reduce your payment further. The difference is covered by an escrow reserve funded into your loan at closing.
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 11, color: T.muted, lineHeight: 1.55 }}>
        A larger reduction adds a bit to your total loan amount — but significantly lowers payments when it matters most.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: 8, marginBottom: 14 }}>
        {REDUCTION_TIERS.map(({ id, label, s, color, desc }) => {
          const active = tierId === id
          const pct = Math.round(s * 100)
          const isBase = id === 'none'
          return (
            <button key={id} onClick={() => setTierId(id)}
              style={{
                padding: '14px', borderRadius: 11, cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${active ? color : T.border}`,
                background: active ? `${color}0E` : T.white,
                boxShadow: active ? `0 0 0 3px ${color}18` : 'none',
                transition: 'all 0.15s', outline: 'none',
                display: 'flex', flexDirection: 'column', gap: 5,
                fontFamily: 'inherit', position: 'relative',
              }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: active ? color : T.text, ...NUM }}>
                {isBase ? '—' : `${pct}% off`}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: active ? color : T.body }}>{label}</div>
              {desc && <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.5 }}>{desc}</div>}
              {isBase && (
                <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, color: T.muted, background: T.line, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Base</div>
              )}
            </button>
          )
        })}
      </div>

      {tierId && tierId !== 'none' && (
        <div style={{ padding: '13px 15px', background: 'rgba(37,75,206,0.03)', border: '1px solid rgba(37,75,206,0.12)', borderRadius: 11, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 9 }}>
            How long should the reduction last?
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map(y => {
              const active = (reductionYrs ?? ioYrs) === y
              return (
                <button key={y} onClick={() => setReductionYrs(y)}
                  style={{
                    padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px solid ${active ? T.blue : T.border}`,
                    background: active ? T.blue : T.white,
                    color: active ? T.white : T.body,
                    fontSize: 13, fontWeight: 700, transition: 'all 0.15s', outline: 'none',
                    fontFamily: 'inherit',
                  }}>
                  {y} {y === 1 ? 'yr' : 'yrs'}
                  {y === ioYrs && <span style={{ fontSize: 9, fontWeight: 500, marginLeft: 4, opacity: 0.7 }}>(IO)</span>}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: T.muted, lineHeight: 1.55 }}>
            Defaults to your IO period ({ioYrs} {ioYrs === 1 ? 'year' : 'years'}). Max 5 years.
          </div>
        </div>
      )}

      <button onClick={onDone}
        style={{ width: '100%', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: T.blue, color: T.white, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        Done →
      </button>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ScreenOfferSelect({ step2, step1, dispatch, savedConfig }) {
  const firstName = step1?.firstName ?? 'Alex'

  // State — defaults to the BASE loan (no modifications)
  const [creditLim,    setCreditLim]    = useState(savedConfig?.creditLim    ?? SEED.defaultCredit)
  const [drawAmt,      setDrawAmt]      = useState(savedConfig?.drawAmt      ?? SEED.defaultWithdraw)
  const [zeroStart,    setZeroStart]    = useState(savedConfig?.zeroStart    ?? BASE_CFG.zeroStart)
  const [ioYrsId,      setIoYrsId]      = useState(savedConfig?.ioYrsId      ?? BASE_CFG.ioYrsId)
  const [tierId,       setTierId]       = useState(savedConfig?.tierId       ?? BASE_CFG.tierId)
  const [reductionYrs, setReductionYrs] = useState(savedConfig?.reductionYrs ?? BASE_CFG.reductionYrs)
  const [editingCard,  setEditingCard]  = useState(null)

  // Persist config
  useEffect(() => {
    dispatch({
      type: 'SAVE_STEP2_CONFIG',
      config: { product: 'heloc', creditLim, drawAmt, amtDone: true, zeroStart, ioYrsId, tierId, reductionYrs }
    })
  }, [creditLim, drawAmt, zeroStart, ioYrsId, tierId, reductionYrs]) // eslint-disable-line

  // Derived
  const minDraw  = Math.ceil(creditLim * 0.8)
  const safeDraw = Math.max(drawAmt, minDraw)
  const cltv     = useMemo(() => (MORTGAGE_BAL + creditLim) / PROP_VALUE, [creditLim])
  const rate     = useMemo(() => calcRate(DEMO_FICO, cltv) ?? 0.0825, [cltv])
  const programCap = useMemo(() => {
    const cltvAt150 = (MORTGAGE_BAL + LOAN_CAP_LOW_LTV) / PROP_VALUE
    return cltvAt150 <= 0.75 ? LOAN_CAP_LOW_LTV : LOAN_CAP_HIGH_LTV
  }, [])

  const ioOpt = IO_OPTIONS.find(o => o.id === ioYrsId)
  const ioYrs = ioOpt?.years ?? 0
  const tier  = REDUCTION_TIERS.find(t => t.id === tierId)
  const s     = tier?.s ?? 0

  // Base loan — reference anchor (no modifications)
  const calcBase = useMemo(() =>
    calcEscrowLoan({ C: safeDraw, rate, f: ORIGINATION_FEE, n1: 0, n2_IO: 0, n2_PI: 0, s: 0, amortMo: AMORT_TERM_MO })
  , [safeDraw, rate])

  // Modified loan — current user selections
  const calc = useMemo(() => {
    const n1 = zeroStart === true ? 6 : 0
    const redMo = (reductionYrs ?? ioYrs) * 12
    const n2_IO = s > 0 ? Math.max(0, redMo - n1) : 0
    const n2_PI = (ioYrs === 0 && s > 0) ? Math.max(0, 24 - n1) : 0
    return calcEscrowLoan({ C: safeDraw, rate, f: ORIGINATION_FEE, n1, n2_IO, n2_PI, s, amortMo: AMORT_TERM_MO })
  }, [safeDraw, rate, ioYrs, s, zeroStart, reductionYrs])

  // Modifications list (chips + comparison count)
  const modifications = useMemo(() => {
    const mods = []
    if (zeroStart === true) {
      mods.push({
        id: 'zero',
        label: 'First 6 months $0',
        onRemove: () => setZeroStart(false),
      })
    }
    if (ioYrs > 0) {
      mods.push({
        id: 'io',
        label: `${ioYrs}-year interest only`,
        onRemove: () => { setIoYrsId('pi'); setTierId('none'); setReductionYrs(null) },
      })
    }
    if (s > 0) {
      const yrs = reductionYrs ?? ioYrs
      mods.push({
        id: 'red',
        label: `${Math.round(s * 100)}% payment reduction · ${yrs} ${yrs === 1 ? 'yr' : 'yrs'}`,
        onRemove: () => setTierId('none'),
      })
    }
    return mods
  }, [zeroStart, ioYrs, s, reductionYrs])

  const hasMods = modifications.length > 0

  // Keep reductionYrs sane when IO changes
  useEffect(() => {
    if (ioYrs > 0 && (reductionYrs === null || reductionYrs > 5)) setReductionYrs(ioYrs)
    if (ioYrs === 0 && reductionYrs !== null) setReductionYrs(null)
  }, [ioYrs]) // eslint-disable-line

  // If user enters reduction card but tier is still none, seed to nothing — they'll pick.
  useEffect(() => {
    if (ioYrs === 0 && tierId !== 'none') setTierId('none')
  }, [ioYrs]) // eslint-disable-line

  function resetToBase() {
    setZeroStart(BASE_CFG.zeroStart)
    setIoYrsId(BASE_CFG.ioYrsId)
    setTierId(BASE_CFG.tierId)
    setReductionYrs(BASE_CFG.reductionYrs)
    setEditingCard(null)
  }

  function handleConfirm() {
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
      reductionYears: reductionYrs ?? ioYrs,
      reductionPct: s * 100,
      productType: 'heloc',
    }
    dispatch({
      type: 'NEXT',
      step2: { creditLimit: creditLim, withdrawNow: safeDraw, deferredMonths: zeroStart ? 6 : 0, autopay: true },
      loan: loanObj,
    })
  }

  const rateDisplay = `${(rate * 100).toFixed(2)}%`

  // Summaries for collapsed cards
  const card1Summary = `${formatCurrencyFull(creditLim)} credit line · ${formatCurrencyFull(safeDraw)} drawn at closing`
  const card2Summary = zeroStart
    ? 'Yes — escrow covers the first 6 months'
    : 'No — standard start (base loan)'
  const card3Summary = ioYrs === 0
    ? 'None — full payments from day 1 (base loan)'
    : `${ioYrs} ${ioYrs === 1 ? 'year' : 'years'} interest-only, then full P+I`
  const card4Summary = !tierId || tierId === 'none'
    ? 'No reduction (base loan)'
    : `${tier?.label} · ${Math.round(s * 100)}% off for ${reductionYrs ?? ioYrs} ${(reductionYrs ?? ioYrs) === 1 ? 'year' : 'years'}`

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: T.faint, ...NUM }}>Step 2 of 7 · Application #{APPLICATION_ID}</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: T.text, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15, fontFamily: "'PostGrotesk', sans-serif", maxWidth: '80%' }}>
          Congratulations, {firstName}! You're approved to borrow up to{' '}
          <span style={{ color: T.green, ...NUM }}>{formatCurrencyFull(programCap)}</span>
        </h1>
        <p style={{ fontSize: 15, color: T.muted, margin: '10px 0 0', lineHeight: 1.55 }}>
          We've pre-configured a loan for you. Customize any option below
        </p>
      </div>

      <ComparisonPanel
        calcBase={calcBase}
        calcMod={calc}
        rate={rate}
        creditLim={creditLim}
        draw={safeDraw}
        modifications={modifications}
        onReset={resetToBase}
      />

      {/* Customization section header — gives context for the decision cards */}
      <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 22, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
              Shape your loan
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Pick the setup that works for you
            </h2>
          </div>
          {hasMods && (
            <button onClick={resetToBase}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 600, color: T.blue,
                background: 'transparent', border: 'none',
                padding: '6px 4px',
                cursor: 'pointer', flexShrink: 0,
                fontFamily: 'inherit',
                transition: 'color 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = T.blueHi)}
              onMouseOut={e => (e.currentTarget.style.color = T.blue)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              Reset to base loan
            </button>
          )}
        </div>
        <div />
      </div>

      {/* Two-column: decision cards + payment timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 22, alignItems: 'flex-start' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <DecCard
            step={1}
            title="Credit line &amp; initial draw"
            summary={card1Summary}
            modified={creditLim !== SEED.defaultCredit || drawAmt !== SEED.defaultWithdraw}
            editing={editingCard === 0}
            onEdit={() => setEditingCard(0)}
            onClose={() => setEditingCard(null)}
          >
            <CreditAndDraw
              creditLim={creditLim} setCreditLim={setCreditLim}
              drawAmt={drawAmt} setDrawAmt={setDrawAmt}
              programCap={programCap} minDraw={minDraw} safeDraw={safeDraw}
              rateDisplay={rateDisplay}
              onDone={() => setEditingCard(null)}
            />
          </DecCard>

          <DecCard
            step={2}
            title="First 6 months payment-free?"
            summary={card2Summary}
            modified={zeroStart === true}
            editing={editingCard === 1}
            onEdit={() => setEditingCard(1)}
            onClose={() => setEditingCard(null)}
          >
            <ZeroStartPicker zeroStart={zeroStart} setZeroStart={setZeroStart} onDone={() => setEditingCard(null)} />
          </DecCard>

          <DecCard
            step={3}
            title="Interest-only period"
            summary={card3Summary}
            modified={ioYrs > 0}
            editing={editingCard === 2}
            onEdit={() => setEditingCard(2)}
            onClose={() => setEditingCard(null)}
          >
            <IoPicker
              ioYrsId={ioYrsId} setIoYrsId={setIoYrsId}
              setTierId={setTierId} setReductionYrs={setReductionYrs}
              onDone={() => setEditingCard(null)}
            />
          </DecCard>

          {ioYrs > 0 && (
            <DecCard
              step={4}
              title="Payment reduction level"
              summary={card4Summary}
              modified={s > 0}
              editing={editingCard === 3}
              onEdit={() => setEditingCard(3)}
              onClose={() => setEditingCard(null)}
            >
              <ReductionPicker
                tierId={tierId} setTierId={setTierId}
                reductionYrs={reductionYrs} setReductionYrs={setReductionYrs}
                ioYrs={ioYrs} zeroStart={zeroStart}
                onDone={() => setEditingCard(null)}
              />
            </DecCard>
          )}

          {/* Trust signals */}
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
            {['No obligation', 'No hard pull yet', 'Terms disclosed at closing'].map(t => (
              <div key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: T.faint, lineHeight: 1.55, marginTop: 4 }}>
            Estimates only. Final terms subject to underwriting and property appraisal. Payment support is funded via an escrow reserve within the loan principal — not a deferral or rate buydown.
          </div>

          {/* Nav */}
          <div style={{ paddingTop: 14, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button onClick={() => dispatch({ type: 'BACK' })}
              style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: `1px solid ${T.border}`, background: T.white, color: T.text, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Back
            </button>
            <button onClick={handleConfirm}
              disabled={!calc}
              style={{
                padding: '12px 26px', borderRadius: 11,
                background: calc ? T.blue : 'rgba(15,23,42,0.08)',
                color: calc ? T.white : T.faint,
                border: 'none', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
                cursor: calc ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                boxShadow: calc ? '0 4px 14px rgba(37,75,206,0.3)' : 'none',
                transition: 'transform 0.15s, background 0.15s',
              }}
              onMouseOver={e => { if (calc) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = T.blueHi } }}
              onMouseOut={e => { e.currentTarget.style.transform = ''; if (calc) e.currentTarget.style.background = T.blue }}>
              Confirm your plan →
            </button>
          </div>
        </div>

        {/* Right: sticky payment timeline + Lyne AI guidance */}
        <div>
          <PaymentTimeline
            calc={calc}
            calcBase={calcBase}
            ioYrsId={ioYrsId}
            zeroStart={zeroStart}
            tierId={tierId}
            reductionYrs={reductionYrs}
            hasMods={hasMods}
            onConfirm={handleConfirm}
            canConfirm={!!calc}
          />
          <PlanNarrative
            calc={calc}
            calcBase={calcBase}
            zeroStart={zeroStart}
            ioYrs={ioYrs}
            reductionYrs={reductionYrs}
            s={s}
            creditLim={creditLim}
            safeDraw={safeDraw}
            firstName={firstName}
          />
        </div>

      </div>
    </div>
  )
}
