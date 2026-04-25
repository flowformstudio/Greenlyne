/**
 * ScreenOfferSelect — Step 2 "Select Offer" (v4 — recommended-first with custom advanced)
 *
 * Flow:
 *   1. Show two bookend offers (baseline + recommended) — user must pick one
 *   2. Selecting a plan reveals the terms of offer + major confirm action
 *   3. "Create custom plan (advanced)" expands customization dials + a third Custom tile
 *
 * Math source: merchant_escrow_powered_HELOC_04_19_2026_ver_0.9_sxm.pdf (Appendix A)
 */

import { useState, useEffect, useMemo } from 'react'
import {
  calcRate, calcEscrowLoan,
  formatCurrencyFull,
  AMORT_TERM_MO, ORIGINATION_FEE,
} from '../lib/loanCalc'

// ─── Borrower fixtures ────────────────────────────────────────────────────────
const DEMO_FICO      = 740
const PROP_VALUE     = 485_000
const MORTGAGE_BAL   = 190_000
const APPLICATION_ID = '1-26022-1758'

const LOAN_CAP_LOW_LTV  = 150_000
const LOAN_CAP_HIGH_LTV = 100_000
const LOAN_MIN          = 25_000

const SEED = {
  minCredit:        LOAN_MIN,
  maxCredit:        LOAN_CAP_LOW_LTV,
  defaultCredit:    120_000,
  defaultWithdraw:  96_000,
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

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
  navy:   '#001660',
  blue:   '#254BCE',
  blueHi: '#1E3FA8',
  teal:   '#016163',
  green:  '#10B981',
  red:    '#DC2626',
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

// ─── Effective APR via Newton IRR ─────────────────────────────────────────────
function effectiveAPR(fundsReceived, paymentSchedule) {
  let r = 0.007 // ~8.4% annual starting guess
  for (let iter = 0; iter < 80; iter++) {
    let pv = 0, dPv = 0
    for (let i = 0; i < paymentSchedule.length; i++) {
      const t    = i + 1
      const p    = paymentSchedule[i]
      const disc = Math.pow(1 + r, t)
      pv  += p / disc
      dPv += -t * p / (disc * (1 + r))
    }
    const f = pv - fundsReceived
    if (Math.abs(dPv) < 1e-12) break
    const step = f / dPv
    r -= step
    if (r < 0) r = 0.0001
    if (Math.abs(step) < 1e-9) break
  }
  return r * 12
}

// Build full 360-month payment schedule from calc + preset
function buildSchedule(calc, preset) {
  const { B, Red_IO, IO_custom, PI_custom } = calc
  const n1    = preset.zeroStart ? 6 : 0
  const ioMo  = preset.ioYrs * 12
  const redMo = (preset.reductionYrs ?? preset.ioYrs) * 12
  const s     = preset.s ?? 0
  const schedule = []
  const N = AMORT_TERM_MO + ioMo
  for (let t = 1; t <= N; t++) {
    if (t <= n1)              schedule.push(0)
    else if (t <= ioMo)       schedule.push(s > 0 && t <= redMo ? Red_IO : IO_custom)
    else                      schedule.push(PI_custom || B)
  }
  return schedule
}

// Compute all metrics for a given offer preset
function computeOffer({ C, rate, preset }) {
  const n1    = preset.zeroStart ? 6 : 0
  const redMo = (preset.reductionYrs ?? preset.ioYrs) * 12
  const s     = preset.s ?? 0
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

  // Active monthly payment — the one the borrower sees most of the ramp-up
  let activeMonthly
  if (s > 0)              activeMonthly = calc.Red_IO
  else if (preset.ioYrs > 0) activeMonthly = calc.IO_custom
  else                    activeMonthly = calc.B

  // Sub-line describing the payment phase
  let phaseSub = 'Full P+I until paid off'
  if (n1 > 0) phaseSub = `$0/mo for first ${n1} months`
  else if (preset.ioYrs > 0) phaseSub = s > 0
    ? `Reduced IO for ${preset.reductionYrs ?? preset.ioYrs} yrs`
    : `Interest-only for ${preset.ioYrs} yrs`

  return {
    C,
    rate,
    loanAmount: calc.L,
    monthly:    activeMonthly,
    fullPI:     calc.PI_custom || calc.B,
    apr,
    phaseSub,
    origFee:    calc.origFee,
    totalEscrow: calc.totalEscrow,
    schedule,
    calc,
  }
}

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

// ─── Decision card (used in advanced section) ─────────────────────────────────
function DecCard({ step, title, summary, onEdit, onClose, editing, modified, children }) {
  const isOpen = editing
  const showModified = modified

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
      {showModified && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: `linear-gradient(180deg, ${T.blue} 0%, ${T.navy} 100%)`,
          borderRadius: '12px 0 0 12px',
        }} />
      )}

      <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12, paddingLeft: showModified ? 26 : 22 }}>
        <div style={{
          width: 29, height: 29, borderRadius: '50%', flexShrink: 0,
          background: isOpen || showModified ? T.blue : T.line,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
          boxShadow: showModified && !isOpen ? '0 0 0 3px rgba(37,75,206,0.14)' : 'none',
        }}>
          {showModified && !isOpen ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <span style={{ fontSize: 14, fontWeight: 700, color: isOpen ? T.white : T.muted }}>{step}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: showModified ? T.blue : T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                  {title}
                </div>
                <div style={{ fontSize: 17, fontWeight: 500, color: T.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            padding: '16px 22px 22px',
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

// ─── Picker bodies ────────────────────────────────────────────────────────────
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
                padding: '14px', borderRadius: 11, cursor: 'pointer', textAlign: 'left',
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

// ─── Plan Selected badge ──────────────────────────────────────────────────────
function PlanSelectedBadge({ dark = false }) {
  const fg = dark ? T.white : T.white
  const bg = dark ? 'rgba(16,185,129,0.9)' : 'rgba(16,185,129,0.95)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: bg, color: fg,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.03em',
      padding: '3px 9px', borderRadius: 100,
      whiteSpace: 'nowrap',
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Plan Selected
    </span>
  )
}

// ─── Payment chart (monthly payment over time, sparkline-style) ──────────────
function PaymentChart({ schedule, maxY, lineColor, fillColor, axisColor, monthsToShow = 120 }) {
  if (!schedule || schedule.length === 0 || !maxY) return null
  const W = 300, H = 70
  const N = Math.min(monthsToShow, schedule.length)
  const xStep = W / Math.max(1, N - 1)

  // Build a step-line path so transitions are sharp (horizontal then vertical)
  const points = []
  for (let i = 0; i < N; i++) {
    const x = i * xStep
    const y = H - (Math.min(schedule[i], maxY) / maxY) * (H - 6) - 3 // 3px top/bottom padding
    if (i === 0) points.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`)
    else {
      const prevY = H - (Math.min(schedule[i - 1], maxY) / maxY) * (H - 6) - 3
      // step-line: horizontal to current x at previous y, then vertical to current y
      points.push(`L ${x.toFixed(2)} ${prevY.toFixed(2)}`)
      points.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`)
    }
  }
  const linePath = points.join(' ')
  const areaPath = `${linePath} L ${(N - 1) * xStep} ${H} L 0 ${H} Z`

  // Year markers at 5 and 10 years (60 and 120 months)
  const yearMarks = [60, 120].filter(m => m < N).map(m => m * xStep)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      {/* baseline */}
      <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke={axisColor} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      {/* dotted year guides */}
      {yearMarks.map((x, i) => (
        <line key={i} x1={x} y1="0" x2={x} y2={H} stroke={axisColor} strokeWidth="0.5" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" opacity="0.5" />
      ))}
      {/* area fill */}
      <path d={areaPath} fill={fillColor} />
      {/* line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="miter" strokeLinecap="square" />
    </svg>
  )
}

function ChartCaption({ color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: 9.5, fontWeight: 600, color,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginTop: 4,
    }}>
      <span>Now</span>
      <span>Yr 5</span>
      <span>Yr 10</span>
    </div>
  )
}

// ─── Offer tile (baseline / recommended) ──────────────────────────────────────
function OfferTile({ kind, offer, isSelected, onSelect, maxY }) {
  if (!offer) return null
  const isRecommended = kind === 'recommended'

  return (
    <div style={{
      background: T.white,
      border: `2px solid ${isSelected ? T.blue : T.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: isSelected ? '0 10px 30px -14px rgba(37,75,206,0.35)' : '0 1px 2px rgba(15,23,42,0.04)',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Top strip — eyebrow + Plan Selected badge */}
      <div style={{
        height: 40,
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        background: isRecommended ? T.blue : 'transparent',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 800,
          color: isRecommended ? T.white : T.muted,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          {isRecommended ? 'Recommended' : 'Basic'}
        </span>
        {isSelected && <PlanSelectedBadge />}
      </div>
      {/* Body */}
      <div style={{ padding: '18px 24px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Title */}
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', marginBottom: 2 }}>
          {isRecommended ? 'Low monthly cost' : 'Standard'}
        </div>

        {/* Description — fixed minHeight so monthly payment aligns across tiles */}
        <div style={{ fontSize: 15, color: T.muted, lineHeight: 1.5, marginBottom: 22, minHeight: 72 }}>
          {isRecommended
            ? "$0/mo for 6 months, low payments through year 5, then above Standard rate."
            : 'Simple, straightforward. Start building equity from day one.'}
        </div>

        {/* Monthly payment */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: T.text, ...NUM, letterSpacing: '-0.025em', lineHeight: 1 }}>
              {formatCurrencyFull(Math.round(offer.monthly))}
            </span>
            <span style={{ fontSize: 17, color: T.muted, fontWeight: 600 }}>/mo</span>
          </div>
        </div>

        {/* Payment-over-time chart */}
        <div style={{ marginBottom: 18 }}>
          <PaymentChart
            schedule={offer.schedule}
            maxY={maxY}
            lineColor={T.blue}
            fillColor="rgba(37,75,206,0.10)"
            axisColor="rgba(15,23,42,0.18)"
          />
          <ChartCaption color={T.faint} />
        </div>

        {/* Divider + APR / Total loan */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 10, marginBottom: 22, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>APR</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: T.text, ...NUM, letterSpacing: '-0.01em' }}>
              {(offer.apr * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, whiteSpace: 'nowrap' }}>Total loan amount</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: T.text, ...NUM, letterSpacing: '-0.01em' }}>
              {formatCurrencyFull(Math.round(offer.loanAmount))}
            </div>
          </div>
        </div>

        {/* Select button — outline when unselected, full blue when selected */}
        <button onClick={onSelect}
          style={{
            marginTop: 'auto',
            width: '100%',
            padding: '14px 16px',
            borderRadius: 12,
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s',
            ...(isSelected ? {
              background: T.blue,
              color: T.white,
              border: '1.5px solid transparent',
              boxShadow: '0 4px 14px rgba(37,75,206,0.3)',
            } : {
              background: T.white,
              color: T.text,
              border: `1.5px solid ${T.border}`,
              boxShadow: 'none',
            }),
          }}>
          {isSelected ? '✓ Selected' : 'Select'}
        </button>
      </div>
    </div>
  )
}

// ─── Custom tile ──────────────────────────────────────────────────────────────
function CustomTile({ offer, isSelected, onSelect, onRemove, maxY }) {
  if (!offer) return null

  return (
    <div style={{
      background: `linear-gradient(180deg, ${T.navy} 0%, #00224d 100%)`,
      border: `2px solid ${isSelected ? T.blue : 'rgba(37,75,206,0.35)'}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: isSelected ? '0 10px 30px -14px rgba(37,75,206,0.55)' : '0 6px 20px -10px rgba(0,22,96,0.3)',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      display: 'flex', flexDirection: 'column',
      flex: 1,
      color: T.white,
      position: 'relative',
    }}>
      {/* Top strip — "Advanced" eyebrow + Plan Selected badge */}
      <div style={{
        height: 40,
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 800,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          Advanced
        </span>
        {isSelected && <PlanSelectedBadge />}
      </div>
      <div style={{ padding: '22px 24px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Title */}
        <div style={{ fontSize: 22, fontWeight: 700, color: T.white, letterSpacing: '-0.02em', marginBottom: 2 }}>
          Custom
        </div>

        {/* Description — same minHeight as OfferTile */}
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, marginBottom: 22, minHeight: 72 }}>
          A custom plan is great if you know what you're doing.
        </div>

        {/* Monthly payment */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: T.white, ...NUM, letterSpacing: '-0.025em', lineHeight: 1 }}>
              {formatCurrencyFull(Math.round(offer.monthly))}
            </span>
            <span style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>/mo</span>
          </div>
        </div>

        {/* Payment-over-time chart */}
        <div style={{ marginBottom: 18 }}>
          <PaymentChart
            schedule={offer.schedule}
            maxY={maxY}
            lineColor="#7BB6FF"
            fillColor="rgba(123,182,255,0.18)"
            axisColor="rgba(255,255,255,0.18)"
          />
          <ChartCaption color="rgba(255,255,255,0.45)" />
        </div>

        {/* Divider + APR / Total loan */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 10, marginBottom: 22, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.18)' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>APR</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: T.white, ...NUM, letterSpacing: '-0.01em' }}>
              {(offer.apr * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, whiteSpace: 'nowrap' }}>Total loan amount</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: T.white, ...NUM, letterSpacing: '-0.01em' }}>
              {formatCurrencyFull(Math.round(offer.loanAmount))}
            </div>
          </div>
        </div>

        {/* Action row — Select button + trash icon button */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={onSelect}
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: 12,
              fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s',
              ...(isSelected ? {
                background: T.blue,
                color: T.white,
                border: '1.5px solid transparent',
                boxShadow: '0 4px 14px rgba(37,75,206,0.3)',
              } : {
                background: 'transparent',
                color: T.white,
                border: '1.5px solid rgba(255,255,255,0.35)',
                boxShadow: 'none',
              }),
            }}>
            {isSelected ? '✓ Selected' : 'Select'}
          </button>

          {onRemove && (
            <button onClick={onRemove}
              aria-label="Remove custom plan"
              title="Remove custom plan"
              style={{
                width: 48,
                flexShrink: 0,
                padding: 0,
                borderRadius: 12,
                border: '1.5px solid rgba(255,255,255,0.35)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.85)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.85)'; e.currentTarget.style.color = T.white }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            >
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 26 20 -20"/>
                <path d="m6 6 20 20"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Terms of your offer ──────────────────────────────────────────────────────
function TermsOfOffer({ offer, safeDraw }) {
  if (!offer) return null
  const loanAmount = offer.loanAmount
  const origFee    = offer.origFee
  const escrow     = offer.totalEscrow ?? 0
  const recordingTax = Math.round(loanAmount * 0.0034)  // ~0.34% typical recording tax
  const cashAtClosing = 0

  return (
    <div style={{
      background: T.white,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '18px 22px',
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12, letterSpacing: '-0.01em' }}>
        Terms of your offer
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <TermRow label="Initial draw amount"                     value={formatCurrencyFull(Math.round(loanAmount))} />
        <TermRow label="Cash required at closing"                value={formatCurrencyFull(cashAtClosing)} />
        <TermRow label="Origination fee (deducted from total)"   value={formatCurrencyFull(Math.round(origFee))} />
        <TermRow label="Recording tax fee (deducted from total)" value={formatCurrencyFull(Math.round(recordingTax))} />
      </div>
    </div>
  )
}

function TermRow({ label, value, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px dashed ${T.line}`, paddingBottom: 8 }}>
      <span style={{ fontSize: 13, color: sub ? T.muted : T.body, fontWeight: sub ? 500 : 500 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: T.text, ...NUM }}>{value}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ScreenOfferSelect({ step2, step1, dispatch, savedConfig }) {
  const firstName = step1?.firstName ?? 'Alex'

  // Selection state
  const [selected,    setSelected]    = useState(savedConfig?.selected ?? null)  // 'baseline' | 'recommended' | 'custom' | null
  const [showAdvanced, setShowAdvanced] = useState(savedConfig?.showAdvanced ?? false)
  const [isRemovingCustom, setIsRemovingCustom] = useState(false)

  // Trigger exit animation, then reset + collapse after it finishes
  function handleRemoveCustom() {
    if (isRemovingCustom) return
    setIsRemovingCustom(true)
    if (selected === 'custom') setSelected('recommended')
    setTimeout(() => {
      setCreditLim(SEED.defaultCredit)
      setDrawAmt(SEED.defaultWithdraw)
      setZeroStart(false)
      setIoYrsId('pi')
      setTierId('none')
      setReductionYrs(null)
      setEditingCard(null)
      setShowAdvanced(false)
      setIsRemovingCustom(false)
    }, 450)
  }

  // Custom config state (dials)
  const [creditLim,    setCreditLim]    = useState(savedConfig?.creditLim    ?? SEED.defaultCredit)
  const [drawAmt,      setDrawAmt]      = useState(savedConfig?.drawAmt      ?? SEED.defaultWithdraw)
  const [zeroStart,    setZeroStart]    = useState(savedConfig?.zeroStart    ?? false)
  const [ioYrsId,      setIoYrsId]      = useState(savedConfig?.ioYrsId      ?? 'pi')
  const [tierId,       setTierId]       = useState(savedConfig?.tierId       ?? 'none')
  const [reductionYrs, setReductionYrs] = useState(savedConfig?.reductionYrs ?? null)
  const [editingCard,  setEditingCard]  = useState(null)

  // Persist
  useEffect(() => {
    dispatch({
      type: 'SAVE_STEP2_CONFIG',
      config: { product: 'heloc', selected, showAdvanced, creditLim, drawAmt, zeroStart, ioYrsId, tierId, reductionYrs },
    })
  }, [selected, showAdvanced, creditLim, drawAmt, zeroStart, ioYrsId, tierId, reductionYrs]) // eslint-disable-line

  // Derived — custom offer config
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

  // Baseline + Recommended use fixed C=defaultWithdraw, creditLim=defaultCredit (stable regardless of advanced dials)
  const baselineRate = useMemo(() => {
    const cltv0 = (MORTGAGE_BAL + SEED.defaultCredit) / PROP_VALUE
    return calcRate(DEMO_FICO, cltv0) ?? 0.0825
  }, [])

  const baselineOffer = useMemo(() =>
    computeOffer({
      C: SEED.defaultWithdraw, rate: baselineRate,
      preset: { zeroStart: false, ioYrs: 0, s: 0, reductionYrs: null },
    }), [baselineRate])

  const recommendedOffer = useMemo(() =>
    computeOffer({
      C: SEED.defaultWithdraw, rate: baselineRate,
      preset: { zeroStart: true, ioYrs: 5, s: 0.30, reductionYrs: 5 },
    }), [baselineRate])

  const customOffer = useMemo(() =>
    computeOffer({
      C: safeDraw, rate,
      preset: { zeroStart, ioYrs, s, reductionYrs },
    }), [safeDraw, rate, zeroStart, ioYrs, s, reductionYrs])

  // Shared chart Y-axis max so all three tile sparklines use the same scale
  const chartMaxY = useMemo(() => {
    const offers = [baselineOffer, recommendedOffer, customOffer].filter(Boolean)
    if (offers.length === 0) return 1
    let m = 0
    for (const o of offers) {
      for (let i = 0; i < Math.min(120, o.schedule.length); i++) {
        if (o.schedule[i] > m) m = o.schedule[i]
      }
    }
    return Math.ceil(m * 1.12)  // a bit of headroom above the highest payment
  }, [baselineOffer, recommendedOffer, customOffer])

  // Sanity: keep reductionYrs in line with IO
  useEffect(() => {
    if (ioYrs > 0 && (reductionYrs === null || reductionYrs > 5)) setReductionYrs(ioYrs)
    if (ioYrs === 0 && reductionYrs !== null) setReductionYrs(null)
  }, [ioYrs]) // eslint-disable-line

  useEffect(() => {
    if (ioYrs === 0 && tierId !== 'none') setTierId('none')
  }, [ioYrs]) // eslint-disable-line

  // Auto-select 'custom' when user tweaks any custom dial
  const customModified = zeroStart || ioYrs > 0 || s > 0 ||
    creditLim !== SEED.defaultCredit || drawAmt !== SEED.defaultWithdraw
  useEffect(() => {
    if (showAdvanced && customModified && selected !== 'custom') {
      setSelected('custom')
    }
  }, [zeroStart, ioYrs, s, creditLim, drawAmt]) // eslint-disable-line

  // Current offer for confirm / terms
  const currentOffer = selected === 'baseline'    ? baselineOffer
                     : selected === 'recommended' ? recommendedOffer
                     : selected === 'custom'      ? customOffer
                     : null

  // Card summaries
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

  const rateDisplay = `${(rate * 100).toFixed(2)}%`

  function handleConfirm() {
    if (!currentOffer) return
    const calc = currentOffer.calc
    const isCustom = selected === 'custom'
    const preset = selected === 'baseline'
      ? { zeroStart: false, ioYrs: 0, s: 0, reductionYrs: null }
      : selected === 'recommended'
        ? { zeroStart: true, ioYrs: 5, s: 0.30, reductionYrs: 5 }
        : { zeroStart, ioYrs, s, reductionYrs }
    const creditUsed = isCustom ? creditLim : SEED.defaultCredit
    const drawUsed   = isCustom ? safeDraw   : SEED.defaultWithdraw
    const loanObj = {
      creditLimit: creditUsed,
      withdrawNow: drawUsed,
      rate:  isCustom ? rate : baselineRate,
      cltv:  isCustom ? cltv : (MORTGAGE_BAL + SEED.defaultCredit) / PROP_VALUE,
      apr:   (currentOffer.apr * 100).toFixed(2),
      originationFee: calc?.origFee ?? 0,
      totalLoan: calc?.L ?? drawUsed,
      drawPayment:  calc?.IO_custom ?? calc?.PI_custom ?? 0,
      repayPayment: calc?.PI_custom ?? 0,
      reducedPayment: calc?.Red_IO ?? 0,
      deferredMonths: preset.zeroStart ? 6 : 0,
      availableAfter: creditUsed - drawUsed,
      ioYears: preset.ioYrs,
      reductionYears: preset.reductionYrs ?? preset.ioYrs,
      reductionPct: (preset.s ?? 0) * 100,
      productType: 'heloc',
      offerTier: selected,
    }
    dispatch({
      type: 'NEXT',
      step2: { creditLimit: creditUsed, withdrawNow: drawUsed, deferredMonths: preset.zeroStart ? 6 : 0, autopay: true },
      loan: loanObj,
    })
  }

  const selectedLabel = selected === 'baseline'    ? 'Baseline plan'
                      : selected === 'recommended' ? 'Recommended plan'
                      : selected === 'custom'      ? 'Custom plan'
                      : ''

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Step 2 of 7 · Application #{APPLICATION_ID}</span>
        </div>
        <h1 style={{
          fontSize: 32, fontWeight: 700, color: T.text,
          margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15,
          fontFamily: "'PostGrotesk', sans-serif", maxWidth: '80%',
        }}>
          Congratulations, {firstName}! You're approved to borrow up to{' '}
          <span style={{ color: T.green, ...NUM }}>{formatCurrencyFull(LOAN_CAP_LOW_LTV)}</span>
        </h1>
      </div>

      {/* Select your term */}
      <div style={{ marginBottom: 14 }}>
        <h2 style={{
          fontSize: 20, fontWeight: 700, color: T.text,
          margin: 0, letterSpacing: '-0.01em',
          fontFamily: "'PostGrotesk', sans-serif",
        }}>
          Select your term
        </h2>
      </div>

      {/* Offer tiles wrapper — constant marginBottom so button padding stays consistent */}
      <div style={{ position: 'relative', marginBottom: 48 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: showAdvanced ? 'repeat(3, 1fr)' : '1fr 1fr',
          gap: 16,
          alignItems: 'stretch',
          transition: 'grid-template-columns 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <OfferTile kind="baseline"    offer={baselineOffer}    isSelected={selected === 'baseline'}    onSelect={() => setSelected('baseline')}    maxY={chartMaxY} />
          <OfferTile kind="recommended" offer={recommendedOffer} isSelected={selected === 'recommended'} onSelect={() => setSelected('recommended')} maxY={chartMaxY} />
          {showAdvanced && (
            <div style={{
              animation: isRemovingCustom
                ? 'solar-tile-toss 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                : 'solar-tile-in 0.45s cubic-bezier(0.4, 0, 0.2, 1) both',
              display: 'flex', flexDirection: 'column',
              transformOrigin: 'center center',
            }}>
              <CustomTile
                offer={customOffer}
                isSelected={selected === 'custom'}
                onSelect={() => setSelected('custom')}
                onRemove={handleRemoveCustom}
                maxY={chartMaxY}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create custom plan toggle on the left + Trust signals on the right */}
      <div style={{
        marginBottom: 28,
        display: 'grid',
        gridTemplateColumns: showAdvanced ? 'repeat(3, 1fr)' : '1fr 1fr',
        gap: 16,
        alignItems: 'center',
      }}>
        {/* Create custom plan toggle — left column, kept small/consistent */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={() => {
              if (showAdvanced) {
                handleRemoveCustom()
              } else {
                setShowAdvanced(true)
                setSelected('custom')
              }
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px',
              background: showAdvanced ? 'rgba(37,75,206,0.06)' : 'transparent',
              border: `1.5px solid ${showAdvanced ? T.blue : T.border}`,
              borderRadius: 12,
              fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
              color: showAdvanced ? T.blue : T.muted,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'border-color 0.15s, color 0.15s, background 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={e => { if (!showAdvanced) { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = T.body } }}
            onMouseOut={e => { if (!showAdvanced) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted } }}
          >
            <svg width="16" height="16" viewBox="-1 -1 32 32" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.35 8.8H1.58" />
              <path d="M28.42 8.8H12.51" />
              <path d="M17.49 21.37H1.58" />
              <path d="M28.42 21.37h-4.77" />
              <path d="M6.35 8.625a3.08 3.08 0 1 0 6.16 0 3.08 3.08 0 1 0 -6.16 0" />
              <path d="M17.49 21.37a3.08 3.08 0 1 0 6.16 0 3.08 3.08 0 1 0 -6.16 0" />
            </svg>
            Create custom plan <span style={{ color: showAdvanced ? T.blue : T.faint, fontWeight: 500, opacity: 0.85 }}>(advanced)</span>
          </button>
        </div>

        {/* Trust signals + disclaimer — right side, spans the remaining tile columns */}
        <div style={{ gridColumn: showAdvanced ? '2 / span 2' : '2', textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {['No obligation', 'No hard pull yet', 'Final terms at closing'].map(t => (
              <div key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.faint, lineHeight: 1.55, marginTop: 4 }}>
            Estimates only. Final terms subject to underwriting and property appraisal. Payment support is funded via an escrow reserve within the loan principal — not a deferral or rate buydown.
          </div>
        </div>
      </div>

      {/* Advanced panel */}
      {showAdvanced && (
        <div style={{
          marginBottom: 24,
          animation: isRemovingCustom
            ? 'solar-panel-out 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            : 'solar-panel-in 0.45s cubic-bezier(0.4, 0, 0.2, 1) both',
        }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
              Shape your loan
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0, letterSpacing: '-0.01em', fontFamily: "'PostGrotesk', sans-serif" }}>
              Pick the setup that works for you
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DecCard
              step={1}
              title="Credit line & initial draw"
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
          </div>

        </div>
      )}

      {/* Terms of your offer — appears once a plan is selected */}
      {currentOffer && (
        <div style={{ marginBottom: 20 }}>
          <TermsOfOffer offer={currentOffer} safeDraw={selected === 'custom' ? safeDraw : SEED.defaultWithdraw} />
        </div>
      )}

      {/* Major confirm action — appears once a plan is selected */}
      {currentOffer && (
        <div style={{
          marginTop: 16,
          background: T.white,
          borderRadius: 16,
          border: `1px solid ${T.border}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          padding: '22px 26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => dispatch({ type: 'BACK' })}
              style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.muted, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              ← Back
            </button>
            <div style={{ width: 1, height: 32, background: T.border }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                Selected: {selectedLabel}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.01em', lineHeight: 1.2, ...NUM }}>
                {formatCurrencyFull(Math.round(currentOffer.monthly))}/mo · {(currentOffer.apr * 100).toFixed(2)}% APR · {formatCurrencyFull(Math.round(currentOffer.loanAmount))} loan
              </div>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            style={{
              flexShrink: 0,
              padding: '16px 30px',
              borderRadius: 12,
              background: T.blue,
              color: T.white,
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 6px 20px rgba(37,75,206,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(37,75,206,0.4)'; e.currentTarget.style.background = T.blueHi }}
            onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,75,206,0.35)'; e.currentTarget.style.background = T.blue }}
          >
            Confirm your plan →
          </button>
        </div>
      )}
    </div>
  )
}
