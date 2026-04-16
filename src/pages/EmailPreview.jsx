import { useNavigate } from 'react-router-dom'

const CTA_ROUTE = '/offer'

const C = {
  dark:    '#101010',
  dark2:   '#2a2a2a',
  red:     '#D82020',
  green:   '#38B715',
  greenBg: 'rgba(56,183,21,0.11)',
  navy:    '#001660',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray100: '#F3F4F6',
  gray50:  '#F9FAFB',
  gray200: '#E5E7EB',
  muted:   '#C0C7D4',
  white:   '#ffffff',
  bg:      '#EDEAE6',
}

export default function EmailPreview() {
  const navigate = useNavigate()
  const go = e => {
    e.preventDefault()
    navigate(CTA_ROUTE, {
      state: {
        firstName: 'Alex', lastName: 'Rivera',
        address: '1482 Sunridge Drive', city: 'Sacramento', state: 'CA',
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── Email client chrome ─────────────────────────────────── */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.gray200}`, padding: '14px 0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: C.navy,
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <img src="/westhaven-logo-new.avif" alt="WP" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Trevor Evanson — Westhaven Power</span>
                <span style={{ fontSize: 12, color: C.gray400 }}>trevor@westhavenpower.com</span>
              </div>
              <div style={{ fontSize: 12, color: C.gray400, marginTop: 1 }}>To: alex.rivera@email.com</div>
            </div>
            <div style={{ fontSize: 12, color: C.gray400, whiteSpace: 'nowrap' }}>Today, 9:14 AM</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', paddingLeft: 46 }}>
            Alex, your solar offer is ready
          </div>
        </div>
      </div>

      {/* ── Email body ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 640, margin: '28px auto', padding: '0 16px 60px' }}>
        <div style={{ background: C.white, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 24px rgba(0,0,0,0.08)' }}>

          {/* HEADER */}
          <div style={{
            padding: '20px 32px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', borderBottom: `1px solid ${C.gray100}`,
          }}>
            <img src="/westhaven-logo-new.avif" alt="Westhaven Power" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#001660' }}>Financing powered by</span>
                <img src="/greenlyne-logo.svg" alt="GreenLyne" style={{ height: 15, width: 'auto' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10, color: '#bcc7d5' }}>Lending services by</span>
                <img src="/grand-bank-logo.png" alt="Grand Bank" style={{ height: 11, width: 'auto', objectFit: 'contain' }} />
                <span style={{ fontSize: 10, color: '#bcc7d5' }}>NMLS #2611</span>
              </div>
            </div>
          </div>

          {/* COVER PHOTO */}
          <div style={{ padding: '16px 16px 0' }}>
            <img
              src="/solar-heat-map.jpg"
              alt="Solar heat map — 1482 Sunridge Drive"
              style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'center center', borderRadius: 10, display: 'block' }}
            />
          </div>

          {/* HERO */}
          <div style={{ padding: '36px 32px 32px' }}>

            {/* Badge — green */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: C.greenBg, borderRadius: 20, padding: '4px 12px', marginBottom: 20,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: C.green }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: '0.04em' }}>YOUR OFFER IS READY</span>
            </div>

            {/* Headline — 39px, dark, red highlights */}
            <h1 style={{ fontSize: 39, fontWeight: 800, color: C.dark2, lineHeight: 1.05, letterSpacing: '-0.5px', margin: '0 0 16px' }}>
              Hi Alex! Your home <span style={{ color: C.red }}>qualifies</span> for <span style={{ color: C.red }}>solar financing.</span>
            </h1>

            {/* Narrative */}
            <p style={{ fontSize: 16, color: C.gray500, lineHeight: 1.7, margin: '0 0 28px' }}>
              Your Westhaven consultant pre-screened <strong style={{ color: C.dark, fontWeight: 700 }}>1482 Sunridge Drive</strong> and
              we&apos;ve pre-built a solar HELOC offer for your property.
              No hard credit pull, no commitment — just your numbers.
            </p>

            {/* Stat cards — white with shadow */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
              {/* Savings card */}
              <div style={{ background: C.white, borderRadius: 12, padding: '20px 20px 18px', boxShadow: '0 4px 9px rgba(0,0,0,0.21)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(16,16,16,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  Est. Monthly Savings
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: C.green, letterSpacing: '-1px', lineHeight: 1, marginBottom: 6 }}>
                  ~$55<span style={{ fontSize: 16, fontWeight: 600, color: '#b8b8b8' }}>/mo</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(16,16,16,0.5)', lineHeight: 1.5 }}>Based on your current bill</div>
              </div>
              {/* Pre-approved card */}
              <div style={{ background: C.white, borderRadius: 12, padding: '20px 20px 18px', boxShadow: '0 4px 9px rgba(0,0,0,0.21)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(16,16,16,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  Pre-Approved Amount
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: C.dark2, letterSpacing: '-1px', lineHeight: 1, marginBottom: 6 }}>
                  $131,800
                </div>
                <div style={{ fontSize: 10, color: 'rgba(16,16,16,0.5)' }}>Solar Home Equity Line of Credit</div>
              </div>
            </div>

            {/* Primary CTA — centered, not full-width */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <a href="#" onClick={go} style={{
                display: 'inline-block', textAlign: 'center',
                background: C.red, color: C.white,
                fontSize: 16, fontWeight: 700, letterSpacing: '-0.2px',
                padding: '0 40px', height: 53, lineHeight: '53px',
                borderRadius: 0, textDecoration: 'none',
                minWidth: 256,
              }}>
                View My Offer →
              </a>
            </div>

            {/* Plain-text fallback */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: C.gray400 }}>Or copy: </span>
              <span style={{ fontSize: 12, color: C.dark, fontWeight: 500 }}>westhavenpower.com/offer/alex-rivera</span>
            </div>

            {/* Fine print */}
            <div style={{ textAlign: 'center', fontSize: 12, color: C.gray400 }}>
              Checking eligibility won&apos;t affect your credit score · No obligation
            </div>
          </div>

          {/* DIVIDER */}
          <div style={{ height: 1, background: C.gray100, margin: '0 32px' }} />

          {/* WHAT HAPPENS NEXT */}
          <div style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>
              What happens next
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                {
                  n: '1',
                  title: <span>Review your <span style={{ color: C.red }}>pre-built offer</span></span>,
                  body: 'Confirm a few details — takes about 5 minutes. No hard credit pull.',
                },
                {
                  n: '2',
                  title: <span>Complete your <span style={{ color: C.red }}>application</span></span>,
                  body: 'Verify income and identity online. GreenLyne guides every step.',
                },
                {
                  n: '3',
                  title: <span><span style={{ color: C.red }}>Installation</span> &amp; savings begin</span>,
                  body: 'Westhaven schedules your install within days of funding.',
                },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: C.dark,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.white }}>{s.n}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: C.gray500, lineHeight: 1.5 }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DIVIDER */}
          <div style={{ height: 1, background: C.gray100, margin: '0 32px' }} />

          {/* CONSULTANT */}
          <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src="/trevor-avatar.jpg"
              alt="Trevor Evanson"
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.gray400, marginBottom: 2 }}>Your local energy consultant</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Trevor Evanson · Westhaven Power</div>
              <div style={{ fontSize: 12, color: C.red, marginTop: 2 }}>(530) 812-1006 · westhavenpower.com</div>
            </div>
          </div>

          {/* SOCIAL PROOF */}
          <div style={{ padding: '28px 32px', borderTop: `1px solid ${C.gray100}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, textAlign: 'center', lineHeight: 1.5, marginBottom: 20 }}>
              Over <span style={{ color: C.red }}>10,000</span> Northern California Families Chose <span style={{ color: C.red }}>Westhaven</span> — Here&apos;s Why
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                {
                  icon: <SolarIcon />,
                  label: 'Better Solar Performance',
                },
                {
                  icon: <DowntimeIcon />,
                  label: 'Minimized Downtime',
                },
                {
                  icon: <SavingsIcon />,
                  label: 'More Energy Savings',
                },
              ].map((item, i) => (
                <div key={i} style={{
                  background: C.gray50, border: `1.5px solid ${C.gray200}`,
                  borderRadius: 10, padding: '20px 12px 16px', textAlign: 'center',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    {item.icon}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, lineHeight: 1.4 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SECONDARY CTA */}
          <div style={{ background: C.gray50, padding: '24px 32px', textAlign: 'center', borderTop: `1px solid ${C.gray100}` }}>
            <p style={{ fontSize: 14, color: C.gray500, margin: '0 0 16px', lineHeight: 1.6, maxWidth: 350, marginLeft: 'auto', marginRight: 'auto' }}>
              Questions before you start? Reply to this email or call Trevor directly — no pressure, ever.
            </p>
            <a href="#" onClick={go} style={{
              display: 'inline-block',
              fontSize: 14, fontWeight: 700, color: C.dark,
              border: `1.5px solid ${C.dark}`, borderRadius: 10,
              padding: '10px 24px', textDecoration: 'none',
            }}>
              See My Full Plan
            </a>
          </div>

          {/* FOOTER */}
          <div style={{ background: C.gray100, padding: '24px 32px', borderTop: `1px solid ${C.gray200}` }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              {[['Privacy Policy', '#'], ['Terms', '#'], ['Unsubscribe', '#'], ['Opt Out', 'https://optoutprescreen.com']].map(([label, href]) => (
                <a key={label} href={href} style={{ fontSize: 11, color: C.gray400, textDecoration: 'none' }}>{label}</a>
              ))}
            </div>
            <p style={{ fontSize: 10, color: C.muted, lineHeight: 1.7, margin: 0 }}>
              Terms are estimates and subject to verification and approval. This offer is based on information indicating you meet certain criteria and is not a guaranteed commitment to lend. Checking eligibility uses a soft credit inquiry and will not affect your credit score. Final loan terms subject to full underwriting, property appraisal, and lender approval.
              <br /><br />
              Pre-screen opt-out: If you do not want to receive prescreened offers, call 1-888-5-OPT-OUT or visit optoutprescreen.com.
              Financing powered by GreenLyne. Lending by Owning, NMLS #2611. © 2025 Westhaven Power. CA Lic. 965111.
            </p>
          </div>

        </div>

        {/* Demo badge */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 16px', background: 'rgba(0,22,96,0.07)',
            borderRadius: 20, border: '1px solid rgba(0,22,96,0.18)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.navy }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Demo — click any CTA to enter the flow
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SolarIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="6" stroke="#D82020" strokeWidth="2"/>
      <line x1="18" y1="4" x2="18" y2="8" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18" y1="28" x2="18" y2="32" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4" y1="18" x2="8" y2="18" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
      <line x1="28" y1="18" x2="32" y2="18" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8.69" y1="8.69" x2="11.52" y2="11.52" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
      <line x1="24.48" y1="24.48" x2="27.31" y2="27.31" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
      <line x1="27.31" y1="8.69" x2="24.48" y2="11.52" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
      <line x1="11.52" y1="24.48" x2="8.69" y2="27.31" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function DowntimeIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="13" stroke="#D82020" strokeWidth="2"/>
      <polyline points="18,10 18,18 23,23" stroke="#D82020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SavingsIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <path d="M6 26 C6 26 10 14 18 14 C26 14 30 26 30 26" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 14 L18 6" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 10 L18 6 L22 10" stroke="#D82020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 26 L26 26" stroke="#D82020" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
