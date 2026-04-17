/**
 * ScreenOfferSelect — Guided loan configurator (Step 2)
 * Replaces the old freeform customization panel with a progressive decision-tree.
 * Left: one-question-at-a-time cards  |  Right: sticky live loan summary
 */

import { useState, useEffect } from 'react'
import { formatCurrencyFull } from '../lib/loanCalc'

// ─── Seed / domain constants ──────────────────────────────────────────────────
const SEED = {
  defaultCredit: 131800,
  defaultWithdraw: 91800,
  minCredit: 25000,
  maxCredit: 294821,
}

const HELOC_RATE  = 7.75
const HELOAN_RATE = 8.25
const TERM_MO     = 240   // 20-year repayment
const FEE_PCT     = 0.025 // origination fee rolled in

// ─── Shared UI helpers ────────────────────────────────────────────────────────
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
          {laterPct > 12 && <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', whiteSpace: 'nowrap', paddingInline: 6 }}>+{formatCurrencyFull(creditLimit - withdrawNow)}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#254BCE' }} />
          <span style={{ fontSize: 10, color: '#9CA3AF' }}>Draw now</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(0,22,96,0.12)' }} />
          <span style={{ fontSize: 10, color: '#9CA3AF' }}>Available later</span>
        </div>
      </div>
    </div>
  )
}

// ─── Live summary panel v1 (legacy backup — swap OfferConfigSummary to restore) ─
function OfferConfigSummaryLegacy({
  product, draw, creditLim, apr, rate,
  basePayment, piPayment, ioPayment,
  effIoYrs, deferMo, redPct, redMonths, redPayment,
  newPrinc, origFee, s0Done,
}) {
  if (!s0Done) {
    return (
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,22,96,0.08)', padding: '28px 22px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,22,96,0.05)' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(37,75,206,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4"/>
            <path d="M8 12h8M12 8v8"/>
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Your loan plan</div>
        <div style={{ fontSize: 16, color: '#9CA3AF', lineHeight: 1.65 }}>Choose your loan type on the left to see your personalized payment plan here — it updates live as you make each selection.</div>
      </div>
    )
  }

  // Build payment phases from selections
  const phases = []
  // All phases use the same navy/blue style — tags carry the semantic meaning
  const phaseStyle = { color: '#254BCE', bg: 'rgba(37,75,206,0.05)', border: 'rgba(37,75,206,0.15)' }

  if (deferMo > 0) {
    phases.push({
      label: 'Months 1–6',
      tag: '$0 start',
      payment: 0,
      desc: 'No payment due · interest accrues',
      ...phaseStyle,
    })
  }
  if (effIoYrs > 0) {
    phases.push({
      label: `${effIoYrs}-yr interest-only`,
      tag: 'IO period',
      payment: ioPayment,
      desc: 'Interest only · no principal reduction',
      ...phaseStyle,
    })
  }
  if (redPct > 0) {
    phases.push({
      label: `${redMonths}-month reduced`,
      tag: `${redPct}% off`,
      payment: redPayment,
      desc: `${100 - redPct}% of full P+I payment`,
      ...phaseStyle,
    })
  }

  const specialMo   = effIoYrs * 12 + redMonths
  const remainMo    = TERM_MO - specialMo
  const remainYr    = Math.round(remainMo / 12)
  phases.push({
    label: `${remainYr}-yr full repayment`,
    tag: 'P+I',
    payment: piPayment,
    desc: 'Principal + interest · fixed schedule',
    ...phaseStyle,
    final: true,
  })

  const accrued = newPrinc - draw - origFee

  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,22,96,0.1)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,22,96,0.09)' }}>

      {/* Header band */}
      <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg, #001660 0%, #0d2380 100%)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>Live Plan Summary</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '0em' }}>{formatCurrencyFull(draw)}</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
            {product === 'heloc' ? 'HELOC draw' : 'HELOAN'}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          {product === 'heloc'
            ? `Credit line ${formatCurrencyFull(creditLim)} · min 80% drawn`
            : 'Fixed rate · full draw at closing'}
          {' · '}APR {apr}%
        </div>
      </div>

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Key stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {[
            { label: 'Initial draw',   value: formatCurrencyFull(draw)    },
            { label: 'APR',            value: `${apr}%`                   },
            { label: 'Rate',           value: `${rate}% ${product === 'heloan' ? 'fixed' : 'variable'}` },
            { label: 'Fee (rolled in)', value: formatCurrencyFull(origFee) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#F8F9FC', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#001660', letterSpacing: '0em', lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Baseline vs plan */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 8 }}>Your payment journey</div>

          {/* Baseline */}
          <div style={{ padding: '9px 13px', background: 'rgba(0,22,96,0.03)', border: '1px solid rgba(0,22,96,0.07)', borderRadius: 10, marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF' }}>Baseline — no options</div>
                <div style={{ fontSize: 10, color: '#C4C9D4', marginTop: 1 }}>P+I from day 1 · {TERM_MO / 12}-yr term</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#9CA3AF', letterSpacing: '0em' }}>
                {basePayment !== null ? formatCurrencyFull(basePayment) : '—'}
                <span style={{ fontSize: 10, fontWeight: 400, color: '#C4C9D4' }}>/mo</span>
              </div>
            </div>
          </div>

          {/* Phases */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {phases.map((ph, i) => (
              <div key={i} style={{ padding: '9px 13px', background: ph.bg, border: `1px solid ${ph.border}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ph.color }}>{ph.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: ph.color, background: 'rgba(37,75,206,0.1)', borderRadius: 4, padding: '1px 6px' }}>{ph.tag}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>{ph.desc}</div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span style={{ fontSize: ph.payment === 0 ? 18 : 15, fontWeight: 900, color: ph.color, letterSpacing: '0em' }}>
                      {ph.payment === 0 ? '$0' : ph.payment != null ? formatCurrencyFull(ph.payment) : '—'}
                    </span>
                    {ph.payment !== 0 && ph.payment != null && (
                      <span style={{ fontSize: 10, fontWeight: 400, color: '#9CA3AF' }}>/mo</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accrued interest note */}
        {accrued > 0 && (
          <div style={{ padding: '9px 13px', background: 'rgba(234,179,8,0.04)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 3 }}>Balance after $0 period</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#92400e', letterSpacing: '0em' }}>{formatCurrencyFull(newPrinc)}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Includes {formatCurrencyFull(accrued)} accrued interest</div>
          </div>
        )}

        {/* Lender attribution */}
        <div style={{ paddingTop: 12, borderTop: '1px solid rgba(0,22,96,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            Financing by <span style={{ fontWeight: 700, color: '#374151' }}>Grand Bank</span>
          </div>
          <div style={{ fontSize: 10, color: '#B0B7C3' }}>NMLS #2611</div>
        </div>
      </div>
    </div>
  )
}

// ─── Live summary panel v2 — narrative timeline ──────────────────────────────
function OfferConfigSummary({
  product, draw, creditLim, apr, rate,
  basePayment, piPayment, ioPayment,
  effIoYrs, deferMo, redPct, redMonths, redPayment,
  newPrinc, origFee, s0Done, allDone, onConfirm, onReset,
}) {
  if (!s0Done) {
    return (
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,22,96,0.08)', padding: '32px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,22,96,0.05)' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(37,75,206,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Your loan plan</div>
        <div style={{ fontSize: 16, color: '#9CA3AF', lineHeight: 1.65 }}>Choose your loan type on the left to see your personalized payment plan here — it updates live as you make each selection.</div>
      </div>
    )
  }

  // ── Build timeline entries ────────────────────────────────────────────────
  const timeline = []
  let seq = 0  // sequence counter for natural-language labels

  function timeLabel(duration) {
    const prefix = seq === 0 ? 'First' : seq === 1 ? 'Next' : seq === 2 ? 'Then' : 'After that'
    seq++
    return duration ? `${prefix} ${duration}` : prefix
  }

  if (deferMo > 0) {
    const deferAccrued = Math.round((draw * FEE_PCT + draw) * (rate / 100 / 12) * 6)
    timeline.push({
      label: timeLabel('6 months'),
      payment: 0,
      note: 'No payments due',
      sub: `+${formatCurrencyFull(deferAccrued)} is added to your loan balance during this time`,
    })
  }
  if (effIoYrs > 0) {
    timeline.push({
      label: timeLabel(`${effIoYrs} year${effIoYrs !== 1 ? 's' : ''}`),
      payment: ioPayment,
      note: 'You only pay interest — your loan balance stays about the same',
    })
  }
  if (redPct > 0 && redMonths > 0) {
    timeline.push({
      label: timeLabel(`${redMonths} months`),
      payment: redPayment,
      note: `${redPct}% less than your full payment — a stepping stone before you reach ${formatCurrencyFull(piPayment)}/mo`,
    })
  }

  // Full repayment (always last)
  const specialMo = effIoYrs * 12 + redMonths
  const remainMo  = TERM_MO - specialMo
  const remainYrs = Math.round(remainMo / 12)
  const finalLabel = seq === 0 ? `For ${remainYrs} years` : timeLabel()
  timeline.push({
    label: finalLabel,
    payment: piPayment,
    note: `Full monthly payments until your loan is paid off`,
    final: true,
  })

  const accrued = newPrinc - draw - origFee

  // Dot colors — soft progression from teal → blue → navy
  const dotColors = ['#016163', '#254BCE', '#1e3fa8', '#001660']
  const getDot = i => dotColors[Math.min(i, dotColors.length - 1)]

  // Narrative headline
  const hasSpecial = deferMo > 0 || effIoYrs > 0 || redPct > 0
  const narrative = hasSpecial
    ? 'Your payments start low, then gradually increase over time.'
    : 'Your payments stay the same every month for the life of the loan.'

  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,22,96,0.1)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,22,96,0.09)' }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 22px 18px', background: 'linear-gradient(135deg, #001660 0%, #0d2380 100%)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)', marginBottom: 12 }}>Your Loan Plan</div>

        {accrued > 0 ? (
          /* ── Breakdown: deferred start chosen ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Row 1 — You receive (PRIMARY) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>You receive</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '0em' }}>{formatCurrencyFull(draw)}</span>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />

            {/* Row 2 — Added for payment break (SECONDARY) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.45)', lineHeight: 1.45, flex: 1 }}>To let you skip payments for the first 6 months, this amount is added to your loan and will be held in escrow</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#fbbf24', letterSpacing: '0em', flexShrink: 0 }}>+{formatCurrencyFull(accrued)}</span>
            </div>

            {/* Row 3 — Total starting loan (LABELED) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.15)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Total starting loan</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: '0em' }}>{formatCurrencyFull(newPrinc)}</span>
            </div>

            {/* Product + APR */}
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {product === 'heloc' ? 'HELOC' : 'HELOAN'} · {apr}% APR
              {product === 'heloc' && creditLim > draw && ` · ${formatCurrencyFull(creditLim - draw)} available to draw anytime`}
            </div>
          </div>
        ) : (
          /* ── Standard: no deferred period ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '0em' }}>
              {formatCurrencyFull(draw)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
              {product === 'heloc' ? 'HELOC' : 'HELOAN'} · {apr}% APR
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>
              {product === 'heloc'
                ? `${formatCurrencyFull(creditLim)} credit line · ${formatCurrencyFull(draw)} drawn at closing`
                : 'Fixed rate · full amount disbursed at closing'}
            </div>
            {product === 'heloc' && creditLim > draw && (
              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 100, padding: '3px 10px', width: 'fit-content' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#93DDBA" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{formatCurrencyFull(creditLim - draw)} available to draw anytime</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Narrative ────────────────────────────────────────────── */}
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#374151', lineHeight: 1.6 }}>
          {narrative}
        </p>

        {/* ── Timeline ─────────────────────────────────────────────── */}
        <div style={{ position: 'relative', paddingLeft: 2 }}>
          {/* Vertical connecting line */}
          <div style={{
            position: 'absolute', left: 7, top: 12, bottom: 12, width: 2,
            background: 'linear-gradient(to bottom, #93DDBA 0%, #254BCE 50%, #001660 100%)',
            borderRadius: 2, opacity: 0.4,
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {timeline.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: i < timeline.length - 1 ? 22 : 0 }}>
                {/* Dot */}
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                  background: getDot(i),
                  boxShadow: `0 0 0 4px ${i === 0 ? 'rgba(1,97,99,0.1)' : 'rgba(37,75,206,0.1)'}`,
                  position: 'relative', zIndex: 1,
                }} />

                {/* Content */}
                <div style={{ flex: 1 }}>
                  {/* Time label */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                    {step.label}
                  </div>
                  {/* Payment — hero number */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 5 }}>
                    <span style={{
                      fontSize: step.payment === 0 ? 30 : 26,
                      fontWeight: 900,
                      color: step.final ? '#001660' : getDot(i),
                      letterSpacing: '0em',
                      lineHeight: 1,
                    }}>
                      {step.payment === 0 ? '$0' : step.payment != null ? formatCurrencyFull(step.payment) : '—'}
                    </span>
                    {step.payment !== 0 && step.payment != null && (
                      <span style={{ fontSize: 16, color: '#9CA3AF', fontWeight: 500 }}>/month</span>
                    )}
                  </div>
                  {/* Plain-English note */}
                  <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
                    {step.note}
                  </div>
                  {/* Sub-note (e.g. accrued interest on $0 period) */}
                  {step.sub && (
                    <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, color: '#92400e', background: 'rgba(234,179,8,0.07)', borderRadius: 7, padding: '4px 8px', display: 'inline-block' }}>
                      {step.sub}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Lender ───────────────────────────────────────────────── */}
        <div style={{ paddingTop: 4, borderTop: '1px solid rgba(0,22,96,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            Financing by <span style={{ fontWeight: 700, color: '#374151' }}>Grand Bank</span>
          </div>
          <div style={{ fontSize: 10, color: '#B0B7C3' }}>NMLS #2611</div>
        </div>

        {/* ── Demo reset link ───────────────────────────────────────── */}
      </div>
    </div>
  )
}

// ─── Decision card wrapper ────────────────────────────────────────────────────
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

      {/* Card header row */}
      <div style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#fff',
        transition: 'background 0.3s ease',
        cursor: answered && !editing ? 'default' : 'default',
      }}>
        {/* Step circle */}
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

        {/* Title or answered summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {answered && !editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#001660', flex: 1, minWidth: 0 }}>{summary}</span>
              <button onClick={onEdit} style={{ fontSize: 12, fontWeight: 600, color: '#254BCE', background: 'rgba(37,75,206,0.08)', border: 'none', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(37,75,206,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(37,75,206,0.08)'}>
                Edit
              </button>
            </div>
          ) : answered && editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#001660', flex: 1, minWidth: 0, lineHeight: 1.35 }}>{title}</span>
              <button onClick={onClose} style={{ fontSize: 12, fontWeight: 600, color: '#016163', background: 'rgba(1,97,99,0.08)', border: 'none', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
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

      {/* Body — animated expand/collapse using CSS grid trick */}
      <div style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '0 18px 18px',
            borderTop: '1px solid rgba(0,22,96,0.07)',
            paddingTop: 16,
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

// ─── Main screen component ────────────────────────────────────────────────────
export default function ScreenOfferSelect({ step2, step1, dispatch, savedConfig }) {
  // ── Decision state — initialised from savedConfig so navigating away and back preserves choices ──
  const [product,        setProduct]        = useState(savedConfig?.product     ?? null)
  const [creditLim,      setCreditLim]      = useState(savedConfig?.creditLim   ?? SEED.defaultCredit)
  const [drawAmt,        setDrawAmt]        = useState(savedConfig?.drawAmt     ?? SEED.defaultWithdraw)
  const [amtDone,        setAmtDone]        = useState(savedConfig?.amtDone     ?? false)
  const [zeroStart,      setZeroStart]      = useState(savedConfig?.zeroStart   ?? null)
  const [ioYrs,          setIoYrs]          = useState(savedConfig?.ioYrs       ?? null)
  const [redOpt,         setRedOpt]         = useState(savedConfig?.redOpt      ?? null)
  const [editingCard,    setEditingCard]    = useState(null)
  // HELOAN: payment start toggle within the merged amount card
  const [heloanPayStart, setHeloanPayStart] = useState(savedConfig?.zeroStart === true)

  // ── Persist choices back to POSDemo state whenever anything changes ─────────
  useEffect(() => {
    dispatch({ type: 'SAVE_STEP2_CONFIG', config: { product, creditLim, drawAmt, amtDone, zeroStart, ioYrs, redOpt } })
  }, [product, creditLim, drawAmt, amtDone, zeroStart, ioYrs, redOpt]) // eslint-disable-line

  // ── Step unlock ─────────────────────────────────────────────────────────────
  const s0Done  = product !== null
  const s1Done  = s0Done && amtDone
  const s2Done  = s1Done && zeroStart !== null
  const s3Done  = s2Done && ioYrs !== null
  const s4Done  = s3Done && redOpt !== null
  const allDone = s4Done

  // ── Derived loan numbers ────────────────────────────────────────────────────
  const rate     = product === 'heloan' ? HELOAN_RATE : HELOC_RATE
  const minDraw  = product === 'heloc'  ? Math.ceil(creditLim * 0.8) : creditLim
  const safeDraw = product === 'heloan' ? creditLim : Math.max(drawAmt, minDraw)

  const origFee  = Math.round(safeDraw * FEE_PCT)
  const enhPrinc = safeDraw + origFee
  const apr      = (rate + FEE_PCT * 100 * 0.08).toFixed(2)

  // HELOAN: when deferring 6 months, some loan capacity is reserved for interest
  // max_cash = MAX_CR / (1 + rate/12*6)
  const HELOAN_MAX_DEFERRED = Math.floor(SEED.maxCredit / (1 + HELOAN_RATE / 100 / 12 * 6))
  const heloanEffectiveMax  = (product === 'heloan' && heloanPayStart) ? HELOAN_MAX_DEFERRED : SEED.maxCredit

  const deferMo = zeroStart === true ? 6 : 0
  const accrued = deferMo > 0 ? Math.round(enhPrinc * (rate / 100 / 12) * deferMo) : 0
  const newPrinc = enhPrinc + accrued

  const effIoYrs  = (ioYrs && ioYrs > 0) ? ioYrs : 0
  const ioMo      = effIoYrs * 12
  const repayMo   = TERM_MO - ioMo
  const ioPayment = ioMo > 0 ? Math.round(newPrinc * (rate / 100 / 12)) : null

  function calcPI(princ, months) {
    const r = rate / 100 / 12
    if (r === 0) return Math.round(princ / months)
    return Math.round(princ * r / (1 - Math.pow(1 + r, -months)))
  }

  const basePayment = product ? calcPI(safeDraw, TERM_MO) : null
  const piPayment   = product ? calcPI(newPrinc, repayMo) : null

  // ── Reduced-payment options — constrained by IO length ──────────────────────
  const redOptsList = (() => {
    const all = [
      { id: 'none', label: 'No reduction', pct: 0,  months: 0,  desc: 'Full payment from day one' },
      { id: '10',   label: '10% off',      pct: 10, months: 12, desc: 'for 12 months' },
      { id: '20',   label: '20% off',      pct: 20, months: 12, desc: 'for 12 months' },
      { id: '30',   label: '30% off',      pct: 30, months: 6,  desc: 'for 6 months'  },
    ]
    if (effIoYrs >= 5) return all.slice(0, 1)  // only "none"
    if (effIoYrs >= 4) return all.slice(0, 3)  // no 30%
    return all
  })()

  // Auto-select 'none' when IO=5 leaves no real choice for reduced payment
  useEffect(() => {
    if (s2Done && effIoYrs >= 5 && redOpt === null) setRedOpt('none')
  }, [effIoYrs, s2Done, redOpt])

  const selRed     = redOptsList.find(o => o.id === redOpt)
  const redPct     = selRed ? selRed.pct : 0
  const redMonths  = selRed ? selRed.months : 0
  const redPayment = redPct > 0 ? Math.round(piPayment * (1 - redPct / 100)) : null

  // ── Edit handler — opens the card without touching any other answers ────────
  function goEdit(cardIndex) {
    setEditingCard(cardIndex)
    // When re-editing the HELOAN merged card, sync toggle to current zeroStart
    if (cardIndex === 1 && product === 'heloan') setHeloanPayStart(zeroStart === true)
  }

  // ── Close the currently-editing card ────────────────────────────────────────
  function closeEdit() {
    setEditingCard(null)
  }

  // ── Reset step (demo only) ──────────────────────────────────────────────────
  function handleReset() {
    setProduct(null); setCreditLim(SEED.defaultCredit); setDrawAmt(SEED.defaultWithdraw)
    setAmtDone(false); setZeroStart(null); setIoYrs(null); setRedOpt(null); setEditingCard(null)
    dispatch({ type: 'SAVE_STEP2_CONFIG', config: null })
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  function handleConfirm() {
    const s2Save = { creditLimit: creditLim, withdrawNow: safeDraw, tier: 0, deferredMonths: deferMo, autopay: true }
    const loanObj = {
      creditLimit: creditLim, withdrawNow: safeDraw,
      rate, apr, originationFee: origFee,
      drawPayment:  ioPayment ?? piPayment,
      repayPayment: piPayment,
      deferredMonths: deferMo,
      availableAfter: creditLim - safeDraw,
      ioYears: effIoYrs,
      redPct, redMonths,
      productType: product,
    }
    dispatch({ type: 'NEXT', step2: s2Save, loan: loanObj })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* Page header — full width, above the two-column layout */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, fontFamily: "'SharpSans', sans-serif" }}>
          Configure Your Offer · Step 2 of 7
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 5 }}>
          <h1 style={{ fontSize: 25, fontWeight: 700, color: '#001660', margin: 0, letterSpacing: '0em', fontFamily: "'PostGrotesk', sans-serif" }}>
            Build your loan, one step at a time
          </h1>
          <button
            onClick={handleReset}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: '#C4C9D4', whiteSpace: 'nowrap', flexShrink: 0, transition: 'color 0.15s' }}
            onMouseOver={e => e.currentTarget.style.color = '#9CA3AF'}
            onMouseOut={e => e.currentTarget.style.color = '#C4C9D4'}
          >
            ↺ Reset this step · demo only
          </button>
        </div>
        <p style={{ fontSize: 17, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
          Answer each question — your plan summary updates live on the right.
        </p>
      </div>

      {/* Two-column: cards left, summary right — both start at the same top line */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

      {/* ─────────────── Left: decision flow ─────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Card 1: Product type ────────────────────────────────────── */}
        <DecCard
          step={1}
          title="What type of financing works best for you?"
          answered={s0Done}
          editing={editingCard === 0}
          summary={product === 'heloc' ? 'HELOC — flexible line of credit' : 'HELOAN — fixed rate, lump sum'}
          onEdit={() => goEdit(0)}
          onClose={closeEdit}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              {
                id: 'heloc',
                name: 'HELOC',
                badge: `${HELOC_RATE}% APR · Variable`,
                desc: 'A revolving credit line. Draw what you need at closing — the rest stays available. Rate adjusts with the market.',
              },
              {
                id: 'heloan',
                name: 'HELOAN',
                badge: `${HELOAN_RATE}% APR · Fixed`,
                desc: 'A fixed-rate lump sum disbursed at closing. One stable payment for the full life of the loan.',
              },
            ].map(({ id, name, badge, desc }) => {
              const active = product === id
              return (
                <button
                  key={id}
                  onClick={() => {
                    setProduct(id)
                    if (id === 'heloan') setDrawAmt(creditLim)
                    if (editingCard === null) closeEdit()
                  }}
                  style={{
                    padding: '16px', borderRadius: 13, cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                    background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC',
                    boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                    transition: 'all 0.15s', outline: 'none',
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: active ? '#254BCE' : '#001660', marginBottom: 6 }}>{name}</div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center',
                      background: active ? 'rgba(37,75,206,0.12)' : 'rgba(0,22,96,0.07)',
                      borderRadius: 100, padding: '2px 9px',
                      fontSize: 11, fontWeight: 600, color: active ? '#254BCE' : '#6B7280',
                    }}>
                      {badge}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.55 }}>{desc}</div>
                </button>
              )
            })}
          </div>
        </DecCard>

        {/* ── Card 2: Amount ──────────────────────────────────────────── */}
        {s0Done && (
          <DecCard
            step={2}
            title={product === 'heloc' ? 'Set your credit line and initial draw' : 'How much would you like to borrow?'}
            answered={product === 'heloan' ? (s1Done && zeroStart !== null) : s1Done}
            editing={editingCard === 1}
            summary={
              product === 'heloc'
                ? `Credit line ${formatCurrencyFull(creditLim)} · Draw ${formatCurrencyFull(safeDraw)} at closing`
                : `${formatCurrencyFull(creditLim)} · ${zeroStart ? 'first payment month 7' : 'payments begin right away'}`
            }
            onEdit={() => goEdit(1)}
            onClose={closeEdit}
          >
            {product === 'heloan' ? (
              /* ── HELOAN: merged amount + payment start ── */
              <div>
                {/* Loan amount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#001660' }}>Loan amount</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#254BCE', letterSpacing: '0em' }}>{formatCurrencyFull(Math.min(creditLim, heloanEffectiveMax))}</div>
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
                  Full amount disbursed at closing. Fixed rate for the life of the loan.
                  {heloanPayStart && creditLim > heloanEffectiveMax && (
                    <span style={{ color: '#92400e', fontWeight: 600 }}> Maximum is {formatCurrencyFull(heloanEffectiveMax)} when deferring payments.</span>
                  )}
                </div>
                <RangeSlider
                  value={Math.min(creditLim, heloanEffectiveMax)}
                  min={SEED.minCredit}
                  max={heloanEffectiveMax}
                  step={5000}
                  onChange={v => { setCreditLim(v); setDrawAmt(v) }}
                  formatLabel={v => formatCurrencyFull(v)}
                />

                {/* Payment start toggle */}
                <div style={{ marginTop: 20, padding: '16px', background: '#F8F9FC', borderRadius: 12, border: '1px solid rgba(0,22,96,0.07)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#001660', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>When do payments start?</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[
                      { val: false, label: 'Start now',           sub: 'First payment next month' },
                      { val: true,  label: 'Start in 6 months',   sub: 'First payment month 7'    },
                    ].map(({ val, label, sub }) => {
                      const active = heloanPayStart === val
                      return (
                        <button
                          key={String(val)}
                          onClick={() => {
                            setHeloanPayStart(val)
                            // Clamp creditLim if switching to deferred and current value is too high
                            const newMax = val ? HELOAN_MAX_DEFERRED : SEED.maxCredit
                            if (creditLim > newMax) { setCreditLim(newMax); setDrawAmt(newMax) }
                          }}
                          style={{
                            padding: '11px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                            border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                            background: active ? 'rgba(37,75,206,0.06)' : '#fff',
                            boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                            transition: 'all 0.15s', outline: 'none',
                          }}
                        >
                          <div style={{ width: 13, height: 13, borderRadius: '50%', marginBottom: 8, border: `2px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.2)'}`, background: active ? '#254BCE' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: active ? '#254BCE' : '#001660', marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>{sub}</div>
                        </button>
                      )
                    })}
                  </div>
                  {/* Helper text */}
                  <div style={{ fontSize: 12, color: heloanPayStart ? '#92400e' : '#6B7280', lineHeight: 1.6, padding: '8px 10px', background: heloanPayStart ? 'rgba(234,179,8,0.06)' : 'rgba(37,75,206,0.04)', borderRadius: 8, border: `1px solid ${heloanPayStart ? 'rgba(234,179,8,0.18)' : 'rgba(37,75,206,0.08)'}` }}>
                    {heloanPayStart
                      ? `You won't make payments for the first 6 months. Part of your loan is reserved to cover those payments, which reduces how much you can borrow to ${formatCurrencyFull(HELOAN_MAX_DEFERRED)}.`
                      : 'You begin payments immediately, so your full loan amount is available to you.'
                    }
                  </div>
                </div>

                <button
                  onClick={() => {
                    const clamped = Math.min(creditLim, heloanEffectiveMax)
                    setCreditLim(clamped); setDrawAmt(clamped)
                    setZeroStart(heloanPayStart)
                    setAmtDone(true)
                    if (editingCard === null) closeEdit()
                  }}
                  style={{ marginTop: 16, width: '100%', padding: '12px', borderRadius: 11, fontSize: 17, fontWeight: 700, background: '#254BCE', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 3px 14px rgba(37,75,206,0.3)' }}
                >
                  Confirm {formatCurrencyFull(Math.min(creditLim, heloanEffectiveMax))} →
                </button>
              </div>
            ) : (
              <div>
                {/* Credit line */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#001660' }}>Total credit line</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#001660', letterSpacing: '0em' }}>{formatCurrencyFull(creditLim)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>Your approved maximum. You only pay interest on what you draw.</div>
                  <RangeSlider
                    value={creditLim} min={SEED.minCredit} max={SEED.maxCredit} step={5000}
                    onChange={v => { setCreditLim(v); if (drawAmt > v) setDrawAmt(v) }}
                    formatLabel={v => formatCurrencyFull(v)}
                  />
                </div>

                {/* Initial draw */}
                <div style={{ padding: '14px 16px', background: 'rgba(37,75,206,0.04)', border: '1px solid rgba(37,75,206,0.1)', borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#001660' }}>Initial draw at closing</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#254BCE', letterSpacing: '0em' }}>{formatCurrencyFull(safeDraw)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>Minimum 80% of your credit line. The remainder stays available to draw anytime.</div>
                  <RangeSlider
                    value={Math.max(drawAmt, minDraw)} min={minDraw} max={creditLim} step={5000}
                    onChange={v => setDrawAmt(v)}
                    formatLabel={v => formatCurrencyFull(v)}
                  />
                  <CreditBar withdrawNow={safeDraw} creditLimit={creditLim} />
                </div>

                <button
                  onClick={() => { setAmtDone(true); closeEdit() }}
                  style={{ width: '100%', padding: '12px', borderRadius: 11, fontSize: 17, fontWeight: 700, background: '#254BCE', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 3px 14px rgba(37,75,206,0.3)' }}
                >
                  Confirm — draw {formatCurrencyFull(safeDraw)} →
                </button>
              </div>
            )}
          </DecCard>
        )}

        {/* ── Card 3: $0 start — HELOC only (HELOAN handles this inside Card 2) ── */}
        {s1Done && product === 'heloc' && (
          <DecCard
            step={3}
            title="Would you like your first 6 months payment-free?"
            answered={s2Done}
            editing={editingCard === 2}
            summary={zeroStart ? 'Yes — first payment starts in month 7' : 'No — payments begin right away'}
            onEdit={() => goEdit(2)}
            onClose={closeEdit}
          >
            {(() => {
              const deferAccrued = Math.round(enhPrinc * (rate / 100 / 12) * 6)
              const tiles = [
                {
                  val: true,
                  label: 'Yes — no payments for 6 months',
                  benefit: 'Your solar savings kick in right away and you have 6 months before you owe anything.',
                  impact: `A small amount gets added to your loan balance during those 6 months`,
                  impactColor: '#92400e',
                  impactBg: 'rgba(234,179,8,0.06)',
                },
                {
                  val: false,
                  label: 'No — start paying right away',
                  benefit: 'You begin paying down your loan immediately — nothing extra gets added to your balance.',
                  impact: `Your loan balance stays exactly as agreed — nothing extra added`,
                  impactColor: '#016163',
                  impactBg: 'rgba(1,97,99,0.06)',
                },
              ]
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {tiles.map(({ val, label, benefit, impact, impactColor, impactBg }) => {
                    const active = zeroStart === val
                    return (
                      <button
                        key={String(val)}
                        onClick={() => { setZeroStart(val); if (editingCard === null) closeEdit() }}
                        style={{
                          padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                          border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                          background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC',
                          boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                          transition: 'all 0.15s', outline: 'none', display: 'flex', flexDirection: 'column', gap: 8,
                        }}
                      >
                        {/* Radio dot */}
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.2)'}`, background: active ? '#254BCE' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        {/* Label */}
                        <div style={{ fontSize: 17, fontWeight: 700, color: active ? '#254BCE' : '#001660', lineHeight: 1.3 }}>{label}</div>
                        {/* Plain-English benefit */}
                        <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{benefit}</div>
                        {/* Concrete impact */}
                        <div style={{ fontSize: 11, fontWeight: 600, color: impactColor, background: impactBg, borderRadius: 7, padding: '5px 9px', lineHeight: 1.45 }}>
                          {impact}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
            <div style={{ padding: '11px 14px', background: 'rgba(1,97,99,0.05)', border: '1px solid rgba(1,97,99,0.16)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#016163', marginBottom: 3 }}>How this works</div>
              <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.65 }}>
                Your solar system starts generating savings from day one. This option gives those savings time to accumulate before your first payment is due. Interest accrues during this period and is added to your balance.
              </div>
            </div>
          </DecCard>
        )}

        {/* ── Card 4: Interest-only period — fixed at 5 yrs for both HELOC and HELOAN ── */}
        {s2Done && (
          /* Fixed 5-yr informational block — acknowledged by "I understand" button */
            <div style={{
              background: s3Done ? 'rgba(1,97,99,0.03)' : '#fff',
              borderRadius: 16, overflow: 'hidden',
              border: `1.5px solid ${s3Done ? 'rgba(1,97,99,0.22)' : 'rgba(0,22,96,0.1)'}`,
              boxShadow: s3Done ? 'none' : '0 2px 14px rgba(0,22,96,0.06)',
              transition: 'all 0.2s',
            }}>
              {/* Header */}
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: s3Done ? 'rgba(1,97,99,0.03)' : '#fff' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: s3Done ? '#016163' : '#254BCE', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                  {s3Done
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>4</span>
                  }
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#001660' }}>First 5 years: lower payments</div>
              </div>
              {/* Body */}
              <div style={{ padding: '14px 18px 18px', borderTop: '1px solid rgba(0,22,96,0.07)' }}>
                <p style={{ margin: '0 0 8px', fontSize: 16, color: '#374151', lineHeight: 1.65 }}>
                  For the first 5 years, you'll make lower monthly payments that cover interest only. Your loan balance stays about the same during this time.
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6B7280', lineHeight: 1.55 }}>
                  After this period, your regular payments begin and you start paying down your loan.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(1,97,99,0.07)', borderRadius: 100, padding: '4px 11px', marginBottom: s3Done ? 0 : 16 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#016163" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#016163' }}>This is part of how your loan works — not a choice you make</span>
                </div>
                {!s3Done && (
                  <div>
                    <button
                      onClick={() => setIoYrs(5)}
                      style={{
                        padding: '10px 22px', borderRadius: 10, fontSize: 17, fontWeight: 700,
                        background: '#016163', border: 'none', color: '#fff', cursor: 'pointer',
                        boxShadow: '0 3px 12px rgba(1,97,99,0.3)', transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 16px rgba(1,97,99,0.4)' }}
                      onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 3px 12px rgba(1,97,99,0.3)' }}
                    >
                      I understand
                    </button>
                  </div>
                )}
              </div>
            </div>
        )}

        {/* ── Card 5: Reduced payment ──────────────────────────────────── */}
        {s3Done && redOptsList.length > 1 && (
          <DecCard
            step={5}
            title="Would you like a reduced payment period to ease in?"
            answered={s4Done}
            editing={editingCard === 4}
            summary={
              !redOpt || redOpt === 'none'
                ? 'No — full payment from the start'
                : `${redOpt}% off for ${selRed?.months ?? 0} months`
            }
            onEdit={() => goEdit(4)}
            onClose={closeEdit}
          >
            <div style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.55, marginBottom: 14 }}>
              Instead of jumping straight to the full payment, you can ease in with a smaller amount for a few months. A little extra gets added to your loan balance during this time, but it gives you breathing room while you adjust.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))', gap: 10 }}>
              {redOptsList.map(({ id, label, months, desc }) => {
                const active = redOpt === id
                return (
                  <button
                    key={id}
                    onClick={() => { setRedOpt(id); if (editingCard === null) closeEdit() }}
                    style={{
                      padding: '14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                      border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                      background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC',
                      boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                      transition: 'all 0.15s', outline: 'none',
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 800, color: active ? '#254BCE' : '#001660', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{months > 0 ? `${months} months` : desc}</div>
                  </button>
                )
              })}
            </div>
          </DecCard>
        )}

        {/* Trust signals */}
        {s1Done && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {['No obligation', 'No hard pull yet', 'Takes ~5 minutes'].map(t => (
                <div key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid rgba(0,22,96,0.09)', borderRadius: 100, padding: '4px 11px' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#016163" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
              Estimates are illustrative only. Final terms subject to full underwriting and property appraisal. Not a commitment to lend.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ paddingTop: 16, borderTop: '1px solid rgba(0,22,96,0.08)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => dispatch({ type: 'BACK' })}
            style={{ padding: '10px 20px', fontSize: 17, fontWeight: 600, borderRadius: 10, border: '1.5px solid rgba(0,22,96,0.15)', background: 'none', color: '#001660', cursor: 'pointer' }}
          >
            ← Back
          </button>
          {allDone && (
            <button
              onClick={handleConfirm}
              style={{ padding: '11px 26px', fontSize: 17, fontWeight: 800, borderRadius: 11, background: '#254BCE', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,75,206,0.35)', transition: 'transform 0.15s' }}
              onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseOut={e => (e.currentTarget.style.transform = '')}
            >
              Confirm your plan →
            </button>
          )}
        </div>

      </div>{/* end left */}

      {/* ─────────────── Right: sticky live summary ───────────────────── */}
      <div style={{ width: 296, flexShrink: 0, position: 'sticky', top: 24 }}>
        <OfferConfigSummary
          product={product}
          draw={safeDraw}
          creditLim={creditLim}
          apr={apr}
          rate={rate}
          basePayment={basePayment}
          piPayment={piPayment}
          ioPayment={ioPayment}
          effIoYrs={effIoYrs}
          deferMo={deferMo}
          redPct={redPct}
          redMonths={redMonths}
          redPayment={redPayment}
          newPrinc={newPrinc}
          origFee={origFee}
          s0Done={s0Done}
          allDone={allDone}
          onConfirm={handleConfirm}
          onReset={handleReset}
        />
      </div>

      </div>{/* end two-column */}
    </div>
  )
}
