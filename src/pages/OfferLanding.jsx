/**
 * OfferLanding — Pre-qualification bridge
 * Email → /offer → /pos-demo
 *
 * UX patterns: Blend / Better.com / Roofstock style
 *  - Input masking (phone, DOB, currency)
 *  - Inline blur-validation
 *  - Animated step transitions
 *  - Contextual hints + "why we ask"
 *  - Smart CTA enable/disable
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  navy:    '#001660',
  blue:    '#254BCE',
  teal:    '#016163',
  green:   '#93DDBA',
  bg:      '#F5F1EE',
  white:   '#ffffff',
  border:  '#D1D1D1',
  muted:   '#888',
  label:   '#556',
  red:     '#e0271a',
  gold:    '#f5a623',
  errText: '#c0392b',
  errBg:   '#FEF2F2',
  errBdr:  '#FCA5A5',
  ok:      '#016163',
}

const OFFER = { amount: '$131,800', payment: '$1,260/mo', rate: '11.31%', product: 'Solar HELOC' }

const STATES_LIST = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
  'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
  'TX','UT','VT','VA','WA','WV','WI','WY',
]

// ── Input masking helpers ─────────────────────────────────────────────────────
function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0,3)}) ${d.slice(3)}`
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
}
function maskDOB(v) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length < 3) return d
  if (d.length < 5) return `${d.slice(0,2)}/${d.slice(2)}`
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`
}
function maskCurrency(v) {
  const d = v.replace(/\D/g, '').slice(0, 10)
  if (!d) return ''
  return '$' + Number(d).toLocaleString()
}
function isPhoneComplete(v) { return v.replace(/\D/g,'').length === 10 }
function isDOBValid(v) { return /^\d{2}\/\d{2}\/\d{4}$/.test(v) }

// ── Validation rules per field ────────────────────────────────────────────────
const VALIDATORS = {
  address:         v => v.trim().length > 5 ? null : 'Enter a valid street address',
  city:            v => v.trim().length > 1 ? null : 'Enter your city',
  state:           v => v ? null : 'Select a state',
  propertyValue:   v => v && v !== '$' ? null : 'Enter your estimated home value',
  mortgageBalance: v => v && v !== '$' ? null : 'Enter your current mortgage balance',
  firstName:       v => v.trim().length > 1 ? null : 'Enter your first name',
  lastName:        v => v.trim().length > 1 ? null : 'Enter your last name',
  dob:             v => isDOBValid(v) ? null : 'Enter date as MM/DD/YYYY',
  phone:           v => isPhoneComplete(v) ? null : 'Enter a 10-digit US number',
  email:           v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email address',
  employment:      v => v ? null : 'Select your employment status',
  income:          v => v ? null : 'Select your income range',
  credit:          v => v ? null : 'Select your credit score range',
  homeowner:       v => v ? null : 'Select an option',
}

// ── Base components ───────────────────────────────────────────────────────────

function GreenLyneBadge() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, color: '#8899bb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>GreenLyne · OWNING lender</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" fill="none" stroke="#254BCE" strokeWidth="1.5"/>
            <circle cx="6" cy="6" r="2.5" fill="#254BCE"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: '-0.02em' }}>GreenLyne</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#556' }}>with</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>OWNING</span>
      </div>
      <div style={{ fontSize: 8, fontWeight: 400, color: '#99aacc', letterSpacing: '0.08em', textTransform: 'uppercase' }}>NMLS #2611</div>
    </div>
  )
}

function ProgressBar({ step }) {
  const steps = [{ n: 1, label: 'Set up your plan' }, { n: 2, label: 'A few details about you' }, { n: 3, label: 'Your financial picture' }, { n: 4, label: 'Review & Finalize' }]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 30 }}>
      {steps.map((s, i) => {
        const done = step > s.n, active = step === s.n, last = i === steps.length - 1
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', flex: last ? 0 : 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: done ? C.blue : active ? C.navy : 'transparent', border: `2px solid ${done || active ? 'transparent' : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s ease' }}>
                {done
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span style={{ fontSize: 11, fontWeight: 700, color: active ? C.white : C.muted }}>{s.n}</span>}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? C.navy : done ? C.blue : C.muted, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {!last && <div style={{ flex: 1, height: 2, marginTop: 16, marginLeft: 6, marginRight: 6, background: done ? C.blue : C.border, transition: 'background 0.4s ease' }} />}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, required, error, touched, hint, whyWeAsk, children }) {
  const [showWhy, setShowWhy] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: touched && error ? C.errText : C.navy, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}{required && <span style={{ color: C.blue, marginLeft: 2 }}>*</span>}
        </label>
        {whyWeAsk && (
          <button onClick={() => setShowWhy(v => !v)} style={{ fontSize: 10, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 400, padding: '0 2px', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Why we ask
          </button>
        )}
      </div>
      {showWhy && <div style={{ fontSize: 11.5, color: '#444', background: 'rgba(37,75,206,0.05)', border: `1px solid rgba(37,75,206,0.15)`, borderRadius: 6, padding: '8px 11px', lineHeight: 1.6, marginBottom: 2 }}>{whyWeAsk}</div>}
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{hint}</span>}
      {touched && error && <span style={{ fontSize: 11, color: C.errText, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill={C.errText}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="white" strokeWidth="2"/></svg>
        {error}
      </span>}
    </div>
  )
}

function TextInput({ value, onChange, onBlur, placeholder, type = 'text', autoComplete, mask, maxLength, error, touched }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0
  const showOk = touched && !error && hasValue

  function handleChange(e) {
    let v = e.target.value
    if (mask === 'phone')    v = maskPhone(v)
    if (mask === 'dob')      v = maskDOB(v)
    if (mask === 'currency') v = maskCurrency(v)
    onChange(v)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type} value={value} placeholder={placeholder}
        autoComplete={autoComplete} maxLength={maxLength}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur && onBlur() }}
        style={{
          width: '100%', height: 48, padding: showOk ? '0 40px 0 14px' : '0 14px',
          border: `1.5px solid ${touched && error ? C.errBdr : focused ? C.blue : hasValue && !error && touched ? 'rgba(1,97,99,0.4)' : C.border}`,
          borderRadius: 9, fontSize: 14, color: '#1a1a1a',
          outline: 'none', background: touched && error ? C.errBg : C.white,
          boxShadow: focused ? `0 0 0 3px rgba(37,75,206,0.1)` : touched && error ? `0 0 0 3px rgba(198,40,40,0.07)` : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
          fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
      {showOk && (
        <svg style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      )}
    </div>
  )
}

function SelectInput({ value, onChange, onBlur, options, placeholder, error, touched }) {
  const [focused, setFocused] = useState(false)
  const hasValue = !!value
  const showOk = touched && !error && hasValue

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur && onBlur() }}
        style={{
          width: '100%', height: 48, padding: '0 36px 0 14px',
          border: `1.5px solid ${touched && error ? C.errBdr : focused ? C.blue : hasValue && touched ? 'rgba(1,97,99,0.4)' : C.border}`,
          borderRadius: 9, fontSize: 14, color: value ? '#1a1a1a' : '#999',
          outline: 'none', background: touched && error ? C.errBg : C.white,
          boxShadow: focused ? `0 0 0 3px rgba(37,75,206,0.1)` : 'none',
          appearance: 'none', cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
      {showOk
        ? <svg style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      }
    </div>
  )
}

// ── About OWNING expandable ───────────────────────────────────────────────────
function AboutOwning({ dark }) {
  const [open, setOpen] = useState(false)
  const bg      = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,22,96,0.04)'
  const bgOpen  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(37,75,206,0.06)'
  const textCol = dark ? 'rgba(255,255,255,0.55)' : '#444'
  const headCol = dark ? 'rgba(255,255,255,0.75)' : C.navy
  const trigCol = dark ? 'rgba(255,255,255,0.45)' : C.blue
  const borderC = dark ? 'rgba(255,255,255,0.1)'  : 'rgba(37,75,206,0.15)'

  return (
    <div style={{ borderRadius: 8, border: `1px solid ${open ? borderC : 'transparent'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: open ? bgOpen : bg, border: 'none', cursor: 'pointer',
        padding: '8px 16px', fontFamily: 'inherit', transition: 'background 0.2s',
        borderRadius: open ? '8px 8px 0 0' : 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={trigCol} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: trigCol }}>About OWNING, your lender</span>
        </div>
        <svg style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={trigCol} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div style={{ background: bgOpen, borderTop: `1px solid ${borderC}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: dark ? 'rgba(255,255,255,0.1)' : C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? 'rgba(255,255,255,0.6)' : C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: headCol, marginBottom: 3 }}>OWNING · NMLS #2611</div>
              <div style={{ fontSize: 12, color: textCol, lineHeight: 1.65 }}>
                OWNING is a licensed mortgage lender that issues and funds the HELOC on your behalf. They are the lender of record on your loan — GreenLyne is the technology platform that connects you to OWNING and manages the application process.
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'License',       value: 'NMLS #2611' },
              { label: 'Type',          value: 'Mortgage Lender' },
              { label: 'Phone',         value: '(877) 265-0703' },
              { label: 'Equal Housing', value: 'Licensed Lender' },
            ].map(r => (
              <div key={r.label} style={{ background: dark ? 'rgba(0,0,0,0.15)' : 'rgba(0,22,96,0.04)', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.35)' : C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: headCol }}>{r.value}</div>
              </div>
            ))}
          </div>
          <a
            href="https://wick-finch-47991548.figma.site/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4, padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(37,75,206,0.25)'}`, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(37,75,206,0.05)', color: dark ? 'rgba(255,255,255,0.7)' : C.blue, fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Learn more about OWNING
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </a>
        </div>
      )}
    </div>
  )
}

// ── Step content components ───────────────────────────────────────────────────

function StepProperty({ form, errors, touched, set, touch, onNext }) {
  const allFilled = form.address && form.city && form.state && form.propertyValue && form.mortgageBalance
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8, letterSpacing: '-0.01em' }}>Tell us about your property</div>
        <div style={{ fontSize: 13, color: C.label, lineHeight: 1.65 }}>Your property was already identified as a strong candidate. We just need to verify a few details to activate your offer. No appraisal required at this stage.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Property address" required error={errors.address} touched={touched.address}>
          <TextInput value={form.address} onChange={v => set('address', v)} onBlur={() => touch('address')} placeholder="123 Oak Street" autoComplete="street-address" error={errors.address} touched={touched.address} />
        </Field>
        <Field label="Apt / Suite" hint="Optional — leave blank if not applicable">
          <TextInput value={form.apt} onChange={v => set('apt', v)} placeholder="Unit 4B" autoComplete="address-line2" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
          <Field label="City" required error={errors.city} touched={touched.city}>
            <TextInput value={form.city} onChange={v => set('city', v)} onBlur={() => touch('city')} placeholder="Sacramento" autoComplete="address-level2" error={errors.city} touched={touched.city} />
          </Field>
          <Field label="State" required error={errors.state} touched={touched.state}>
            <SelectInput value={form.state} onChange={v => set('state', v)} onBlur={() => touch('state')} options={STATES_LIST} placeholder="—" error={errors.state} touched={touched.state} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Estimated home value" required error={errors.propertyValue} touched={touched.propertyValue}
            whyWeAsk="Your home's equity (value minus mortgage) determines your maximum HELOC amount. This is an estimate — no appraisal at this stage.">
            <TextInput value={form.propertyValue} onChange={v => set('propertyValue', v)} onBlur={() => touch('propertyValue')} placeholder="$680,000" mask="currency" error={errors.propertyValue} touched={touched.propertyValue} />
          </Field>
          <Field label="Remaining mortgage" required error={errors.mortgageBalance} touched={touched.mortgageBalance}
            whyWeAsk="We subtract your mortgage balance from your home's value to estimate available equity.">
            <TextInput value={form.mortgageBalance} onChange={v => set('mortgageBalance', v)} onBlur={() => touch('mortgageBalance')} placeholder="$290,000" mask="currency" error={errors.mortgageBalance} touched={touched.mortgageBalance} />
          </Field>
        </div>
      </div>
      <StepFooter onNext={onNext} nextLabel="Continue →" enabled={!!allFilled} />
    </>
  )
}

function StepAboutYou({ form, errors, touched, set, touch, onBack, onNext }) {
  const allFilled = form.firstName && form.lastName && form.dob && form.phone && form.email
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8, letterSpacing: '-0.01em' }}>A few details about you</div>
        <div style={{ fontSize: 13, color: C.label, lineHeight: 1.65 }}>GreenLyne already screened your property. These details confirm who you are. A <strong style={{ color: C.navy }}>soft credit check only</strong> — your score is not affected.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="First name" required error={errors.firstName} touched={touched.firstName}>
            <TextInput value={form.firstName} onChange={v => set('firstName', v)} onBlur={() => touch('firstName')} placeholder="Alex" autoComplete="given-name" error={errors.firstName} touched={touched.firstName} />
          </Field>
          <Field label="Last name" required error={errors.lastName} touched={touched.lastName}>
            <TextInput value={form.lastName} onChange={v => set('lastName', v)} onBlur={() => touch('lastName')} placeholder="Rivera" autoComplete="family-name" error={errors.lastName} touched={touched.lastName} />
          </Field>
        </div>
        <Field label="Date of birth" required error={errors.dob} touched={touched.dob}
          hint="Format: MM/DD/YYYY"
          whyWeAsk="Required by law to verify your identity and confirm you're 18+. Your DOB is never shared with third parties.">
          <TextInput value={form.dob} onChange={v => set('dob', v)} onBlur={() => touch('dob')} placeholder="MM/DD/YYYY" mask="dob" autoComplete="bday" error={errors.dob} touched={touched.dob} />
        </Field>
        <Field label="Mobile number" required error={errors.phone} touched={touched.phone}>
          <TextInput value={form.phone} onChange={v => set('phone', v)} onBlur={() => touch('phone')} placeholder="(530) 555-0100" mask="phone" type="tel" autoComplete="tel" error={errors.phone} touched={touched.phone} />
        </Field>
        <Field label="Email address" required error={errors.email} touched={touched.email}
          hint="We'll send your offer confirmation here">
          <TextInput value={form.email} onChange={v => set('email', v)} onBlur={() => touch('email')} placeholder="alex.rivera@email.com" type="email" autoComplete="email" error={errors.email} touched={touched.email} />
        </Field>
      </div>
      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Continue →" enabled={!!allFilled} />
    </>
  )
}

function StepFinancials({ form, errors, touched, set, touch, onBack, onNext }) {
  const allFilled = form.employment && form.income && form.credit && form.homeowner
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8, letterSpacing: '-0.01em' }}>Your financial picture</div>
        <div style={{ fontSize: 13, color: C.label, lineHeight: 1.65 }}>Helps us confirm the $1,260/mo payment fits comfortably within your financial picture. Approximate ranges are fine — no documents needed yet.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Employment status" required error={errors.employment} touched={touched.employment}>
          <SelectInput value={form.employment} onChange={v => set('employment', v)} onBlur={() => touch('employment')} error={errors.employment} touched={touched.employment}
            placeholder="Select your status"
            options={[{ value: 'employed', label: 'Employed (W-2)' }, { value: 'selfemployed', label: 'Self-employed / 1099' }, { value: 'retired', label: 'Retired' }, { value: 'other', label: 'Other' }]}
          />
        </Field>
        <Field label="Annual household income" required error={errors.income} touched={touched.income}
          whyWeAsk="Lenders verify you can afford the monthly HELOC payment relative to your income. This is a range — exact figures come later.">
          <SelectInput value={form.income} onChange={v => set('income', v)} onBlur={() => touch('income')} error={errors.income} touched={touched.income}
            placeholder="Select income range"
            options={[{ value: '50-75k', label: '$50,000 – $75,000' }, { value: '75-100k', label: '$75,000 – $100,000' }, { value: '100-150k', label: '$100,000 – $150,000' }, { value: '150-200k', label: '$150,000 – $200,000' }, { value: '200k+', label: '$200,000+' }]}
          />
        </Field>
        <Field label="Estimated credit score" required error={errors.credit} touched={touched.credit}
          whyWeAsk="HELOCs typically require a 620+ score. We use the range to confirm the pre-qualified rate in your offer — no hard pull at this stage.">
          <SelectInput value={form.credit} onChange={v => set('credit', v)} onBlur={() => touch('credit')} error={errors.credit} touched={touched.credit}
            placeholder="Select score range"
            options={[{ value: '580-619', label: '580 – 619  (Fair)' }, { value: '620-659', label: '620 – 659  (Good)' }, { value: '660-699', label: '660 – 699  (Good+)' }, { value: '700-739', label: '700 – 739  (Very Good)' }, { value: '740+', label: '740+  (Excellent)' }]}
          />
        </Field>
        <Field label="Are you on the property title?" required error={errors.homeowner} touched={touched.homeowner}>
          <SelectInput value={form.homeowner} onChange={v => set('homeowner', v)} onBlur={() => touch('homeowner')} error={errors.homeowner} touched={touched.homeowner}
            placeholder="Select"
            options={[{ value: 'yes', label: 'Yes — I am the primary owner' }, { value: 'cosign', label: 'Yes — co-owner / joint title' }, { value: 'no', label: 'No' }]}
          />
        </Field>
      </div>
      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Review My Info →" enabled={!!allFilled} />
    </>
  )
}

function StepReview({ form, onBack, onSubmit, loading, onJump }) {
  const [consent, setConsent] = useState(false)
  const [hoveredSection, setHoveredSection] = useState(null)

  const sections = [
    { heading: 'Property',   step: 1,
      rows: [
        { l: 'Address',          v: [form.address, form.apt, form.city, form.state].filter(Boolean).join(', ') || '—' },
        { l: 'Est. value',       v: form.propertyValue  || '—' },
        { l: 'Mortgage balance', v: form.mortgageBalance || '—' },
      ]},
    { heading: 'About You',  step: 2,
      rows: [
        { l: 'Name',  v: `${form.firstName} ${form.lastName}`.trim() || '—' },
        { l: 'DOB',   v: form.dob   || '—' },
        { l: 'Phone', v: form.phone || '—' },
        { l: 'Email', v: form.email || '—' },
      ]},
    { heading: 'Financials', step: 3,
      rows: [
        { l: 'Employment', v: form.employment || '—' },
        { l: 'Income',     v: form.income     || '—' },
        { l: 'Credit',     v: form.credit     || '—' },
        { l: 'On title',   v: form.homeowner  || '—' },
      ]},
  ]

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8, letterSpacing: '-0.01em' }}>Review your information</div>
        <div style={{ fontSize: 13, color: C.label, lineHeight: 1.65 }}>Everything correct? Once you submit we'll run your eligibility check — takes about 2 seconds.</div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {sections.map(sec => {
          const hovered = hoveredSection === sec.heading
          return (
            <div
              key={sec.heading}
              style={{ borderRadius: 10, border: `1px solid ${hovered ? 'rgba(37,75,206,0.3)' : C.border}`, overflow: 'hidden', transition: 'border-color 0.15s' }}
              onMouseEnter={() => setHoveredSection(sec.heading)}
              onMouseLeave={() => setHoveredSection(null)}
            >
              {/* Section header with Edit shortcut */}
              <div style={{ background: hovered ? 'rgba(37,75,206,0.05)' : 'rgba(0,22,96,0.04)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.navy, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{sec.heading}</span>
                <button
                  onClick={() => onJump(sec.step)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 6, border: `1px solid ${C.blue}`,
                    background: hovered ? C.blue : 'transparent',
                    color: hovered ? C.white : C.blue,
                    fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    opacity: hovered ? 1 : 0,
                    transform: hovered ? 'translateX(0)' : 'translateX(4px)',
                    transition: 'opacity 0.18s ease, transform 0.18s ease, background 0.15s',
                    pointerEvents: hovered ? 'all' : 'none',
                    letterSpacing: '0.04em',
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
              </div>

              {sec.rows.map((r, i) => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 16px', background: i % 2 === 0 ? '#fafafa' : C.white, borderBottom: i < sec.rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>{r.l}</span>
                  <span style={{ fontSize: 12, color: C.navy, fontWeight: 700, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{r.v}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Lender info */}
      <div style={{ marginBottom: 12 }}>
        <AboutOwning dark={false} />
      </div>

      {/* Consent */}
      <label style={{ display: 'flex', gap: 8, cursor: 'pointer', alignItems: 'flex-start', padding: '14px', background: consent ? 'rgba(37,75,206,0.04)' : '#fafafa', borderRadius: 10, border: `1.5px solid ${consent ? 'rgba(37,75,206,0.3)' : C.border}`, transition: 'all 0.2s', marginBottom: 4 }}>
        <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${consent ? C.blue : C.border}`, background: consent ? C.blue : C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
            {consent && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
        </div>
        <span style={{ fontSize: 12, color: '#444', lineHeight: 1.65 }}>
          I authorize GreenLyne and OWNING (NMLS #2611) to perform a <strong style={{ color: C.navy }}>soft credit inquiry</strong> to verify my eligibility. This <strong style={{ color: C.navy }}>does not affect my credit score</strong>. I agree to the{' '}
          <span style={{ color: C.blue, cursor: 'pointer', textDecoration: 'underline' }}>Terms of Use</span> and{' '}
          <span style={{ color: C.blue, cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span>.
        </span>
      </label>

      <StepFooter onBack={onBack} onNext={() => consent && onSubmit()} nextLabel="Submit & Finalize My Plan" enabled={consent} loading={loading} />
      {!consent && <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 6 }}>Agree to the terms above to submit</div>}
    </>
  )
}

// ── Shared nav buttons ────────────────────────────────────────────────────────
function StepFooter({ onBack, onNext, nextLabel, enabled, loading }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
      {onBack && (
        <button onClick={onBack} style={{ padding: '13px 20px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.white, color: C.navy, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          ← Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={!enabled || loading}
        style={{ flex: 1, padding: '14px 0', borderRadius: 9, border: 'none', background: enabled && !loading ? C.navy : '#c8cfd8', color: C.white, fontSize: 14, fontWeight: 700, cursor: enabled && !loading ? 'pointer' : 'default', fontFamily: 'inherit', letterSpacing: '0.02em', transition: 'background 0.2s, transform 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        onMouseOver={e => { if (enabled && !loading) e.currentTarget.style.background = '#0a2070' }}
        onMouseOut={e => { if (enabled && !loading) e.currentTarget.style.background = C.navy }}
      >
        {loading && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        )}
        {loading ? 'Checking eligibility…' : nextLabel}
      </button>
    </div>
  )
}

// ── Processing / Eligibility check animation ─────────────────────────────────
const CHECK_STEPS = [
  'Retrieving Property Value...',
  'Retrieving Credit Information (soft credit pull)...',
  'Checking Property Title & Ownership...',
  'Analyzing Solar Potential for Your Property...',
  'Calculating Solar Payment vs. Current Utility Bill...',
  'Configuring Loan to Target Payment Below Your Electric Bill...',
  'Finalizing Pre-Configured Offer...',
]

// Timings (ms) — how long each step stays "active" before completing
const STEP_DURATIONS = [900, 1100, 1300, 800, 900, 700, 800]

function ProcessingState({ onComplete, pausedRef, paused }) {
  const [doneCount, setDoneCount] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function waitWhilePaused() {
      while (pausedRef.current && !cancelled) {
        await new Promise(r => setTimeout(r, 80))
      }
    }

    async function run() {
      for (let i = 0; i < CHECK_STEPS.length; i++) {
        if (cancelled) return
        await waitWhilePaused()
        if (cancelled) return
        setActiveIdx(i)
        await new Promise(r => setTimeout(r, STEP_DURATIONS[i]))
        await waitWhilePaused()
        if (cancelled) return
        setDoneCount(i + 1)
      }
      await new Promise(r => setTimeout(r, 500))
      if (!cancelled) onComplete()
    }
    run()
    return () => { cancelled = true }
  }, [])

  const totalDuration = STEP_DURATIONS.reduce((a, b) => a + b, 0) + 500
  const elapsed = STEP_DURATIONS.slice(0, doneCount).reduce((a, b) => a + b, 0)
  const progressPct = Math.min(elapsed / totalDuration, 1)

  // SVG spinner dimensions
  const R = 28, cx = 34, cy = 34, stroke = 4
  const circumference = 2 * Math.PI * R

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 8px' }}>

      {/* Circular progress spinner */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <svg width="68" height="68" viewBox="0 0 68 68">
          {/* Base ring — light teal */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#93DDBA" strokeWidth={stroke} />
          {/* Progress arc — navy, rotates with progress */}
          <circle
            cx={cx} cy={cy} r={R} fill="none"
            stroke={C.navy} strokeWidth={stroke + 0.5}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progressPct)}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Spinning accent dot */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: doneCount < CHECK_STEPS.length && !paused ? 'spin 1.2s linear infinite' : 'none',
        }}>
          <div style={{ width: R * 2 + stroke, height: R * 2 + stroke, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', background: C.navy }} />
          </div>
        </div>
      </div>

      {/* Check list */}
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {CHECK_STEPS.map((label, i) => {
          const done   = i < doneCount
          const active = i === activeIdx && i >= doneCount
          const pending = !done && !active

          return (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '11px 0',
              borderBottom: i < CHECK_STEPS.length - 1 ? '1px solid rgba(0,22,96,0.06)' : 'none',
              opacity: pending ? 0.38 : 1,
              transition: 'opacity 0.4s ease',
            }}>
              {/* Icon */}
              <div style={{ flexShrink: 0, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done && (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
                {active && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.blue, boxShadow: `0 0 0 4px rgba(37,75,206,0.18)`, animation: 'pulse 1.4s ease infinite' }} />
                )}
                {pending && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ccc' }} />
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: active ? 15 : 14,
                fontWeight: active ? 700 : done ? 500 : 400,
                color: done ? C.navy : active ? C.navy : '#aaa',
                transition: 'all 0.3s ease',
                letterSpacing: active ? '-0.01em' : 'normal',
              }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

    </div>
  )
}

// ── Success / Error ───────────────────────────────────────────────────────────
function SuccessState({ name, navigate }) {
  return (
    <div style={{ textAlign: 'center', padding: '4px 0 12px' }}>
      <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(1,97,99,0.15), rgba(147,221,186,0.25))', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 8px rgba(1,97,99,0.06)' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style={{ fontSize: 8, fontWeight: 700, color: C.teal, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Eligibility Confirmed</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.navy, marginBottom: 8, letterSpacing: '-0.02em' }}>You're approved, {name || 'Alex'}!</div>
      <div style={{ fontSize: 14, color: C.label, lineHeight: 1.7, marginBottom: 24, maxWidth: 340, margin: '0 auto 26px' }}>
        Your Solar HELOC was configured for your property at <strong style={{ color: C.navy }}>1482 Sunridge Drive</strong> — monthly payment comes in below your current electric bill. Let's finish in about 5 minutes.
      </div>

      <div style={{ display: 'inline-flex', gap: 0, background: C.navy, borderRadius: 12, padding: '18px 32px', marginBottom: 24, gap: 32 }}>
        {[{ label: 'Offer Amount', value: OFFER.amount, color: C.white }, { label: 'Est. Monthly', value: OFFER.payment, color: C.green }].map((item, i) => (
          <div key={item.label}>
            {i > 0 && <span style={{ position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)', width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />}
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: item.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <button onClick={() => navigate('/pos-demo')} style={{ display: 'block', width: '100%', padding: '16px 0', borderRadius: 10, border: 'none', background: C.blue, color: C.white, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em', boxShadow: '0 6px 20px rgba(37,75,206,0.35)', marginBottom: 10 }}
        onMouseOver={e => e.currentTarget.style.background = '#1e3fa8'}
        onMouseOut={e => e.currentTarget.style.background = C.blue}>
        Continue to My Pre-Configured Offer →
      </button>
      <div style={{ fontSize: 11, color: C.muted }}>No obligation · Offer expires in 14 days · CA Lic. 965111</div>
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '4px 0 12px' }}>
      <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#FEF2F2', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d64545" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Couldn't verify eligibility</div>
      <div style={{ fontSize: 14, color: C.label, lineHeight: 1.7, marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
        Something went wrong on our end — your information was not submitted. Please try again or call your consultant.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onRetry} style={{ padding: '13px 0', borderRadius: 9, border: 'none', background: C.navy, color: C.white, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>Try Again</button>
        <a href="tel:8772650703" style={{ display: 'block', padding: '12px 0', borderRadius: 9, border: `1.5px solid ${C.border}`, color: C.navy, fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>📞 (877) 265-0703</a>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
const INITIAL_FORM = {
  address: '', apt: '', city: '', state: '',
  propertyValue: '', mortgageBalance: '',
  firstName: '', lastName: '', dob: '', phone: '', email: '',
  employment: '', income: '', credit: '', homeowner: '',
}

const STEP_FIELDS = {
  1: ['address','city','state','propertyValue','mortgageBalance'],
  2: ['firstName','lastName','dob','phone','email'],
  3: ['employment','income','credit','homeowner'],
}

export default function OfferLanding() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill  = location.state || {}
  const [step, setStep]       = useState(1)
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [paused, setPaused]   = useState(false)
  const pausedRef             = useRef(false)
  const togglePause = () => {
    const next = !pausedRef.current
    pausedRef.current = next
    setPaused(next)
  }
  const [form, setFormState]  = useState({
    ...INITIAL_FORM,
    firstName:  prefill.firstName  || '',
    lastName:   prefill.lastName   || '',
    address:    prefill.address    || '1482 Sunridge Drive',
    city:       prefill.city       || 'Sacramento',
    state:      prefill.state      || 'CA',
  })
  const [errors, setErrors]   = useState({})
  const [touched, setTouched] = useState({})

  const cardRef = useRef(null)

  useEffect(() => {
    if (!status) {
      cardRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
  }, [step])

  const set = useCallback((field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }))
    // Re-validate on change if already touched
    setErrors(prev => {
      const fn = VALIDATORS[field]
      if (!fn || !touched[field]) return prev
      const err = fn(value)
      return { ...prev, [field]: err }
    })
  }, [touched])

  const touch = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const fn = VALIDATORS[field]
    if (fn) {
      const err = fn(form[field] || '')
      setErrors(prev => ({ ...prev, [field]: err }))
    }
  }, [form])

  function validateStep(n) {
    const fields = STEP_FIELDS[n] || []
    const newTouched = Object.fromEntries(fields.map(f => [f, true]))
    setTouched(prev => ({ ...prev, ...newTouched }))
    const newErrors = {}
    fields.forEach(f => {
      const fn = VALIDATORS[f]
      if (fn) { const err = fn(form[f] || ''); if (err) newErrors[f] = err }
    })
    setErrors(prev => ({ ...prev, ...newErrors }))
    return Object.keys(newErrors).length === 0
  }

  function next1() { if (validateStep(1)) { setStep(2) } }
  function next2() { if (validateStep(2)) { setStep(3) } }
  function next3() { if (validateStep(3)) { setStep(4) } }
  async function submit() {
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    setLoading(false)
    setStatus('processing')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 4px rgba(37,75,206,0.18); } 50% { box-shadow: 0 0 0 7px rgba(37,75,206,0.08); } }
      `}</style>

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div style={{ background: C.white, borderBottom: '1px solid #e8e8e8', padding: '14px 0', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/westhaven-logo.png" alt="Westhaven Power" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
          <GreenLyneBadge />
        </div>
      </div>

      {/* ── OFFER CONTEXT STRIP ────────────────────────────────────────── */}
      <div style={{ background: C.navy, display: status === 'processing' ? 'none' : 'block' }}>
        <div style={{ padding: '8px 24px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Pre-Qualified Offer · Solar HELOC · Westhaven Power</span>
        </div>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '22px 24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Pre-Approved Amount</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: C.white, letterSpacing: '-0.03em', lineHeight: 1 }}>{OFFER.amount}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Solar Home Equity Line of Credit</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Est. Monthly Payment</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: C.green, letterSpacing: '-0.03em', lineHeight: 1 }}>{OFFER.payment}</div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>vs. $1,400/mo electric bill</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(147,221,186,0.15)', border: '1px solid rgba(147,221,186,0.3)', borderRadius: 100, padding: '4px 10px', alignSelf: 'flex-end' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.green, letterSpacing: '0.01em' }}>Save $140/mo</span>
              </div>
            </div>
          </div>
        </div>
        {/* Lender expandable */}
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px 16px' }}>
          <AboutOwning dark />
        </div>
      </div>


      {/* ── FORM AREA ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, maxWidth: 580, width: '100%', margin: '0 auto', padding: status === 'processing' ? '60px 16px 80px' : '32px 16px 80px' }}>

        {!status && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Step {step} of 4</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: '-0.02em', lineHeight: 1.15 }}>Let's finalize your plan</div>
            <div style={{ fontSize: 13, color: C.label, marginTop: 8, lineHeight: 1.6 }}>Your property was pre-screened. Complete these steps to activate your Solar HELOC offer.</div>
          </div>
        )}

        {/* Processing header — shown above card during eligibility check */}
        {status === 'processing' && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Eligibility Check</div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: C.navy, letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 16px' }}>
              Confirming your pre-qualified offer
            </h2>
            <div style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(1,97,99,0.08)', borderRadius: 100, padding: '6px 14px' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>Your offer will be ready when this completes</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,75,206,0.07)', borderRadius: 100, padding: '6px 14px' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>No hard credit pull</span>
              </div>
            </div>
          </div>
        )}

        {/* Card */}
        <div ref={cardRef} style={{ background: C.white, borderRadius: 18, boxShadow: '0 4px 40px rgba(0,22,96,0.1)', padding: '32px', border: '1px solid rgba(0,22,96,0.06)', scrollMarginTop: 24 }}>
          {!status && (
            <>
              {/* Continuation banner — plan confirmed from SmartPOS */}
              <div style={{ background: '#0a1f12', border: '1px solid #166534', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f0fdf4' }}>Plan confirmed · {prefill.address || '1482 Sunridge Drive'}</div>
                  <div style={{ fontSize: 11, color: '#4ade80', marginTop: 1 }}>Solar payment $1,260/mo · Save $140/mo</div>
                </div>
              </div>
              <ProgressBar step={step} />
            </>
          )}
          {status === 'processing' && <ProcessingState onComplete={() => navigate('/pre-qualified')} pausedRef={pausedRef} paused={paused} />}
          {status === 'success'    && <SuccessState name={form.firstName} navigate={navigate} />}
          {status === 'error'      && <ErrorState onRetry={() => { setStatus(null); setStep(1); setTouched({}) }} />}
          {!status && step === 1 && <StepProperty  form={form} errors={errors} touched={touched} set={set} touch={touch} onNext={next1} />}
          {!status && step === 2 && <StepAboutYou  form={form} errors={errors} touched={touched} set={set} touch={touch} onBack={() => setStep(1)} onNext={next2} />}
          {!status && step === 3 && <StepFinancials form={form} errors={errors} touched={touched} set={set} touch={touch} onBack={() => setStep(2)} onNext={next3} />}
          {!status && step === 4 && <StepReview    form={form} onBack={() => setStep(3)} onSubmit={submit} loading={loading} onJump={setStep} />}
        </div>

        {/* Trust note */}
        {!status && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style={{ fontSize: 11, color: C.muted }}>256-bit SSL · Soft credit check only · No obligation · Data never sold</span>
          </div>
        )}
      </div>

      {/* ── DEMO AUTOFILL BAR ─────────────────────────────────────────── */}
      {(!status || status === 'processing') && (
        <div style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Demo</span>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />
          <button
            onClick={() => navigate('/email')}
            style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 4px', letterSpacing: '0.04em' }}
            onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
            onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
          >
            ← Email
          </button>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />
          {status === 'processing' && (
            <button
              onClick={togglePause}
              style={{ fontSize: 11, fontWeight: 700, color: paused ? 'rgba(147,221,186,0.9)' : 'rgba(255,255,255,0.7)', background: paused ? 'rgba(1,97,99,0.25)' : 'rgba(255,255,255,0.1)', border: `1px solid ${paused ? 'rgba(1,97,99,0.4)' : 'rgba(255,255,255,0.15)'}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
          {!status && (<>
          <button
            onClick={() => {
              setFormState({
                address: '1482 Sunridge Drive', apt: '', city: 'Sacramento', state: 'CA',
                propertyValue: '$685,000', mortgageBalance: '$312,000',
                firstName: 'Alex', lastName: 'Rivera', dob: '07/14/1985',
                phone: '(530) 812-1006', email: 'alex.rivera@email.com',
                employment: 'employed', income: '100-150k', credit: '700-739', homeowner: 'yes',
              })
              setTouched({})
              setErrors({})
              setStep(1)
            }}
            style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            ⚡ Fill all steps
          </button>
          <button
            onClick={() => {
              setFormState({
                address: '1482 Sunridge Drive', apt: '', city: 'Sacramento', state: 'CA',
                propertyValue: '$685,000', mortgageBalance: '$312,000',
                firstName: 'Alex', lastName: 'Rivera', dob: '07/14/1985',
                phone: '(530) 812-1006', email: 'alex.rivera@email.com',
                employment: 'employed', income: '100-150k', credit: '700-739', homeowner: 'yes',
              })
              setTouched({})
              setErrors({})
              setStep(4)
            }}
            style={{ fontSize: 11, fontWeight: 700, color: 'rgba(147,221,186,0.9)', background: 'rgba(1,97,99,0.25)', border: '1px solid rgba(1,97,99,0.4)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(1,97,99,0.4)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(1,97,99,0.25)'}
          >
            → Skip to Review
          </button>
          <button
            onClick={() => { setFormState({ ...INITIAL_FORM, firstName: prefill.firstName || '', lastName: prefill.lastName || '', address: prefill.address || '', city: prefill.city || '', state: prefill.state || '' }); setTouched({}); setErrors({}); setStep(1) }}
            style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 4px', letterSpacing: '0.04em' }}
            onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
          >
            Reset
          </button>
          </>)}
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <div style={{ background: C.navy, padding: '28px 24px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/><circle cx="6" cy="6" r="2" fill="rgba(255,255,255,0.4)"/></svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>GreenLyne</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>with OWNING · NMLS #2611</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Privacy Policy','Terms of Use','Contact'].map(l => (
                <a key={l} href="#" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{l}</a>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>
            This is not a guaranteed offer and is subject to final credit approval, property review, and funding conditions. A soft credit inquiry will be performed and will not affect your credit score. GreenLyne operates as a technology platform connecting borrowers with lenders. OWNING NMLS #2611 is the lender of record. Equal Housing Lender. Westhaven Power CA State Lic. 965111. © 2025 GreenLyne. All rights reserved.
          </p>
        </div>
      </div>

    </div>
  )
}
