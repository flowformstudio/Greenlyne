/**
 * HELOCApp — Formal HELOC Application Flow (Application 2)
 * 4 screens: Confirm Details → Loan Options → Verify & Confirm → Final Offer & Sign
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { calcLoan, FEE_TIERS, formatCurrencyFull } from '../lib/loanCalc'

// ─── Brand tokens ──────────────────────────────────────────────────────────
const C = {
  navy:    '#001660',
  blue:    '#254BCE',
  teal:    '#016163',
  green:   '#93DDBA',
  bg:      '#F5F1EE',
  white:   '#ffffff',
  border:  '#D1D5DB',
  muted:   '#6B7280',
  text:    '#111827',
  label:   '#4B5563',
  error:   '#DC2626',
  errorBg: '#FEF2F2',
  success: '#016163',
  offwhite:'#F9FAFB',
}

// ─── App flow ──────────────────────────────────────────────────────────────
const S = { CONFIRM: 1, LOAN: 2, VERIFY: 3, SIGN: 4 }
const SCREEN_LABELS = ['Confirm Details', 'Loan Options', 'Verify & Confirm', 'Final Offer & Sign']

const SEED = {
  creditLimit:  131800,
  defaultDraw:  91800,
  minDraw:      25000,
  projectCost:  50000,
}

// ─── Shared primitives ─────────────────────────────────────────────────────
const inputBase = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px', fontSize: 15,
  border: `1.5px solid ${C.border}`, borderRadius: 8,
  background: C.white, color: C.text, outline: 'none',
  fontFamily: 'inherit',
}
const inputError = { ...inputBase, border: `1.5px solid ${C.error}`, background: C.errorBg }
const selectBase = {
  ...inputBase,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
  paddingRight: 36, cursor: 'pointer',
}

// ─── GreenLyne header ─────────────────────────────────────────────────────
function GreenLyneHeader() {
  return (
    <div style={{
      background: C.white, borderBottom: '1px solid #E5E7EB',
      padding: '0 32px', height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/greenlyne-logo.svg" alt="GreenLyne" style={{ height: 20, width: 'auto' }} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.navy }}>
          Financing by <strong>Owning</strong> · NMLS #2611
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Project by Westhaven Power</div>
      </div>
    </div>
  )
}

function FieldLabel({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
      {children}{required && <span style={{ color: C.error, marginLeft: 2 }} aria-hidden="true">*</span>}
    </label>
  )
}

function FieldError({ id, msg }) {
  if (!msg) return null
  return <div id={id} role="alert" style={{ fontSize: 12, color: C.error, marginTop: 5, fontWeight: 500 }}>{msg}</div>
}

function WhyWeAsk({ text }) {
  return (
    <details style={{ marginTop: 6 }}>
      <summary style={{ fontSize: 12, color: C.blue, cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>Why we ask</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke={C.blue} strokeWidth="1.3" strokeLinecap="round"/></svg>
      </summary>
      <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0', lineHeight: 1.55, paddingLeft: 4 }}>{text}</p>
    </details>
  )
}

function PillToggle({ options, value, onChange, name }) {
  return (
    <div role="group" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            name={name}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '9px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 14,
              fontWeight: active ? 700 : 500, fontFamily: 'inherit',
              border: `1.5px solid ${active ? C.navy : C.border}`,
              background: active ? C.navy : C.white,
              color: active ? C.white : C.text,
              transition: 'all 0.12s',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Terms sidebar ─────────────────────────────────────────────────────────
function TermsSidebar({ step, loanSummary }) {
  const isFinal = step === S.SIGN

  if (isFinal) {
    // Final Offer detailed sidebar (Image #37)
    return (
      <div style={{ width: 220, flexShrink: 0, position: 'sticky', top: 32, alignSelf: 'flex-start' }}>
        <div style={{ background: C.navy, borderRadius: 14, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '16px 18px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Terms of your offer
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: C.white, letterSpacing: '-1px', lineHeight: 1 }}>
              {formatCurrencyFull(loanSummary.withdrawNow)}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Initial draw amount</div>
          </div>

          {/* Detail rows */}
          <div style={{ background: C.white, padding: '14px 18px' }}>
            {[
              { label: 'Draw period payment', value: `$${loanSummary.drawPayment}/mo`, sub: `Interest only · ${loanSummary.deferredMonths === 0 ? '10' : ''} yr`, accent: true },
              { label: 'Repayment payment',   value: `$${loanSummary.repayPayment}/mo`, sub: 'Principal + interest · 20 yr', accent: true },
              { label: 'APR',                 value: loanSummary.apr + '%' },
              { label: 'Interest rate',       value: loanSummary.rate + '%' },
              { label: 'Origination fee',     value: formatCurrencyFull(loanSummary.originationFee), sub: `${loanSummary.fee}% · rolled in` },
              { label: 'Credit limit',        value: formatCurrencyFull(loanSummary.creditLimit) },
              { label: 'Available after draw',value: formatCurrencyFull(loanSummary.availableAfter) },
            ].map((row, i) => (
              <div key={row.label} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.3 }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: row.accent ? C.blue : C.navy, marginLeft: 8 }}>{row.value}</span>
                </div>
                {row.sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{row.sub}</div>}
              </div>
            ))}
            <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.55 }}>
              Cash required at closing: <strong style={{ color: C.navy }}>$0</strong> · Origination fee deducted from total
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Estimated sidebar (screens 1–3)
  return (
    <div style={{ width: 220, flexShrink: 0, position: 'sticky', top: 32, alignSelf: 'flex-start' }}>
      <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: 'rgba(37,75,206,0.06)', padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.blue }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estimated</span>
          </div>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Terms of your offer</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Est. Monthly Payment</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.navy, letterSpacing: '-0.5px', lineHeight: 1 }}>
              ${loanSummary.drawPayment}<span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>/mo</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Interest-only draw period</div>
          </div>
          {[
            { label: 'Credit limit',  value: formatCurrencyFull(loanSummary.creditLimit) },
            { label: 'Draw amount',   value: formatCurrencyFull(loanSummary.withdrawNow) },
            { label: 'Available',     value: formatCurrencyFull(loanSummary.availableAfter) },
            { label: 'Interest rate', value: loanSummary.rate + '%' },
            { label: 'Est. APR',      value: '~' + loanSummary.apr + '%' },
            { label: 'Origination',   value: formatCurrencyFull(loanSummary.originationFee) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, color: C.muted }}>{row.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.navy }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: C.offwhite, padding: '10px 16px', borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 10, color: C.muted, margin: 0, lineHeight: 1.55 }}>
            Subject to change after income verification, appraisal, and lender approval.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Vertical stepper (left rail) ─────────────────────────────────────────
function StepperVertical({ step }) {
  return (
    <div style={{ width: 180, flexShrink: 0, paddingTop: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Application steps
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 4 }}>Application progress</div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 20 }}>
        Complete the loan process today and get funded in as little as five days.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {SCREEN_LABELS.map((label, i) => {
          const n      = i + 1
          const done   = n < step
          const active = n === step
          const last   = i === SCREEN_LABELS.length - 1
          return (
            <div key={label} style={{ display: 'flex', gap: 12 }}>
              {/* Dot + line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? C.teal : active ? C.blue : 'rgba(0,22,96,0.06)',
                  border: done || active ? 'none' : `1.5px solid ${C.border}`,
                }}>
                  {done ? (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: active ? C.white : C.muted }}>{n}</span>
                  )}
                </div>
                {!last && (
                  <div style={{ width: 2, flex: 1, minHeight: 32, background: done ? C.teal : C.border, borderRadius: 1, margin: '4px 0' }} />
                )}
              </div>
              {/* Label */}
              <div style={{ paddingTop: 4, paddingBottom: last ? 0 : 36 }}>
                <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.navy : done ? C.teal : C.muted, lineHeight: 1.3 }}>
                  {label}
                </div>
                {active && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>In progress</div>
                )}
                {done && (
                  <div style={{ fontSize: 11, color: C.teal, marginTop: 2 }}>Complete</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Nav buttons ──────────────────────────────────────────────────────────
function NavButtons({ step, onBack, onNext, ctaLabel, disabled = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {step > 1 && (
          <button onClick={onBack} style={{ padding: '11px 20px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'none', fontSize: 14, fontWeight: 600, color: C.navy, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Back
          </button>
        )}
        <button style={{ padding: '11px 20px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'none', fontSize: 14, fontWeight: 500, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
          Save for later
        </button>
      </div>
      <button
        onClick={onNext}
        disabled={disabled}
        style={{
          padding: '12px 28px', borderRadius: 10, border: 'none',
          background: disabled ? '#9CA3AF' : C.blue, color: C.white,
          fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', letterSpacing: '-0.1px',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN 1 — Confirm Details
// ══════════════════════════════════════════════════════════════════════════
function ScreenConfirmDetails({ state, setState, onNext }) {
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!state.lienAcknowledged)    e.lien = 'Please confirm your lien information is correct.'
    if (!state.maritalStatus)       e.marital = 'Please select your marital status.'
    if (!state.ownershipType)       e.ownership = 'Please select your ownership type.'
    if (!state.financingPurpose)    e.purpose = 'Please select a financing purpose.'
    if (!state.disclosuresAccepted) e.disclosures = 'You must acknowledge the disclosures to continue.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (validate()) onNext()
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Confirm Details</h2>
      <p style={{ fontSize: 14, color: C.muted, margin: '0 0 28px' }}>Verify your property and personal details before we build your formal offer.</p>

      {/* ── Lien Attestation ── */}
      <fieldset style={{ border: 'none', margin: '0 0 24px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Property & Liens</legend>

        <div style={{ background: C.offwhite, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>1482 Sunridge Drive, Sacramento, CA 95814</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: C.muted }}>Estimated property value</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>~$680,000</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: C.muted }}>First mortgage balance</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>$412,000</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: C.muted }}>Available equity</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>~$268,000</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
          <input
            type="checkbox"
            id="lienAck"
            checked={state.lienAcknowledged}
            onChange={e => setState(s => ({ ...s, lienAcknowledged: e.target.checked }))}
            style={{ marginTop: 2, width: 16, height: 16, accentColor: C.blue, flexShrink: 0, cursor: 'pointer' }}
          />
          <label htmlFor="lienAck" style={{ fontSize: 13, color: C.label, lineHeight: 1.5, cursor: 'pointer' }}>
            I confirm the lien information above is accurate. I understand I must disclose any additional mortgages, liens, or judgments not listed.
          </label>
        </div>
        {errors.lien && <FieldError id="err-lien" msg={errors.lien} />}
        <button type="button" style={{ fontSize: 12, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}>
          Lien not accurate? Contact support →
        </button>
      </fieldset>

      {/* ── Personal Details ── */}
      <fieldset style={{ border: 'none', margin: '0 0 24px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Personal Details</legend>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <FieldLabel htmlFor="marital" required>Marital Status</FieldLabel>
            <select
              id="marital"
              value={state.maritalStatus}
              onChange={e => setState(s => ({ ...s, maritalStatus: e.target.value }))}
              aria-describedby={errors.marital ? 'err-marital' : undefined}
              style={errors.marital ? { ...selectBase, border: `1.5px solid ${C.error}` } : selectBase}
            >
              <option value="">Select…</option>
              {['Single', 'Married', 'Separated', 'Divorced', 'Widowed'].map(o => <option key={o}>{o}</option>)}
            </select>
            <FieldError id="err-marital" msg={errors.marital} />
          </div>

          <div>
            <FieldLabel htmlFor="ownership" required>Ownership Type</FieldLabel>
            <select
              id="ownership"
              value={state.ownershipType}
              onChange={e => setState(s => ({ ...s, ownershipType: e.target.value }))}
              aria-describedby={errors.ownership ? 'err-ownership' : undefined}
              style={errors.ownership ? { ...selectBase, border: `1.5px solid ${C.error}` } : selectBase}
            >
              <option value="">Select…</option>
              {['Individual', 'Joint with spouse', 'Joint with non-spouse', 'Trust'].map(o => <option key={o}>{o}</option>)}
            </select>
            <FieldError id="err-ownership" msg={errors.ownership} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabel htmlFor="purpose" required>Financing Purpose</FieldLabel>
          <select
            id="purpose"
            value={state.financingPurpose}
            onChange={e => setState(s => ({ ...s, financingPurpose: e.target.value }))}
            style={errors.purpose ? { ...selectBase, border: `1.5px solid ${C.error}` } : selectBase}
          >
            <option value="">Select…</option>
            {['Home improvement', 'Solar installation', 'Debt consolidation', 'Emergency expenses', 'Other'].map(o => <option key={o}>{o}</option>)}
          </select>
          <FieldError id="err-purpose" msg={errors.purpose} />
        </div>
      </fieldset>

      {/* ── Disclosures ── */}
      <fieldset style={{ border: 'none', margin: '0 0 8px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Disclosures</legend>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <input
            type="checkbox"
            id="disclosures"
            checked={state.disclosuresAccepted}
            onChange={e => setState(s => ({ ...s, disclosuresAccepted: e.target.checked }))}
            style={{ marginTop: 2, width: 16, height: 16, accentColor: C.blue, flexShrink: 0, cursor: 'pointer' }}
            aria-describedby="err-disclosures"
          />
          <label htmlFor="disclosures" style={{ fontSize: 13, color: C.label, lineHeight: 1.5, cursor: 'pointer' }}>
            I acknowledge that I have read and agree to the{' '}
            <a href="#" style={{ color: C.blue }} onClick={e => e.preventDefault()}>Important Disclosures</a>
            , including GreenLyne&apos;s Privacy Policy and the Credit Authorization Notice.
          </label>
        </div>
        <FieldError id="err-disclosures" msg={errors.disclosures} />

        <details style={{ marginTop: 14 }}>
          <summary style={{ fontSize: 12, color: C.blue, cursor: 'pointer', listStyle: 'none' }}>View full disclosure text</summary>
          <div style={{ marginTop: 10, padding: '14px 16px', background: C.offwhite, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
            <strong>Credit Authorization:</strong> By checking the box above, you authorize GreenLyne and its lending partner Owning (a dba of Guaranteed Rate, Inc., NMLS #2611) to access your credit information solely for the purpose of evaluating this HELOC application, as permitted under 15 U.S.C. § 1681b. A soft credit inquiry has already been used to pre-qualify you. A hard credit inquiry will only be made after your explicit written consent on the following screen.
            <br /><br />
            <strong>E-SIGN Consent:</strong> By proceeding, you consent to receive application disclosures electronically in accordance with the Electronic Signatures in Global and National Commerce Act (E-SIGN, 15 U.S.C. § 7001). You may withdraw this consent at any time; however, doing so may require you to complete the application in person.
          </div>
        </details>
      </fieldset>

      <NavButtons step={S.CONFIRM} onNext={handleNext} ctaLabel="Continue to Loan Options →" />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN 2 — Loan Options
// ══════════════════════════════════════════════════════════════════════════
const TERM_OPTIONS = [
  { years: 10, label: '10 yr', sub: '5 draw / 5 repay' },
  { years: 15, label: '15 yr', sub: '5 draw / 10 repay' },
  { years: 20, label: '20 yr', sub: '5 draw / 15 repay' },
  { years: 30, label: '30 yr', sub: '10 draw / 20 repay' },
]

function ScreenLoanOptions({ state, setState, loanSummary, onBack, onNext }) {
  const tier = FEE_TIERS[state.feeOption]

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Loan Options</h2>
      <p style={{ fontSize: 14, color: C.muted, margin: '0 0 28px' }}>Customize your draw amount, term, and origination fee to find the right balance for your budget.</p>

      {/* ── Draw Amount ── */}
      <fieldset style={{ border: 'none', margin: '0 0 24px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Draw Amount</legend>

        <div style={{ background: C.navy, borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Amount to draw now</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: C.white, letterSpacing: '-0.5px' }}>${state.drawAmount.toLocaleString()}</span>
          </div>
          <input
            type="range"
            id="drawSlider"
            min={SEED.minDraw}
            max={SEED.creditLimit}
            step={1000}
            value={state.drawAmount}
            onChange={e => setState(s => ({ ...s, drawAmount: Number(e.target.value) }))}
            aria-label="Draw amount"
            style={{ width: '100%', accentColor: C.green, cursor: 'pointer', marginBottom: 6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>${(SEED.minDraw / 1000).toFixed(0)}k min</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>${(SEED.creditLimit / 1000).toFixed(0)}k max</span>
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Est. monthly payment</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>${loanSummary.drawPayment}/mo</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Available after draw</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>${loanSummary.availableAfter.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </fieldset>

      {/* ── Term Selection ── */}
      <fieldset style={{ border: 'none', margin: '0 0 24px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Loan Term</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {TERM_OPTIONS.map(opt => {
            const active = state.termYears === opt.years
            return (
              <button
                key={opt.years}
                type="button"
                onClick={() => setState(s => ({ ...s, termYears: opt.years }))}
                aria-pressed={active}
                style={{
                  padding: '12px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  border: `1.5px solid ${active ? C.blue : C.border}`,
                  background: active ? 'rgba(37,75,206,0.06)' : C.white,
                  fontFamily: 'inherit', transition: 'all 0.12s',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 900, color: active ? C.blue : C.navy }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{opt.sub}</div>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* ── Origination Fee Tier ── */}
      <fieldset style={{ border: 'none', margin: '0 0 24px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Rate & Fee</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FEE_TIERS.map((tier, i) => {
            const active = state.feeOption === i
            return (
              <button
                key={tier.label}
                type="button"
                onClick={() => setState(s => ({ ...s, feeOption: i }))}
                aria-pressed={active}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: `1.5px solid ${active ? C.blue : C.border}`,
                  background: active ? 'rgba(37,75,206,0.05)' : C.white,
                  fontFamily: 'inherit', transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${active ? C.blue : C.border}`,
                    background: active ? C.blue : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.white }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{tier.rateLabel} rate — {tier.feeLabel} origination</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{tier.label} option</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: active ? C.blue : C.navy }}>
                    ${Math.round(state.drawAmount * (tier.rate / 100 / 12)).toLocaleString()}/mo
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>est. payment</div>
                </div>
              </button>
            )
          })}
        </div>
        <WhyWeAsk text="A higher origination fee lowers your interest rate over the life of the loan. If you plan to use your HELOC for a long time, a lower rate (higher fee) may save you more." />
      </fieldset>

      {/* ── Autopay discount ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', background: C.offwhite, border: `1.5px solid ${C.border}`, borderRadius: 10, marginBottom: 8 }}>
        <input
          type="checkbox"
          id="autopay"
          checked={state.autopay}
          onChange={e => setState(s => ({ ...s, autopay: e.target.checked }))}
          style={{ marginTop: 2, width: 16, height: 16, accentColor: C.blue, flexShrink: 0, cursor: 'pointer' }}
        />
        <label htmlFor="autopay" style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Enroll in autopay</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Qualify for a 0.25% rate discount when you set up automatic monthly payments from your bank account.</div>
        </label>
      </div>

      <NavButtons step={S.LOAN} onBack={onBack} onNext={onNext} ctaLabel="Continue to Verify & Confirm →" />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN 3 — Verify & Confirm
// ══════════════════════════════════════════════════════════════════════════
const ETHNICITY_OPTIONS = ['Hispanic or Latino', 'Not Hispanic or Latino', 'I do not wish to provide']
const RACE_OPTIONS = ['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Native Hawaiian or Other Pacific Islander', 'White', 'I do not wish to provide']
const GENDER_OPTIONS = ['Male', 'Female', 'I do not wish to provide']

function ScreenVerifyConfirm({ state, setState, onBack, onNext }) {
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!state.incomeConnected) e.income = 'Please connect income verification to continue.'
    if (!state.fullSSN || !/^\d{9}$/.test(state.fullSSN.replace(/\D/g, ''))) e.ssn = 'Enter your full 9-digit Social Security Number.'
    if (!state.hardPullConsent) e.hardPull = 'You must consent to the hard credit pull to proceed.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (validate()) onNext()
  }

  const ssnFormatted = state.fullSSN || ''

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Verify &amp; Confirm</h2>
      <p style={{ fontSize: 14, color: C.muted, margin: '0 0 28px' }}>Complete income and identity verification, then authorize your full credit check.</p>

      {/* ── Income Verification ── */}
      <fieldset style={{ border: 'none', margin: '0 0 24px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Income Verification</legend>

        {state.incomeConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 10, marginBottom: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>Income verified</div>
              <div style={{ fontSize: 12, color: '#16A34A' }}>Connected via {state.incomeMethod === 'plaid' ? 'Plaid bank connection' : 'document upload'}</div>
            </div>
            <button onClick={() => setState(s => ({ ...s, incomeConnected: false }))} style={{ marginLeft: 'auto', fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Change</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
            {[
              { method: 'plaid',  icon: '🏦', title: 'Connect checking account', sub: 'Fastest — instant verification via Plaid' },
              { method: 'payroll',icon: '📄', title: 'Upload recent pay stubs',   sub: 'Last 2 pay stubs (PDF or photo)' },
              { method: 'tax',    icon: '📊', title: 'Upload tax return (W-2)',    sub: 'Most recent year accepted' },
            ].map(opt => (
              <button
                key={opt.method}
                type="button"
                onClick={() => setState(s => ({ ...s, incomeMethod: opt.method, incomeConnected: true }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 20 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{opt.title}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{opt.sub}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}><path d="M5 3l4 4-4 4" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            ))}
            {errors.income && <FieldError id="err-income" msg={errors.income} />}
          </div>
        )}

        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 12, color: C.muted, cursor: 'pointer', listStyle: 'none' }}>What if my income doesn&apos;t verify?</summary>
          <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0', lineHeight: 1.55, paddingLeft: 4 }}>
            If automated verification fails, a specialist will reach out within 1 business day to assist with manual review. You may be offered an alternative loan amount based on verified income.
          </p>
        </details>
      </fieldset>

      {/* ── Identity Verification ── */}
      <fieldset style={{ border: 'none', margin: '0 0 24px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Identity Verification</legend>

        {state.idVerified ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>ID verified</div>
              <div style={{ fontSize: 12, color: '#16A34A' }}>Government-issued ID accepted</div>
            </div>
            <button onClick={() => setState(s => ({ ...s, idVerified: false }))} style={{ marginLeft: 'auto', fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Re-upload</button>
          </div>
        ) : (
          <div>
            <div style={{ background: C.offwhite, border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: '24px', textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 4 }}>Upload a photo of your ID</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Driver&apos;s license, passport, or state ID accepted</div>
              <button
                type="button"
                onClick={() => setState(s => ({ ...s, idVerified: true }))}
                style={{ padding: '10px 24px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.white, fontSize: 14, fontWeight: 600, color: C.navy, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Select Photo
              </button>
            </div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
              Tips: all 4 corners visible, no glare, well-lit. Front side required; back required for driver&apos;s license.
            </div>
          </div>
        )}
      </fieldset>

      {/* ── HMDA ── */}
      <fieldset style={{ border: 'none', margin: '0 0 24px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Government Monitoring (HMDA)</legend>
        <p style={{ fontSize: 12, color: C.muted, margin: '0 0 14px', lineHeight: 1.55 }}>
          Federal law requires us to ask about your ethnicity, race, and gender. This information <strong>does not affect</strong> your approval, rate, or terms in any way.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <FieldLabel htmlFor="ethnicity">Ethnicity</FieldLabel>
            <select id="ethnicity" value={state.ethnicity} onChange={e => setState(s => ({ ...s, ethnicity: e.target.value }))} style={selectBase}>
              <option value="">Select…</option>
              {ETHNICITY_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="race">Race</FieldLabel>
            <select id="race" value={state.race} onChange={e => setState(s => ({ ...s, race: e.target.value }))} style={selectBase}>
              <option value="">Select…</option>
              {RACE_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="gender">Gender</FieldLabel>
            <select id="gender" value={state.gender} onChange={e => setState(s => ({ ...s, gender: e.target.value }))} style={selectBase}>
              <option value="">Select…</option>
              {GENDER_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      {/* ── Full SSN + Hard Pull consent ── */}
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Credit Authorization</legend>

        <div style={{ padding: '16px', background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>Hard credit pull ahead</div>
          <p style={{ fontSize: 12, color: '#78350F', margin: 0, lineHeight: 1.55 }}>
            Proceeding will authorize a hard inquiry with all three credit bureaus. This may temporarily affect your credit score by a small amount (typically 2–5 points). It will not affect your score if you do not proceed.
          </p>
        </div>

        <div style={{ maxWidth: 260, marginBottom: 16 }}>
          <FieldLabel htmlFor="fullSSN" required>Full Social Security Number</FieldLabel>
          <input
            id="fullSSN"
            type="password"
            inputMode="numeric"
            maxLength={11}
            placeholder="XXX-XX-XXXX"
            value={ssnFormatted}
            onChange={e => setState(s => ({ ...s, fullSSN: e.target.value.replace(/\D/g, '') }))}
            aria-describedby="err-ssn"
            style={errors.ssn ? inputError : inputBase}
          />
          <FieldError id="err-ssn" msg={errors.ssn} />
          <WhyWeAsk text="Your full SSN is required to perform the hard credit inquiry with the credit bureaus, as required under the Fair Credit Reporting Act (15 U.S.C. § 1681b)." />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
          <input
            type="checkbox"
            id="hardPull"
            checked={state.hardPullConsent}
            onChange={e => setState(s => ({ ...s, hardPullConsent: e.target.checked }))}
            style={{ marginTop: 2, width: 16, height: 16, accentColor: C.blue, flexShrink: 0, cursor: 'pointer' }}
            aria-describedby="err-hardPull"
          />
          <label htmlFor="hardPull" style={{ fontSize: 13, color: C.label, lineHeight: 1.5, cursor: 'pointer' }}>
            I authorize GreenLyne and Owning (NMLS #2611) to obtain my credit report from one or more consumer reporting agencies for the purpose of evaluating my HELOC application, as permitted under the Fair Credit Reporting Act (15 U.S.C. § 1681b).
          </label>
        </div>
        <FieldError id="err-hardPull" msg={errors.hardPull} />
      </fieldset>

      <NavButtons step={S.VERIFY} onBack={onBack} onNext={handleNext} ctaLabel="Authorize & Continue →" />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN 4 — Final Offer & Sign
// ══════════════════════════════════════════════════════════════════════════
const DOCS = [
  { id: 'heloc_agreement',  label: 'HELOC Agreement & Promissory Note' },
  { id: 'truth_in_lending', label: 'Truth-in-Lending Disclosure (TILA)' },
  { id: 'right_to_cancel',  label: 'Notice of Right to Cancel (3-day rescission)' },
  { id: 'esign_consent',    label: 'E-SIGN Consent & Electronic Disclosure Agreement' },
]

function ScreenFinalSign({ state, setState, loanSummary, onBack, navigate }) {
  const allSigned = DOCS.every(d => state.signedDocs.includes(d.id))

  function toggleSign(id) {
    setState(s => ({
      ...s,
      signedDocs: s.signedDocs.includes(id)
        ? s.signedDocs.filter(x => x !== id)
        : [...s.signedDocs, id],
    }))
  }

  const tier = FEE_TIERS[state.feeOption]

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Final Offer &amp; Sign</h2>
      <p style={{ fontSize: 14, color: C.muted, margin: '0 0 28px' }}>Review your final terms and e-sign your loan documents to activate your HELOC.</p>

      {/* ── Final offer summary ── */}
      <div style={{ background: C.navy, borderRadius: 16, padding: '24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estimated Offer — Pending Final Underwriting</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { label: 'Monthly Payment',  value: `$${loanSummary.drawPayment}/mo`, accent: true },
            { label: 'Draw Amount',      value: formatCurrencyFull(loanSummary.withdrawNow) },
            { label: 'Credit Limit',     value: formatCurrencyFull(loanSummary.creditLimit) },
            { label: 'Interest Rate',    value: tier.rateLabel },
            { label: 'Est. APR',         value: '~' + loanSummary.apr + '%' },
            { label: 'Origination Fee',  value: formatCurrencyFull(loanSummary.originationFee) },
          ].map(row => (
            <div key={row.label}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{row.label}</div>
              <div style={{ fontSize: row.accent ? 20 : 16, fontWeight: row.accent ? 900 : 700, color: row.accent ? C.green : C.white, letterSpacing: '-0.3px' }}>{row.value}</div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setState(s => ({ ...s, _editingLoan: true }))}
          style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
        >
          ← Modify loan options
        </button>
      </div>

      {/* ── Closing conditions ── */}
      <div style={{ background: C.offwhite, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Closing conditions</div>
        {[
          'Property appraisal (automated valuation — no in-person visit required)',
          'Final title search & title insurance',
          'Remote notary appointment (e-notary available in most states)',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 8 : 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{ marginTop: 2, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{ fontSize: 13, color: C.label, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      {/* ── Disbursement account ── */}
      <fieldset style={{ border: 'none', margin: '0 0 24px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Disbursement Account</legend>
        {state.disbursementConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>Checking account connected</div>
              <div style={{ fontSize: 12, color: '#16A34A' }}>Funds will be disbursed within 3 business days of closing</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => setState(s => ({ ...s, disbursementConnected: true }))}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
            >
              <span style={{ fontSize: 20 }}>🏦</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Connect via Plaid</div>
                <div style={{ fontSize: 12, color: C.muted }}>Fastest — instant account verification</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setState(s => ({ ...s, disbursementConnected: true }))}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
            >
              <span style={{ fontSize: 20 }}>📝</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Enter routing &amp; account number manually</div>
                <div style={{ fontSize: 12, color: C.muted }}>Standard bank transfer, verified by micro-deposits</div>
              </div>
            </button>
          </div>
        )}
      </fieldset>

      {/* ── E-Sign documents ── */}
      <fieldset style={{ border: 'none', margin: '0 0 24px', padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Sign Documents</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DOCS.map(doc => {
            const signed = state.signedDocs.includes(doc.id)
            return (
              <div
                key={doc.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: signed ? '#F0FDF4' : C.white,
                  border: `1.5px solid ${signed ? '#86EFAC' : C.border}`,
                  borderRadius: 10,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{doc.label}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSign(doc.id)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: signed ? '#DCFCE7' : C.blue, color: signed ? '#15803D' : C.white,
                    fontSize: 13, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  {signed ? '✓ Signed' : 'Review & Sign'}
                </button>
              </div>
            )
          })}
        </div>

        {!allSigned && (
          <p style={{ fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
            All documents must be signed to submit your application.
          </p>
        )}
      </fieldset>

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onBack} style={{ padding: '11px 20px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'none', fontSize: 14, fontWeight: 600, color: C.navy, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Back
          </button>
          <button style={{ padding: '11px 20px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'none', fontSize: 14, fontWeight: 500, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            Save for later
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <button
            onClick={() => allSigned && state.disbursementConnected && navigate('/pipeline')}
            disabled={!allSigned || !state.disbursementConnected}
            style={{
              padding: '13px 28px', borderRadius: 10, border: 'none',
              background: allSigned && state.disbursementConnected ? C.teal : '#9CA3AF',
              color: C.white, fontSize: 15, fontWeight: 800,
              cursor: allSigned && state.disbursementConnected ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            Submit Application →
          </button>
          <span style={{ fontSize: 11, color: C.muted }}>Not a guarantee of final approval.</span>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function HELOCApp() {
  const navigate = useNavigate()
  const [step, setStep] = useState(S.CONFIRM)

  const [formState, setFormState] = useState({
    // Screen 1
    lienAcknowledged:    false,
    maritalStatus:       '',
    ownershipType:       '',
    financingPurpose:    'Solar installation',
    lastFour:            '',
    disclosuresAccepted: false,
    // Screen 2
    drawAmount:   SEED.defaultDraw,
    termYears:    20,
    feeOption:    0,
    autopay:      false,
    // Screen 3
    incomeMethod:    'plaid',
    incomeConnected: false,
    idVerified:      false,
    ethnicity:       '',
    race:            '',
    gender:          '',
    fullSSN:         '',
    hardPullConsent: false,
    // Screen 4
    disbursementConnected: false,
    signedDocs:            [],
  })

  const loanSummary = useMemo(() => calcLoan({
    creditLimit:    SEED.creditLimit,
    withdrawNow:    formState.drawAmount,
    tier:           formState.feeOption,
    deferredMonths: 0,
  }), [formState.drawAmount, formState.feeOption])

  const showSidebar = true // always show on this page

  function goNext() { setStep(s => Math.min(s + 1, S.SIGN)); window.scrollTo(0, 0) }
  function goBack() { setStep(s => Math.max(s - 1, S.CONFIRM)); window.scrollTo(0, 0) }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: "'PostGrotesk', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column',
    }}>
      <GreenLyneHeader />

      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 24px 64px' }}>

          {/* Three-column: stepper | content | terms */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            {/* Left — vertical stepper */}
            <StepperVertical step={step} />

            {/* Main content card */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: C.white, borderRadius: 16, border: `1.5px solid ${C.border}`, padding: '28px 28px 24px' }}>

                {step === S.CONFIRM && (
                  <ScreenConfirmDetails
                    state={formState}
                    setState={setFormState}
                    onNext={goNext}
                  />
                )}

                {step === S.LOAN && (
                  <ScreenLoanOptions
                    state={formState}
                    setState={setFormState}
                    loanSummary={loanSummary}
                    onBack={goBack}
                    onNext={goNext}
                  />
                )}

                {step === S.VERIFY && (
                  <ScreenVerifyConfirm
                    state={formState}
                    setState={setFormState}
                    onBack={goBack}
                    onNext={goNext}
                  />
                )}

                {step === S.SIGN && (
                  <ScreenFinalSign
                    state={formState}
                    setState={setFormState}
                    loanSummary={loanSummary}
                    onBack={goBack}
                    navigate={navigate}
                  />
                )}

              </div>
            </div>

            {/* Terms sidebar */}
            <TermsSidebar step={step} loanSummary={loanSummary} />
          </div>

        </div>
      </div>
    </div>
  )
}
