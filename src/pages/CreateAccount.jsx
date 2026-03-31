import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const C = {
  navy:   '#001660',
  blue:   '#254BCE',
  teal:   '#016163',
  green:  '#93DDBA',
  bg:     '#F5F1EE',
  white:  '#ffffff',
  border: 'rgba(0,22,96,0.12)',
  muted:  '#6B7280',
  label:  '#445566',
  text:   '#111827',
  err:    '#dc2626',
  errBg:  '#FEF2F2',
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function CreateAccount() {
  const navigate = useNavigate()
  const location = useLocation()
  const passedState = location.state || {}

  const [phone, setPhone]         = useState('(408) 555-0183')
  const [email, setEmail]         = useState('alex.rivera@email.com')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [agreed1, setAgreed1]     = useState(false)
  const [agreed2, setAgreed2]     = useState(false)
  const [agreed3, setAgreed3]     = useState(false)
  const [agreed4, setAgreed4]     = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function maskPhone(v) {
    const d = v.replace(/\D/g, '').slice(0, 10)
    if (d.length < 4) return d
    if (d.length < 7) return `(${d.slice(0,3)}) ${d.slice(3)}`
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  }

  const pwValid = password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*]/.test(password)

  const pwMatch = password === confirm && confirm.length > 0
  const allLegal = agreed1 && agreed2 && agreed3 && agreed4

  const canSubmit = phone.replace(/\D/g,'').length === 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    pwValid && pwMatch && allLegal

  function handleSubmit() {
    setSubmitted(true)
    if (!canSubmit) return
    navigate('/pos-demo', { state: passedState })
  }

  const fieldErr = (condition) => submitted && !condition

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* Header */}
      <div style={{
        width: '100%',
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <img src="/greenlyne-logo.svg" alt="GreenLyne" style={{ height: 18, width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>for Westhaven Power</span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 520, padding: '32px 20px 60px' }}>

        {/* Progress indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          {['Pre-qualified', 'Create Account', 'Application'].map((label, i) => {
            const done = i === 0
            const active = i === 1
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < 2 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: done ? C.teal : active ? C.blue : 'transparent',
                    border: `2px solid ${done ? C.teal : active ? C.blue : C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {done
                      ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <span style={{ fontSize: 10, fontWeight: 700, color: active ? C.white : C.muted }}>{i + 1}</span>
                    }
                  </div>
                  <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? C.navy : done ? C.teal : C.muted, whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div style={{ flex: 1, height: 1.5, background: done ? C.teal : C.border, borderRadius: 2 }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Intro */}
        <h1 style={{ fontSize: 24, fontWeight: 900, color: C.navy, margin: '0 0 6px', letterSpacing: '-0.4px' }}>
          You're one step away
        </h1>
        <p style={{ fontSize: 14, color: C.label, margin: '0 0 28px', lineHeight: 1.6 }}>
          Set up your account so we can save your progress and continue your application.
        </p>

        {/* ── Contact fields ── */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Contact Info
          </div>

          <FormField
            label="Phone number"
            helper="Phone number may be used for communications related to your pre-qualification request, application or account."
            error={fieldErr(phone.replace(/\D/g,'').length === 10) ? 'Enter a valid 10-digit phone number' : null}
          >
            <Input
              value={phone}
              onChange={v => setPhone(maskPhone(v))}
              placeholder="(555) 000-0000"
              type="tel"
            />
          </FormField>

          <FormField
            label="Email address"
            helper="We need to send your pre-qualification somewhere."
            error={fieldErr(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ? 'Enter a valid email address' : null}
            last
          >
            <Input
              value={email}
              onChange={setEmail}
              placeholder="you@email.com"
              type="email"
            />
          </FormField>
        </div>

        {/* ── Password fields ── */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Create Password
          </div>

          <FormField
            label="Password"
            helper="Your password must be at least 12 characters long, including uppercase, lowercase, number, and special character (!@#$%^&*)."
            error={submitted && password.length > 0 && !pwValid ? 'Password does not meet requirements' : null}
          >
            <div style={{ position: 'relative' }}>
              <Input
                value={password}
                onChange={setPassword}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••••••"
              />
              <button
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0 }}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
            {password.length > 0 && (
              <PwStrength password={password} />
            )}
          </FormField>

          <FormField
            label="Confirm password"
            error={submitted && confirm.length > 0 && !pwMatch ? 'Passwords do not match' : null}
            last
          >
            <div style={{ position: 'relative' }}>
              <Input
                value={confirm}
                onChange={setConfirm}
                type={showCf ? 'text' : 'password'}
                placeholder="••••••••••••"
              />
              <button
                onClick={() => setShowCf(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0 }}
              >
                <EyeIcon open={showCf} />
              </button>
            </div>
          </FormField>
        </div>

        {/* ── Legal consents ── */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Agreements
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <LegalCheck
              checked={agreed1}
              onChange={setAgreed1}
              error={submitted && !agreed1}
            >
              I agree to the{' '}
              <a href="#" style={{ color: C.blue }}>Privacy Policy</a> and{' '}
              <a href="#" style={{ color: C.blue }}>Terms of Service</a>.
            </LegalCheck>
            <LegalCheck
              checked={agreed2}
              onChange={setAgreed2}
              error={submitted && !agreed2}
            >
              I certify that by checking this box I have read Owning's Electronic Communications Policy, and consent to receiving all legally required notices and disclosures and other communications from Owning electronically and not on paper.
            </LegalCheck>
            <LegalCheck
              checked={agreed3}
              onChange={setAgreed3}
              error={submitted && !agreed3}
            >
              By pressing 'Create Account & Continue' I am providing written instructions to Owning under the Fair Credit Reporting Act authorizing Owning to obtain information from my personal credit profile or other information from Experian solely to conduct a pre-qualification for credit. This will not affect my credit score.
            </LegalCheck>
            <LegalCheck
              checked={agreed4}
              onChange={setAgreed4}
              error={submitted && !agreed4}
            >
              You also consent to Forward Lending, Inc. ('Method'), a third party service used by Owning, to perform a soft credit pull to identify your liabilities. A soft pull does not affect your credit score.
            </LegalCheck>
          </div>
        </div>

        {/* Reassurance */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 20 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span style={{ fontSize: 13, color: C.teal, fontWeight: 600 }}>Pre-qualification won't affect your credit score</span>
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          style={{
            width: '100%', padding: '16px',
            background: C.blue, color: C.white,
            fontSize: 16, fontWeight: 700,
            border: 'none', borderRadius: 14, cursor: 'pointer',
            letterSpacing: '-0.2px',
          }}
        >
          Create Account & Continue
        </button>

        {submitted && !canSubmit && (
          <p style={{ textAlign: 'center', fontSize: 13, color: C.err, marginTop: 10 }}>
            Please complete all required fields and agreements above.
          </p>
        )}

        {/* Back */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', fontSize: 13, color: C.muted, cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>

      </div>
    </div>
  )
}

function FormField({ label, helper, error, last, children }) {
  return (
    <div style={{ marginBottom: last ? 0 : 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.label, marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {helper && !error && (
        <p style={{ fontSize: 11, color: C.muted, margin: '5px 0 0', lineHeight: 1.5 }}>{helper}</p>
      )}
      {error && (
        <p style={{ fontSize: 11, color: C.err, margin: '5px 0 0' }}>{error}</p>
      )}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '11px 14px', fontSize: 14,
        border: `1.5px solid ${C.border}`, borderRadius: 10,
        background: '#FAFAFA', color: C.text,
        outline: 'none', fontFamily: 'inherit',
      }}
      onFocus={e => e.target.style.borderColor = C.blue}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  )
}

function PwStrength({ password }) {
  const checks = [
    password.length >= 12,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const color = score <= 2 ? '#dc2626' : score <= 3 ? '#f59e0b' : C.teal

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? color : C.border, transition: 'background 0.2s' }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
        {['12+ chars', 'uppercase', 'lowercase', 'number', 'special char (!@#$%^&*)']
          .map((req, i) => (
            <span key={req} style={{ color: checks[i] ? C.teal : C.muted, marginRight: 8 }}>
              {checks[i] ? '✓' : '·'} {req}
            </span>
          ))}
      </div>
    </div>
  )
}

function LegalCheck({ checked, onChange, error, children }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', gap: 12, cursor: 'pointer',
        padding: '10px 12px',
        borderRadius: 10,
        background: error ? C.errBg : checked ? 'rgba(1,97,99,0.04)' : 'transparent',
        border: `1px solid ${error ? '#FCA5A5' : checked ? 'rgba(1,97,99,0.15)' : C.border}`,
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
        background: checked ? C.teal : C.white,
        border: `2px solid ${checked ? C.teal : C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <p style={{ fontSize: 12, color: C.label, margin: 0, lineHeight: 1.6 }}>{children}</p>
    </div>
  )
}
