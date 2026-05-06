import { useNavigate } from 'react-router-dom'
import { getDemoSession } from '../lib/demoSession'
import { DEMO_PERSONA } from '../lib/persona'
import { calcRate } from '../lib/loanCalc'
import { computeOffer, computeFiveYearTotal } from '../components/ScreenOfferSelect'
import { useActivePartners } from '../lib/PartnersContext'
import { useIsMobile } from '../lib/useIsMobile'

function slugify(s = '') {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'partner'
}

// Same recommended preset used in the prescreen + application Step 2
const RECOMMENDED_PRESET = { zeroStart: true, ioYrs: 5, s: 0.30, reductionYrs: 5 }
const STANDARD_PRESET    = { zeroStart: false, ioYrs: 0, s: 0, reductionYrs: null }
const PROFILE_BASE = {
  fico:        740,
  propValue:   DEMO_PERSONA.propValueN,
  mortgageBal: DEMO_PERSONA.mortgageBalanceN,
  creditLim:   120_000,
}
const APPROVED_MAX = 150_000

function fmt(v) { return '$' + Math.round(v).toLocaleString() }

const CTA_ROUTE = '/offer'

const C = {
  dark:    '#101010',
  dark2:   '#2a2a2a',
  red:     '#D82020',
  // This email is branded for Westhaven — use their deep black instead of GreenLyne emerald.
  green:   '#101010',
  greenBg: 'rgba(16,16,16,0.06)',
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

export default function EmailPreview({ hideClientChrome = false, loanAmountOverride }) {
  const navigate = useNavigate()
  const session  = getDemoSession()
  const { merchant, lender } = useActivePartners()
  const isMobile = useIsMobile(640)
  const merchantName   = merchant?.name || 'Westhaven Power'
  const merchantLogo   = merchant?.logoUrl || '/westhaven-logo-new.avif'
  const merchantSymbol = merchant?.symbolLogoUrl || merchant?.logoUrl || '/westhaven-icon.svg'
  const merchantCover  = merchant?.coverImageUrl || '/solar-heat-map.jpg'
  const brandRed       = merchant?.brandColor || C.red
  const merchantSlug   = slugify(merchantName)
  const merchantDomain = `${merchantSlug}.com`
  const lenderName     = lender?.name || 'Owning'
  const lenderLogo     = lender?.logoUrl || '/owning-logo.webp'
  const lenderNmls     = lender?.nmls || '2611'
  const firstName = session.firstName || DEMO_PERSONA.firstName
  const lastName  = session.lastName  || DEMO_PERSONA.lastName
  const recipientEmail = session.email || DEMO_PERSONA.email
  const recipientAddress = session.address || DEMO_PERSONA.address
  const recipientCity    = session.city    || DEMO_PERSONA.city
  const recipientState   = session.state   || DEMO_PERSONA.state
  const slug = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '')

  // Live offer figures — `loanAmountOverride` (e.g. from the prescreen slider) wins
  // so the email preview re-renders instantly on each slider move. Falls back to
  // the demo session for standalone /email visits.
  const drawAmt = Number(loanAmountOverride) || Number(session.requestedLoanAmount) || DEMO_PERSONA.requestedLoanAmountN || 45_000
  const projectCost = Number(session.projectCost) || drawAmt
  const profile = { ...PROFILE_BASE, drawAmt }
  const cltv  = (profile.mortgageBal + profile.creditLim) / profile.propValue
  const rate  = calcRate(profile.fico, cltv) ?? 0.0825
  const stdOffer = computeOffer({ C: drawAmt, rate, preset: STANDARD_PRESET })
  const recOffer = computeOffer({ C: drawAmt, rate, preset: RECOMMENDED_PRESET })
  const stdMonthly = stdOffer ? Math.round(stdOffer.monthly) : 0
  const recMonthly = recOffer ? Math.round(recOffer.monthly) : 0   // active-phase monthly (interest-only window)
  const stdFive    = stdOffer ? computeFiveYearTotal(stdOffer) : 0
  const recFive    = recOffer ? computeFiveYearTotal(recOffer) : 0
  const fiveYearSavings = Math.max(0, stdFive - recFive)

  const go = e => {
    e.preventDefault()
    navigate(CTA_ROUTE, {
      state: {
        firstName, lastName,
        address: recipientAddress, city: recipientCity, state: recipientState,
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", display: 'flow-root' }}>

      {/* ── Email client chrome ─────────────────────────────────── */}
      {!hideClientChrome && <div style={{ background: C.white, borderBottom: `1px solid ${C.gray200}`, padding: '14px 0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: C.navy,
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              padding: 6,
            }}>
              <img src={merchantSymbol} alt={merchantName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Trevor Evanson — {merchantName}</span>
                <span style={{ fontSize: 12, color: C.gray400 }}>trevor@{merchantDomain}</span>
              </div>
              <div style={{ fontSize: 12, color: C.gray400, marginTop: 1 }}>To: {recipientEmail}</div>
            </div>
            <div style={{ fontSize: 12, color: C.gray400, whiteSpace: 'nowrap' }}>Today, 9:14 AM</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', paddingLeft: 54 }}>
            {firstName}, you are pre-qualified for a HELOC
          </div>
        </div>
      </div>}

      {/* ── Email body ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 680, margin: '28px auto', padding: '0 20px 60px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ background: C.white, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 24px rgba(0,0,0,0.08)' }}>

          {/* HEADER — desktop: side-by-side merchant + meta. Mobile: centered stacked rows. */}
          {isMobile ? (
            <div style={{ borderBottom: `1px solid ${C.gray100}` }}>
              {/* Row 1 — merchant logo, centered */}
              <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={merchantLogo}
                  alt={merchantName}
                  style={{ maxHeight: 42, maxWidth: 220, height: 'auto', width: 'auto', objectFit: 'contain', display: 'block' }}
                />
              </div>
              <div style={{ height: 1, background: C.gray100 }} />
              {/* Row 2 — financing + lending, centered, compact */}
              <div style={{
                padding: '12px 24px 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                textAlign: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#001660' }}>Financing powered by</span>
                  <img src="/greenlyne-logo.svg" alt="GreenLyne" style={{ height: 15, width: 'auto', display: 'block' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: '#bcc7d5' }}>Lending services by</span>
                  <img src={lenderLogo} alt={lenderName} style={{ maxHeight: 11, maxWidth: 80, height: 'auto', width: 'auto', objectFit: 'contain', display: 'block' }} />
                  {lenderNmls && <span style={{ fontSize: 10, color: '#bcc7d5' }}>NMLS #{lenderNmls}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '20px 32px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', borderBottom: `1px solid ${C.gray100}`, gap: 16,
            }}>
              <img src={merchantLogo} alt={merchantName} style={{ maxHeight: 33, maxWidth: 184, height: 'auto', width: 'auto', objectFit: 'contain', display: 'block' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#001660' }}>Financing powered by</span>
                  <img src="/greenlyne-logo.svg" alt="GreenLyne" style={{ height: 15, width: 'auto' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: '#bcc7d5' }}>Lending services by</span>
                  <img src={lenderLogo} alt={lenderName} style={{ maxHeight: 12, maxWidth: 77, height: 'auto', width: 'auto', objectFit: 'contain', display: 'block' }} />
                  {lenderNmls && <span style={{ fontSize: 10, color: '#bcc7d5' }}>NMLS #{lenderNmls}</span>}
                </div>
              </div>
            </div>
          )}

          {/* COVER PHOTO */}
          <div style={{ padding: '16px 16px 0' }}>
            <img
              src={merchantCover}
              alt={`${merchantName} cover`}
              style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'center center', borderRadius: 10, display: 'block' }}
            />
          </div>

          {/* HERO */}
          <div style={{ padding: '36px 32px 32px' }}>

            {/* Headline — uses the agent-set amount from the prescreen modal */}
            <h1 style={{ fontSize: 39, fontWeight: 700, color: C.dark2, lineHeight: 1.05, letterSpacing: '-0.5px', margin: '0 0 16px' }}>
              Hi {firstName} — you&apos;re <span style={{ color: brandRed }}>pre-qualified</span> for a <span style={{ color: brandRed }}>HELOC</span> of up to <span style={{ color: brandRed }}>{fmt(drawAmt)}</span>.
            </h1>

            {/* Narrative — friendly, light on numbers */}
            <p style={{ fontSize: 16, color: C.gray500, lineHeight: 1.7, margin: '0 0 20px' }}>
              Your {merchantName} consultant pre-screened <strong style={{ color: C.dark, fontWeight: 700 }}>{recipientAddress}</strong> — no hard credit pull, no commitment.
            </p>

            {/* Primary CTA — early in the email so users can jump straight in */}
            <div style={{ padding: '4px 0 28px' }}>
              <a
                href="#"
                onClick={go}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: brandRed, color: C.white,
                  padding: '14px 26px', borderRadius: 999,
                  fontSize: 15, fontWeight: 700, letterSpacing: '-0.005em',
                  textDecoration: 'none',
                  boxShadow: '0 6px 16px rgba(216,32,32,0.22)',
                }}
              >
                View my offer
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </a>
            </div>

            {/* Section header — savings-focused framing */}
            <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 12, letterSpacing: '-0.3px' }}>
              Two HELOC options · pre-qualified
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 16, marginBottom: 12, alignItems: 'stretch' }}>

              {/* ── Standard HELOC ── */}
              <PlanTile
                kind="standard"
                C={C}
                label={<>Standard<br/>HELOC</>}
                monthly={fmt(stdMonthly)}
                monthlyNote="Same payment, every month"
                fiveYr={fmt(stdFive)}
                apr={`${(stdOffer ? stdOffer.apr * 100 : 8).toFixed(2)}%`}
              />

              {/* ── Optimum HELOC ── */}
              <PlanTile
                kind="optimum"
                C={C}
                label={<>Optimum<br/>HELOC</>}
                monthly="$0"
                monthlyNote={`First 6 months — then ~${fmt(recMonthly)}/mo`}
                fiveYr={fmt(recFive)}
                apr={`${(recOffer ? recOffer.apr * 100 : 8).toFixed(2)}%`}
                badge="Lowest 5-yr cost"
              />
            </div>

            {/* Why choose Optimum HELOC — high-energy benefits panel */}
            <div style={{
              background: C.green, color: C.white, borderRadius: 14, padding: '24px 24px 26px',
              marginBottom: 28, boxShadow: '0 12px 28px -10px rgba(16,16,16,0.4)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: C.white, opacity: 0.85, marginBottom: 8,
              }}>
                Why Optimum HELOC?
              </div>
              <div style={{
                fontSize: 26, fontWeight: 900, letterSpacing: '-0.6px',
                lineHeight: 1.15, marginBottom: 18, color: C.white,
              }}>
                Two big wins for your wallet.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Point 1 — first 6 months free */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: C.white, color: C.green,
                    fontSize: 14, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                  }}>1</div>
                  <div style={{ paddingTop: 2 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.white, letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                      First 6 months free
                    </div>
                    <div style={{ fontSize: 14, color: C.white, opacity: 0.92, marginTop: 4, lineHeight: 1.55 }}>
                      Gives your solar savings time to ramp up before payments start.
                    </div>
                  </div>
                </div>

                {/* Point 2 — 5-year savings vs Standard */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: C.white, color: C.green,
                    fontSize: 14, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                  }}>2</div>
                  <div style={{ paddingTop: 2 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.white, letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                      Save <span style={{ background: C.white, color: C.green, padding: '0 8px', borderRadius: 6 }}>~{fmt(fiveYearSavings)}</span> over 5 years
                    </div>
                    <div style={{ fontSize: 14, color: C.white, opacity: 0.92, marginTop: 4, lineHeight: 1.55 }}>
                      Optimum HELOC vs Standard HELOC — real money back in your pocket.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary CTA — centered, matches the in-line CTA above */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <a
                href="#"
                onClick={go}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: brandRed, color: C.white,
                  padding: '14px 26px', borderRadius: 999,
                  fontSize: 15, fontWeight: 700, letterSpacing: '-0.005em',
                  textDecoration: 'none',
                  boxShadow: '0 6px 16px rgba(216,32,32,0.22)',
                }}
              >
                View my offer
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </a>
            </div>

            {/* Plain-text fallback */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: C.gray400 }}>Or copy: </span>
              <span style={{ fontSize: 12, color: C.dark, fontWeight: 500 }}>{merchantDomain}/offer/{slug}</span>
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
                  title: <span>Review your <span style={{ color: brandRed }}>pre-built offer</span></span>,
                  body: 'Confirm a few details — takes about 5 minutes. No hard credit pull.',
                },
                {
                  n: '2',
                  title: <span>Complete your <span style={{ color: brandRed }}>application</span></span>,
                  body: 'Verify income and identity online. GreenLyne guides every step.',
                },
                {
                  n: '3',
                  title: <span><span style={{ color: brandRed }}>Installation</span> &amp; savings begin</span>,
                  body: `${merchantName} schedules your install within days of funding.`,
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
              <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Trevor Evanson · {merchantName}</div>
              <div style={{ fontSize: 12, color: brandRed, marginTop: 2 }}>(530) 812-1006 · {merchantDomain}</div>
            </div>
          </div>

          {/* SOCIAL PROOF */}
          <div style={{ padding: '28px 32px', borderTop: `1px solid ${C.gray100}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, textAlign: 'center', lineHeight: 1.5, marginBottom: 20 }}>
              Over <span style={{ color: brandRed }}>10,000</span> Northern California Families Chose <span style={{ color: brandRed }}>{merchantName}</span> — Here&apos;s Why
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
              Financing powered by GreenLyne. Lending by {lenderName}{lenderNmls ? `, NMLS #${lenderNmls}` : ''}. © 2025 {merchantName}. CA Lic. 965111.
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

// ── Plan tile used by the email ──────────────────────────────────────────────
function PlanTile({ kind, C, label, monthly, monthlyNote, fiveYr, apr, badge }) {
  const isOpt = kind === 'optimum'
  const accent     = isOpt ? C.green : C.dark2
  const accentSoft = isOpt ? C.greenBg : C.gray50
  const border     = isOpt ? `1.5px solid ${C.green}` : `1px solid ${C.gray200}`
  const tileShadow = isOpt ? '0 8px 22px rgba(16,16,16,0.16)' : '0 1px 3px rgba(0,0,0,0.04)'
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {badge && (
        <span style={{
          position: 'absolute',
          left: '50%', top: 0, transform: 'translate(-50%, -50%)',
          background: C.dark, color: C.white,
          fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
          padding: '5px 11px', borderRadius: 99, textTransform: 'uppercase', whiteSpace: 'nowrap',
          boxShadow: '0 3px 8px rgba(16,16,16,0.22)',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          zIndex: 2,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill={C.white} aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {badge}
        </span>
      )}
      <div style={{
        background: C.white, borderRadius: 14, border, boxShadow: tileShadow, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', height: '100%',
      }}>
        {/* Top section — plan label */}
        <div style={{ background: accentSoft, padding: '14px 14px 12px' }}>
          <div style={{
            fontSize: 11, fontWeight: 800,
            color: accent, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.2,
          }}>
            {label}
          </div>
        </div>

        {/* Body — monthly payment block */}
        <div style={{ padding: '14px 14px 4px', flex: 1 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: isOpt ? accent : 'rgba(16,16,16,0.55)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
          }}>
            Monthly payment
          </div>
          <div style={{
            fontSize: 26, fontWeight: 800, color: accent,
            letterSpacing: '-0.05em', lineHeight: 1,
            whiteSpace: 'nowrap',
          }}>
            {monthly}<span style={{ fontSize: 13, fontWeight: 600, color: C.gray400, letterSpacing: '0' }}>/mo</span>
          </div>
          <div style={{ fontSize: 11, color: C.gray500, marginTop: 6, lineHeight: 1.5 }}>
            {monthlyNote}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: C.gray100, margin: '12px 14px 0' }} />

        {/* Footer — 5-yr total + APR stacked vertically */}
        <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700,
              color: isOpt ? accent : 'rgba(16,16,16,0.5)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2,
            }}>
              5-yr total
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.dark, letterSpacing: '-0.01em' }}>
              {fiveYr}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700,
              color: isOpt ? accent : 'rgba(16,16,16,0.5)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2,
            }}>
              APR
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.dark, letterSpacing: '-0.01em' }}>
              {apr}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
