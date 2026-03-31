/**
 * PreQualified — Conversion-focused offer decision page
 * Redesigned: merchant-first branding, outcome hero, two-column CTA, accordion details
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WesthavenHeader from '../components/WesthavenHeader'

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
  name:         'Alex',
  creditLimit:  '$131,800',
  initialDraw:  '$91,800',
  available:    '$40,000',
  monthlyDraw:  '$593',
  rate:         '7.75%',
  estAPR:       '~7.95%',
  savings:      '~$55',
  currentBill:  '$220',
  origFee:      '$3,295',
  origPct:      '2.5%',
}

function Chevron({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
      <path d="M3 5L7 9L11 5" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div style={{ paddingBottom: 20 }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function PreQualified() {
  const navigate = useNavigate()
  const [callRequested, setCallRequested] = useState(false)

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      display: 'flex',
      flexDirection: 'column',
    }}>

      <WesthavenHeader />

      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px 72px' }}>

          {/* ── HERO ─────────────────────────────────────────────── */}
          <div style={{ padding: '44px 0 32px', maxWidth: 600 }}>

            {/* Eyebrow */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(1,97,99,0.08)', border: '1px solid rgba(1,97,99,0.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.teal }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pre-qualification complete</span>
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: C.navy, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 14px' }}>
              Good news, {OFFER.name} — you&apos;re pre-qualified for solar financing.
            </h1>

            {/* Subhead */}
            <p style={{ fontSize: 16, color: C.label, lineHeight: 1.65, margin: '0 0 22px', maxWidth: 520 }}>
              Your home qualifies for a Solar Home Equity Line of Credit. Review your estimated offer below and choose how you&apos;d like to continue.
            </p>

            {/* Trust strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {[
                { icon: '🔒', text: 'Secure & private' },
                { icon: '✓',  text: 'Soft check — no score impact' },
                { icon: '○',  text: 'No obligation' },
              ].map((item, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.muted, fontWeight: 500 }}>
                  <span style={{ fontSize: 11 }}>{item.icon}</span>
                  {item.text}
                  {i < 2 && <span style={{ marginLeft: 6, color: C.border }}>·</span>}
                </span>
              ))}
            </div>
          </div>

          {/* ── TWO METRIC TILES ─────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>

            {/* Tile 1 — Credit limit */}
            <div style={{ background: C.navy, borderRadius: 16, padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Est. Credit Limit</div>
              <div style={{ fontSize: 38, fontWeight: 900, color: C.white, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 8 }}>{OFFER.creditLimit}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Solar HELOC · {OFFER.origPct} origination fee</div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>Initial draw</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{OFFER.initialDraw}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>Available after</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{OFFER.available}</div>
                </div>
              </div>
            </div>

            {/* Tile 2 — Monthly payment */}
            <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Est. Monthly Payment</div>
                <div style={{ background: 'rgba(37,75,206,0.08)', border: '1px solid rgba(37,75,206,0.15)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: C.blue, whiteSpace: 'nowrap' }}>
                  Est. APR {OFFER.estAPR}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 38, fontWeight: 900, color: C.navy, letterSpacing: '-1.5px', lineHeight: 1 }}>{OFFER.monthlyDraw}</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: C.muted }}>/mo</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Interest-only during draw period</div>
              <div style={{ paddingTop: 14, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>Interest rate</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{OFFER.rate}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>Est. electricity savings</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.teal, letterSpacing: '-0.5px', lineHeight: 1 }}>{OFFER.savings}<span style={{ fontSize: 13, fontWeight: 600 }}>/mo</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CTA SECTION — two column desktop ─────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 8, alignItems: 'stretch' }}>

            {/* PRIMARY — Continue Online */}
            <div style={{ background: C.white, border: `2px solid ${C.blue}`, borderRadius: 18, padding: '28px 28px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Self-serve · Fastest</div>
              <div style={{ fontSize: 21, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em', marginBottom: 10 }}>Continue Online</div>
              <p style={{ fontSize: 14, color: C.label, lineHeight: 1.65, margin: '0 0 20px' }}>
                Your offer is already configured. Complete income verification, confirm your identity, and e-sign — all in one secure flow.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Takes about 5–10 minutes</span>
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
              <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', margin: '10px 0 0', lineHeight: 1.5 }}>
                Not a guarantee of final approval. Final terms subject to verification.
              </p>
            </div>

            {/* SECONDARY — Talk to Specialist */}
            <div style={{ background: C.offwhite, border: `1.5px solid ${C.border}`, borderRadius: 18, padding: '28px 24px 24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 21, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em', marginBottom: 10 }}>Talk to a Specialist</div>
              <p style={{ fontSize: 14, color: C.label, lineHeight: 1.65, margin: '0 0 20px', flex: 1 }}>
                Have questions? A GreenLyne specialist will walk you through every line of your offer — no pressure, on your schedule.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
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

          {/* ── NEXT STEPS BOX ───────────────────────────────────── */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 32, marginTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>What happens next</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { n: '1', title: 'Verify income', body: 'Link your bank via Plaid or upload a recent W-2.' },
                { n: '2', title: 'Confirm identity', body: 'Quick photo ID check to secure your account.' },
                { n: '3', title: 'Review & e-sign', body: 'Confirm your terms and sign your loan agreement.' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(37,75,206,0.08)', border: '1px solid rgba(37,75,206,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>{s.n}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.title}</span>
                    <span style={{ fontSize: 14, color: C.label }}> — {s.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── ACCORDIONS ───────────────────────────────────────── */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '4px 24px', marginBottom: 32 }}>

            <Accordion title="How is this calculated?">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Credit limit',                            value: OFFER.creditLimit },
                  { label: 'Initial draw (solar installation)',        value: OFFER.initialDraw },
                  { label: 'Available line after draw',                value: OFFER.available },
                  { label: 'Interest rate (variable, prime-linked)',   value: OFFER.rate },
                  { label: `Origination fee (${OFFER.origPct}, rolled in)`, value: OFFER.origFee },
                  { label: 'Est. draw-period payment (interest-only)', value: OFFER.monthlyDraw + '/mo', accent: true },
                  { label: 'Estimated APR',                            value: OFFER.estAPR },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: C.label }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: row.accent ? 800 : 600, color: row.accent ? C.teal : C.navy }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: '14px 0 0', lineHeight: 1.6 }}>
                Estimated APR is calculated as the interest rate plus a proportional component of the origination fee. Actual APR will vary based on final draw amount and timing. Final payment may differ within ±10–15% of this estimate.
              </p>
            </Accordion>

            <Accordion title="Your electricity savings">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.label }}>Current avg. monthly electric bill</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{OFFER.currentBill}/mo</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.label }}>Est. bill after solar</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>~$165/mo</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.teal }}>Est. monthly electricity savings</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.teal }}>{OFFER.savings}/mo</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: '10px 0 0', lineHeight: 1.6 }}>
                Electricity savings are estimated based on your reported monthly bill and a typical 75% production offset. Actual savings depend on system size, utility rates, and usage patterns.
              </p>
            </Accordion>

            <Accordion title="Legal disclosures & full terms">
              <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.7, margin: 0 }}>
                This offer is based on a pre-screening of information from your credit report indicating you may meet certain criteria. This is not a guarantee of credit or final loan approval. Acceptance of this offer is subject to your meeting GreenLyne&apos;s underwriting criteria, including satisfactory property appraisal, income verification, title review, and lender approval.
                <br /><br />
                This pre-qualification used a soft credit inquiry and will not affect your credit score. A hard inquiry will be made only if you proceed to a formal application.
                <br /><br />
                Financing is provided by Owning, a dba of Guaranteed Rate, Inc. NMLS #2611. Equal Housing Lender. GreenLyne is a technology platform and is not a lender. Rates and terms are subject to change without notice. Variable rate HELOC terms apply; rate may increase after closing. CA Lic. 965111.
                <br /><br />
                Pre-screen opt-out: If you do not wish to receive prescreened offers of credit, call 1-888-5-OPT-OUT (1-888-567-8688) or visit optoutprescreen.com.
              </p>
            </Accordion>
          </div>

        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <div style={{ background: C.offwhite, borderTop: `1px solid ${C.border}`, padding: '20px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 10, color: C.muted, margin: 0, lineHeight: 1.6, maxWidth: 500 }}>
            © 2025 Westhaven Power. Financing powered by GreenLyne. Lending by Owning (dba Guaranteed Rate, Inc.), NMLS #2611. Equal Housing Lender. Terms are estimates and subject to final verification and approval.
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
