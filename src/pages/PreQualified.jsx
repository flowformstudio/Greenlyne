/**
 * PreQualified — matches Figma node 458:2
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WesthavenHeader from '../components/WesthavenHeader'

// ── Brand icons ──────────────────────────────────────────────────────────────
function IconSafe({ size = 20, fill = '#001660' }) {
  return (
    <svg width={size} height={size * 107 / 128} viewBox="0 0 128 107" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M127.6,41V0.6H0.8v85.3h21.9v20.8h4V85.9h74.4v20.8h4V85.9h22.5V45h-22c-0.9,13.2-11.9,23.7-25.3,23.7c-14,0-25.4-11.4-25.4-25.4c0-14,11.4-25.4,25.4-25.4c13.2,0,24.1,10.2,25.3,23.1H127.6z" fill={fill}/>
      <path d="M80.3,21.9C68.6,21.9,59,31.5,59,43.3s9.6,21.4,21.4,21.4s21.4-9.6,21.4-21.4S92.1,21.9,80.3,21.9z M80.3,51.3c-4.5,0-8.1-3.6-8.1-8.1c0-4.5,3.6-8.1,8.1-8.1s8.1,3.6,8.1,8.1C88.4,47.7,84.8,51.3,80.3,51.3z" fill={fill}/>
    </svg>
  )
}
function IconCheck({ size = 20, fill = '#001660' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 174 174" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M65.3 138.3L25.1 98.1L27.7 95.5L65.3 133.2L151.3 47.2L153.9 49.8L65.3 138.3Z" fill={fill}/>
    </svg>
  )
}
function IconCertified({ size = 20, fill = '#001660' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M129 64.9L110.2 46.2V19.7H83.7L65 0.9L46.2 19.7H19.7V46.2L1 64.9L19.8 83.6V110.1H46.3L65 128.9L83.7 110.1H110.2V83.6L129 64.9ZM55.7 86.6L38.7 68.7L41.3 66.2L55.6 81.3L88.4 46.8L91 49.3L55.7 86.6Z" fill={fill}/>
    </svg>
  )
}
function IconBank({ size = 20, fill = '#001660' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 130" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M127.2 62.3V62L64.7 1.2L1.5 62V62.3H26.9V107.3H1.5V129.2H127.2V107.3H101.8V62.3H127.2ZM60.3 107.3H34.9V62.3H60.3V107.3ZM93.7 107.3H68.4V62.3H93.8V107.3H93.7Z" fill={fill}/>
    </svg>
  )
}

const C = {
  navy:     '#001660',
  blue:     '#254BCE',
  teal:     '#016163',
  green:    '#93DDBA',
  bg:       '#F5F1EE',
  white:    '#ffffff',
  border:   '#D1D5DB',
  muted:    '#6B7280',
  text:     '#111827',
  label:    '#4B5563',
  offwhite: '#F9FAFB',
}

const OFFER = {
  name:        'Alex',
  creditLimit: '$131,800',
  initialDraw: '$91,800',
  available:   '$40,000',
  monthly:     '$593',
  rate:        '7.75%',
  estAPR:      '~7.95%',
  savings:     '$55',
  currentBill: '$220',
  origFee:     '$3,295',
  origPct:     '2.5%',
}

function Chevron({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
      <path d="M3 5L7 9L11 5" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Accordion({ title, children, noBorder }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: noBorder ? 'none' : `1px solid ${C.border}` }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</span>
        <Chevron open={open} />
      </button>
      {open && <div style={{ paddingBottom: 20 }}>{children}</div>}
    </div>
  )
}

export default function PreQualified() {
  const navigate = useNavigate()
  const [callRequested, setCallRequested] = useState(false)

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: "'PostGrotesk', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column',
    }}>
      <WesthavenHeader lender="grand-bank" />

      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px 72px' }}>

          {/* ── HERO ── */}
          <div style={{ padding: '44px 0 32px', maxWidth: 600 }}>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(1,97,99,0.08)', border: '1px solid rgba(1,97,99,0.2)', borderRadius: 20, padding: '5px 14px 5px 12px', marginBottom: 22 }}>
              <div style={{ width: 7, height: 7, borderRadius: '3.5px', background: C.teal, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pre-qualification complete</span>
            </div>

            <h1 style={{ fontSize: 38, fontWeight: 900, color: C.navy, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 16px' }}>
              Good news, {OFFER.name}! You&apos;re pre-qualified for solar financing.
            </h1>

            <p style={{ fontSize: 16, color: C.label, lineHeight: 1.65, margin: '0 0 22px', maxWidth: 520 }}>
              Your home qualifies for a Solar Home Equity Line of Credit. Review your estimated offer below and choose how you&apos;d like to continue.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
              {[
                { text: 'Secure & private',             icon: <IconSafe      size={15} fill={C.muted} /> },
                { text: 'Soft check — no score impact', icon: <IconCheck     size={15} fill={C.muted} /> },
                { text: 'No obligation',                icon: <IconCertified size={15} fill={C.muted} /> },
              ].map(({ text, icon }, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted, fontWeight: 500 }}>
                  {icon}
                  {text}
                  {i < 2 && <span style={{ margin: '0 5px', color: C.border }}>·</span>}
                </span>
              ))}
            </div>
          </div>

          {/* ── OFFER CARD ── */}
          <div style={{
            background: C.navy, borderRadius: 16, marginBottom: 24,
            display: 'grid', gridTemplateColumns: '55% 45%',
            overflow: 'hidden', minHeight: 300,
          }}>

            {/* Left — credit limit, vertically centered */}
            <div style={{ padding: '36px 38px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Est. Credit Limit
              </div>
              <div style={{ fontSize: 60, fontWeight: 900, color: C.white, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 16 }}>
                {OFFER.creditLimit}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 18 }}>Solar HELOC · {OFFER.origPct} origination fee</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Initial draw</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: C.green, letterSpacing: '0em' }}>{OFFER.initialDraw}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Available after</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0em' }}>{OFFER.available}</div>
                </div>
              </div>
            </div>

            {/* Right — white payment card, inset inside the dark card */}
            <div style={{ padding: '14px 14px 14px 0', display: 'flex' }}>
              <div style={{ background: C.white, borderRadius: 10, padding: '20px 22px', flex: 1, boxShadow: '0 2px 16px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Est. Monthly Payment
                  </div>
                  <div style={{ background: 'rgba(37,75,206,0.08)', border: '1px solid rgba(37,75,206,0.15)', borderRadius: 20, padding: '3px 9px', fontSize: 10, fontWeight: 700, color: C.blue, whiteSpace: 'nowrap' }}>
                    Est. APR {OFFER.estAPR}
                  </div>
                </div>

                {/* Payment amount */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: C.navy, letterSpacing: '-1.5px', lineHeight: 1 }}>{OFFER.monthly}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: C.muted }}>/mo</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Interest-only during draw period</div>

                {/* Rate */}
                <div style={{ paddingTop: 10, borderTop: `1px solid ${C.border}`, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Interest rate</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>{OFFER.rate}</div>
                </div>

                {/* Savings callout */}
                <div style={{ background: 'rgba(1,97,99,0.07)', border: '1.5px solid rgba(1,97,99,0.2)', borderRadius: 10, padding: '10px 12px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Est. Electricity Savings</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.teal, letterSpacing: '0em', lineHeight: 1, whiteSpace: 'nowrap' }}>
                      −{OFFER.savings}<span style={{ fontSize: 11, fontWeight: 600 }}>/mo</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(1,97,99,0.6)' }}>Based on your reported bill</div>
                </div>

              </div>
            </div>
          </div>

          {/* ── CTA SECTION ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 8, marginTop: 24, alignItems: 'stretch' }}>

            {/* PRIMARY */}
            <div style={{ background: C.white, border: `2px solid ${C.blue}`, borderRadius: 18, padding: '28px 28px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Self-serve · Fastest</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 10 }}>Continue Online</div>
              <p style={{ fontSize: 14, color: C.label, lineHeight: 1.65, margin: '0 0 20px' }}>
                Your offer is already configured. Complete income verification, confirm your identity, and e-sign — all in one secure flow.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 22 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={{ fontSize: 15, color: C.muted, fontWeight: 500 }}>Takes about 5–10 minutes</span>
              </div>
              <button
                onClick={() => navigate('/create-account')}
                style={{
                  width: '100%', padding: '15px 0', borderRadius: 12,
                  border: 'none', background: C.blue, color: C.white,
                  fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  letterSpacing: '-0.1px',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#1e3fa8'}
                onMouseOut={e => e.currentTarget.style.background = C.blue}
              >
                Activate My Loan →
              </button>
              <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 }}>
                Not a guarantee of final approval. Final terms subject to verification.
              </p>
            </div>

            {/* SECONDARY */}
            <div style={{ background: C.offwhite, border: `1.5px solid ${C.border}`, borderRadius: 18, padding: '28px 24px 24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 12 }}>Talk to a Specialist</div>
              <p style={{ fontSize: 14, color: C.label, lineHeight: 1.65, margin: '0 0 20px', flex: 1 }}>
                Have questions? A GreenLyne specialist will walk you through every line of your offer — no pressure, on your schedule.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Calls back within 5–10 min</span>
              </div>
              {callRequested ? (
                <div style={{
                  width: '100%', padding: '14px 0', borderRadius: 12, boxSizing: 'border-box',
                  background: 'rgba(1,97,99,0.08)', color: C.teal,
                  fontSize: 14, fontWeight: 700, textAlign: 'center',
                }}>
                  ✓ We&apos;ll call you shortly
                </div>
              ) : (
                <button
                  onClick={() => setCallRequested(true)}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 12,
                    border: `1.5px solid ${C.border}`, background: 'transparent',
                    color: C.navy, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = C.bg}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  Request a Call
                </button>
              )}
            </div>
          </div>

          {/* ── WHAT HAPPENS NEXT ── */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20, marginTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>What happens next</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: <IconBank      size={18} fill={C.blue} />, title: 'Verify income',    body: 'Link your bank via Plaid or upload a recent W-2.' },
                { icon: <IconCertified size={18} fill={C.blue} />, title: 'Confirm identity', body: 'Quick photo ID check to secure your account.' },
                { icon: <IconCheck     size={18} fill={C.blue} />, title: 'Review & e-sign',  body: 'Confirm your terms and sign your loan agreement.' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(37,75,206,0.07)', border: '1px solid rgba(37,75,206,0.13)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {s.icon}
                  </div>
                  <div style={{ paddingTop: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.title}</span>
                    <span style={{ fontSize: 14, color: C.label }}> — {s.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── ACCORDIONS ── */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '4px 24px', marginBottom: 32 }}>

            <Accordion title="How is this calculated?">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { label: 'Credit limit',                                    value: OFFER.creditLimit },
                  { label: 'Initial draw (solar installation)',                value: OFFER.initialDraw },
                  { label: 'Available line after draw',                        value: OFFER.available },
                  { label: 'Interest rate (variable, prime-linked)',           value: OFFER.rate },
                  { label: `Origination fee (${OFFER.origPct}, rolled in)`,   value: OFFER.origFee },
                  { label: 'Est. draw-period payment (interest-only)',         value: OFFER.monthly + '/mo', accent: true },
                  { label: 'Estimated APR',                                    value: OFFER.estAPR },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: C.label }}>{row.label}</span>
                    <span style={{ fontSize: 16, fontWeight: row.accent ? 800 : 600, color: row.accent ? C.teal : C.navy }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: '14px 0 0', lineHeight: 1.6 }}>
                Estimated APR is calculated as the interest rate plus a proportional component of the origination fee. Actual APR will vary based on final draw amount and timing.
              </p>
            </Accordion>

            <Accordion title="Your electricity savings">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Current avg. monthly electric bill', value: OFFER.currentBill + '/mo' },
                  { label: 'Est. bill after solar',              value: '~$165/mo' },
                  { label: 'Est. monthly electricity savings',   value: '~' + OFFER.savings + '/mo', accent: true },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: row.accent ? C.teal : C.label, fontWeight: row.accent ? 600 : 400 }}>{row.label}</span>
                    <span style={{ fontSize: 16, fontWeight: row.accent ? 800 : 600, color: row.accent ? C.teal : C.navy }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: '10px 0 0', lineHeight: 1.6 }}>
                Electricity savings are estimated based on your reported monthly bill and a typical 75% production offset. Actual savings depend on system size, utility rates, and usage patterns.
              </p>
            </Accordion>

            <Accordion title="Legal disclosures & full terms" noBorder>
              <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.7, margin: 0 }}>
                This offer is based on a pre-screening of information from your credit report indicating you may meet certain criteria. This is not a guarantee of credit or final loan approval. Acceptance of this offer is subject to GreenLyne&apos;s underwriting criteria, including satisfactory property appraisal, income verification, title review, and lender approval.
                <br /><br />
                This pre-qualification used a soft credit inquiry and will not affect your credit score. A hard inquiry will be made only if you proceed to a formal application.
                <br /><br />
                Financing is provided by <img src="/owning-logo.webp" alt="Owning" style={{ height: 11, verticalAlign: 'middle', display: 'inline', margin: '0 2px' }} />, a dba of Guaranteed Rate, Inc. NMLS #2611. Equal Housing Lender. GreenLyne is a technology platform and is not a lender. Rates and terms are subject to change without notice. Variable rate HELOC terms apply. CA Lic. 965111.
                <br /><br />
                Pre-screen opt-out: If you do not wish to receive prescreened offers of credit, call 1-888-5-OPT-OUT (1-888-567-8688) or visit optoutprescreen.com.
              </p>
            </Accordion>
          </div>

        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: C.offwhite, borderTop: `1px solid ${C.border}`, padding: '20px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 10, color: C.muted, margin: 0, lineHeight: 1.6, maxWidth: 500 }}>
            © 2025 Westhaven Power. Financing powered by GreenLyne. Lending by <img src="/owning-logo.webp" alt="Owning" style={{ height: 10, verticalAlign: 'middle', display: 'inline', margin: '0 2px' }} /> (dba Guaranteed Rate, Inc.), NMLS #2611. Equal Housing Lender. Terms are estimates and subject to final verification and approval.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {['Privacy Policy', 'Terms', 'Help'].map(link => (
              <span key={link} style={{ fontSize: 11, color: C.muted, cursor: 'pointer' }}>{link}</span>
            ))}
            <button
              onClick={() => navigate('/email')}
              style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
            >
              ← Restart Demo
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
