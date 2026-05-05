import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDemoSession } from '../lib/demoSession'
import { DEMO_PERSONA } from '../lib/persona'
import { PrimaryButton } from '../components/PrimaryButton'
import { calcRate } from '../lib/loanCalc'
import { computeOffer, computeFiveYearTotal } from '../components/ScreenOfferSelect'
import { useActivePartners } from '../lib/PartnersContext'

const STANDARD_PRESET    = { zeroStart: false, ioYrs: 0, s: 0, reductionYrs: null }
const RECOMMENDED_PRESET = { zeroStart: true,  ioYrs: 5, s: 0.30, reductionYrs: 5 }
const PROFILE_BASE       = { fico: 740, propValue: DEMO_PERSONA.propValueN, mortgageBal: DEMO_PERSONA.mortgageBalanceN, creditLim: 120_000 }
const fmt = v => '$' + Math.round(v).toLocaleString()

/**
 * Welcome screen — lands here from the merchant's email "View My Offer".
 * The original solar calculator lives in OfferLanding.solar-backup.jsx.
 */

const T = {
  navy:    '#001660',
  navy2:   '#0A2585',
  royal:   '#254BCE',
  emerald: '#016163',
  dark:    '#101010',
  dark2:   '#2a2a2a',
  mint:    '#93DDBA',
  mintLite:'#E9F6EE',
  off:     '#F5F1EE',
  white:   '#FFFFFF',
  ink70:   '#001660c7',
  ink60:   '#001660a6',
  ink40:   '#00166066',
  ink20:   '#00166026',
  ink10:   '#00166014',
}
const DISPLAY = "'Sora', ui-sans-serif, system-ui, sans-serif"
const BODY    = "'Manrope', ui-sans-serif, system-ui, sans-serif"
const MONO    = "'JetBrains Mono', ui-monospace, monospace"

export default function OfferLanding() {
  const navigate = useNavigate()
  const session  = getDemoSession()
  const firstName = session.firstName || DEMO_PERSONA.firstName
  const { merchant: activeMerchant, lender: activeLender } = useActivePartners()
  const merchant       = activeMerchant?.name || 'Westhaven Power'
  const merchantLogo   = activeMerchant?.logoUrl || '/westhaven-logo-new.avif'
  const merchantSymbol = activeMerchant?.symbolLogoUrl || activeMerchant?.logoUrl || '/westhaven-icon.svg'
  const lenderName     = activeLender?.name || 'Grand Bank'
  const lenderNmls     = activeLender?.nmls || '2611'

  // Live offer figures — same compute path as the email + prescreen result
  const drawAmt = Number(session.requestedLoanAmount) || DEMO_PERSONA.requestedLoanAmountN || 45_000
  const profile = { ...PROFILE_BASE, drawAmt }
  const cltv = (profile.mortgageBal + profile.creditLim) / profile.propValue
  const rate = calcRate(profile.fico, cltv) ?? 0.0825
  const stdOffer = computeOffer({ C: drawAmt, rate, preset: STANDARD_PRESET })
  const recOffer = computeOffer({ C: drawAmt, rate, preset: RECOMMENDED_PRESET })
  const stdMonthly = stdOffer ? Math.round(stdOffer.monthly) : 0
  const recMonthly = recOffer ? Math.round(recOffer.monthly) : 0
  const stdFive    = stdOffer ? computeFiveYearTotal(stdOffer) : 0
  const recFive    = recOffer ? computeFiveYearTotal(recOffer) : 0
  const fiveYearSavings = Math.max(0, stdFive - recFive)

  // Exit transition — pressing "Start my loan application" flies the GreenLyne
  // disc from the brand lockup to viewport center, where a glowing gradient
  // ring sweeps around it before navigation.
  const greenDiscRef = useRef(null)
  const [exiting, setExiting] = useState(false)
  // Captured starting transform for the flying disc (relative to viewport center)
  const [flyStart, setFlyStart] = useState(null)
  // Once the disc lands at center, flip the ring + label in
  const [ringOn, setRingOn] = useState(false)
  // Two-stage flag: `flying` triggers the disc translation after the page
  // content has had a moment to dissolve, so the user sees content go first,
  // then the disc smoothly glides into position
  const [flying, setFlying] = useState(false)
  function startApplication() {
    if (exiting) return
    const node = greenDiscRef.current
    if (node) {
      const r = node.getBoundingClientRect()
      const startX = r.left + r.width / 2
      const startY = r.top  + r.height / 2
      setFlyStart({ startX, startY, size: r.width })
    }
    setExiting(true)
    // Stage 1: let content dissolve (~450ms), then send the disc
    setTimeout(() => setFlying(true), 450)
    // Stage 2: ring + label fade in once the disc is in place
    setTimeout(() => setRingOn(true), 1300)
    // Stage 3: navigate
    setTimeout(() => navigate('/pos-demo'), 4400)
  }

  // Snap to top on mount so the headline + brand lockup always sit fully below
  // the sticky demo nav and never end up clipped behind it on initial paint
  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Typewriter effect — types the headline char-by-char on first paint.
  // Once typing finishes, `typingDone` flips to true and the rest of the page fades + rises in.
  const fullHeadline = `Hi ${firstName}! Let's get your HELOC started.`
  const [typed, setTyped] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  // Increment to replay the welcome animation
  const [replayKey, setReplayKey] = useState(0)
  useEffect(() => {
    setTyped('')
    setTypingDone(false)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(fullHeadline.slice(0, i))
      if (i >= fullHeadline.length) {
        clearInterval(id)
        // Linger a moment after the last character before everything else gracefully arrives
        setTimeout(() => setTypingDone(true), 700)
      }
    }, 75)
    return () => clearInterval(id)
  }, [fullHeadline, replayKey])

  return (
    <div style={{ minHeight: '100vh', background: T.off, fontFamily: BODY, color: T.navy, position: 'relative', overflow: 'hidden' }}>

      {/* Inline keyframes — logo entrance, halo pulse, stat fade-up */}
      <style>{`
        @keyframes glyn-rise   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glyn-fade   { from { opacity: 0; } to { opacity: 1; } }
        @keyframes glyn-rise-slow { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glyn-halo   { 0% { transform: translate(-50%, -50%) scale(.92); opacity: .8; } 50% { transform: translate(-50%, -50%) scale(1.08); opacity: .35; } 100% { transform: translate(-50%, -50%) scale(.92); opacity: .8; } }
        @keyframes glyn-orbit  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes glyn-orbit3d {
          0%   { transform: rotateX(8deg) rotateY(0deg);   }
          100% { transform: rotateX(8deg) rotateY(360deg); }
        }
        @keyframes glyn-caret { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        /* Graceful alternating pulse — one disc breathes, then the other.
           Subtle scale, no movement, soft easing. */
        @keyframes glyn-pulse-a {
          0%, 50%, 100% { transform: scale(1);    }
          25%           { transform: scale(1.06); }
        }
        @keyframes glyn-pulse-b {
          0%, 50%, 100% { transform: scale(1);    }
          75%           { transform: scale(1.06); }
        }
        @keyframes glyn-mark   { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: scale(1); } }
        @keyframes glyn-spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        /* Playful random jiggle — long quiet stretches with an occasional wiggle so
           the button feels alive without being annoying. Cycle is 7s long. */
        @keyframes glyn-jiggle {
          0%, 62%, 100%        { transform: translate(0, 0) rotate(0deg); }
          64%                  { transform: translate(-2px, -1px) rotate(-2.5deg); }
          66%                  { transform: translate(3px, 1px) rotate(2.8deg); }
          68%                  { transform: translate(-3px, -2px) rotate(-3deg); }
          70%                  { transform: translate(2px, 2px) rotate(2deg); }
          72%                  { transform: translate(-1px, -1px) rotate(-1deg); }
          74%, 84%             { transform: translate(0, 0) rotate(0deg); }
          86%                  { transform: translate(0, -3px) scale(1.04); }
          88%                  { transform: translate(0, 1px) scale(0.99); }
          90%                  { transform: translate(0, -2px) scale(1.02); }
          92%                  { transform: translate(0, 0) scale(1); }
        }
        .glyn-jiggle { animation: glyn-jiggle 7s cubic-bezier(0.36, 0, 0.66, -0.56) infinite; transform-origin: center; }
        .glyn-jiggle:hover { animation-play-state: paused; }
        @keyframes glyn-hue    { from { filter: blur(18px) hue-rotate(0deg); } to { filter: blur(18px) hue-rotate(360deg); } }
        @keyframes glyn-dots   { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75%, 100% { content: '...'; } }
        .glyn-dots::after      { content: '...'; display: inline-block; width: 18px; text-align: left; animation: glyn-dots 1.4s steps(4) infinite; }
        .glyn-stagger > * { opacity: 0; animation: glyn-rise-slow 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        /* Sequence: headline (typewriter) → subtext → logos (above headline, ~1.8s) → CTA → trust → plans → why → fine print */
        .glyn-stagger > *:nth-child(1) { animation-delay: .15s; }   /* subtext */
        .glyn-stagger > *:nth-child(2) { animation-delay: 2.7s; }   /* CTA — after the logos finish landing */
        .glyn-stagger > *:nth-child(3) { animation-delay: 2.95s; }  /* trust line */
        .glyn-stagger > *:nth-child(4) { animation-delay: 3.15s; }  /* plans header */
        .glyn-stagger > *:nth-child(5) { animation-delay: 3.30s; }  /* plans grid */
        .glyn-stagger > *:nth-child(6) { animation-delay: 3.50s; }  /* why panel */
        .glyn-stagger > *:nth-child(7) { animation-delay: 3.70s; }  /* fine print */
      `}</style>

      {/* Soft branded gradient background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(80% 60% at 50% 20%, ${T.mintLite} 0%, ${T.off} 55%)`,
        pointerEvents: 'none',
      }} />

      {/* Top bar — merchant + lender lockup */}
      <header style={{
        position: 'relative', zIndex: 2,
        padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        animation: 'glyn-fade .6s ease forwards',
        opacity: exiting ? 0 : undefined,
        transition: 'opacity .55s ease',
        pointerEvents: exiting ? 'none' : 'auto',
      }}>
        <img src={merchantLogo} alt={merchant} style={{ maxHeight: 25, maxWidth: 125, height: 'auto', width: 'auto', objectFit: 'contain', display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: T.ink60 }}>
          <span>Financing by</span>
          <img src="/greenlyne-logo.svg" alt="GreenLyne" style={{ height: 20, objectFit: 'contain', display: 'block' }} />
          <span style={{ color: T.ink40 }}>·</span>
          <span style={{ fontFamily: MONO, color: T.ink40 }}>NMLS #2611</span>
          {/* Subtle replay-animation button */}
          <button onClick={() => setReplayKey(k => k + 1)}
            title="Replay welcome animation"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'transparent', border: `1px solid ${T.ink10}`, borderRadius: 999,
              padding: '4px 10px', fontSize: 10.5, color: T.ink40,
              fontFamily: BODY, cursor: 'pointer',
              transition: 'border-color .15s, color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.ink20; e.currentTarget.style.color = T.ink60 }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.ink10; e.currentTarget.style.color = T.ink40 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Replay
          </button>
        </div>
      </header>

      {/* Main column */}
      <main style={{
        position: 'relative', zIndex: 2,
        maxWidth: 720, margin: '0 auto',
        padding: '40px 24px 80px',
        textAlign: 'center',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity .55s ease, transform .55s ease',
        pointerEvents: exiting ? 'none' : 'auto',
      }}>

        {/* Brand lockup — sits ABOVE the headline. Reserves layout space from
            the start (opacity 0) and gracefully fades + lifts in once typing finishes. */}
        <div style={{
          position: 'relative', margin: '0 auto 32px',
          display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          opacity: typingDone ? 1 : 0,
          transform: typingDone ? 'none' : 'translateY(20px)',
          transition: 'opacity 1.4s cubic-bezier(0.16, 1, 0.3, 1), transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
          /* Fires 3rd in the sequence — after headline + subtext (which appears at 0.15s) */
          transitionDelay: typingDone ? '1.8s' : '0s',
        }}>
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 280, height: 220, borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${T.mint}55 0%, ${T.mint}00 60%)`,
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'relative', zIndex: 2,
            width: 96, height: 96, borderRadius: '50%',
            background: T.white,
            display: 'grid', placeItems: 'center',
            boxShadow: `0 18px 48px -16px ${T.navy}55`,
            animation: 'glyn-pulse-a 4.6s ease-in-out infinite',
          }}>
            <img src={merchantSymbol} alt={merchant} style={{ maxWidth: 56, maxHeight: 56, objectFit: 'contain' }} />
          </div>
          <div ref={greenDiscRef} style={{
            position: 'relative', zIndex: 1, marginLeft: -22,
            width: 96, height: 96, borderRadius: '50%',
            background: T.navy,
            display: 'grid', placeItems: 'center',
            boxShadow: `0 18px 48px -16px ${T.navy}88`,
            animation: 'glyn-pulse-b 4.6s ease-in-out infinite',
            visibility: exiting ? 'hidden' : 'visible',
          }}>
            <img src="/greenlyne-icon-off-white.svg" alt="GreenLyne" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          </div>
        </div>

        {/* HEADLINE — typewriter, always visible. Types char-by-char on first paint. */}
        <h1 style={{
          fontFamily: DISPLAY,
          fontSize: 48, fontWeight: 700,
          letterSpacing: '-0.028em', lineHeight: 1.1,
          color: T.navy, margin: '0 0 14px', minHeight: '1.1em',
        }}>
          {typed}
          {!typingDone && (
            <span style={{
              display: 'inline-block', width: 3, height: '0.95em', marginLeft: 2,
              background: T.royal, verticalAlign: 'baseline',
              animation: 'glyn-caret 0.85s steps(2) infinite',
            }} />
          )}
        </h1>

        {/* STAGED SEQUENCE — only renders once typing finishes, then each child arrives in order:
            (1) subtext  →  long pause  →  (2) icons  →  (3) CTA  →  (4) trust  →  (5) plans header  →  (6) plans  →  (7) why panel  →  (8) fine print */}
        {typingDone && <div className="glyn-stagger">

          {/* (1) Subtext */}
          <p style={{
            fontFamily: BODY, fontSize: 17,
            color: T.ink70, lineHeight: 1.55,
            margin: '0 auto', maxWidth: 540,
          }}>
            <strong style={{ color: T.navy }}>{merchant}</strong>, in partnership with <strong style={{ color: T.navy }}>GreenLyne</strong>, pre-screened your home and pre-qualified you for <strong style={{ color: T.navy }}>two HELOC options</strong>.
            We've already done the heavy lifting — your application takes about five minutes.
          </p>

          {/* (2) Primary CTA — pushed away from the text above with extra top margin.
              Wrapped in an inline-block with a playful random jiggle so it draws the eye. */}
          <div style={{ marginTop: 48 }}>
            <div className="glyn-jiggle" style={{ display: 'inline-block' }}>
              <PrimaryButton onClick={startApplication} size="lg">
                Start my loan application
              </PrimaryButton>
            </div>
          </div>

          {/* (4) Trust line — pushed a little further from the CTA */}
          <div style={{
            marginTop: 28,
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
            gap: 32, rowGap: 14,
            fontSize: 12.5, color: T.ink60,
          }}>
            {[
              { icon: <ShieldIcon />,  label: 'No commitment' },
              { icon: <NoCheckIcon />, label: "Won't impact your credit" },
              { icon: <ClockIcon />,   label: '~5 minutes' },
              { icon: <LockIcon />,    label: 'Bank-grade encryption' },
            ].map(t => (
              <span key={t.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: T.emerald, display: 'inline-flex' }}>{t.icon}</span>
                {t.label}
              </span>
            ))}
          </div>

          {/* (5) Plans section header */}
          <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, textAlign: 'left', marginTop: 96, marginBottom: 12, letterSpacing: '-0.3px' }}>
            Two HELOC options · pre-qualified
          </div>

          {/* (6) Plan cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {/* ── Standard HELOC ── */}
            <div style={{
              background: T.white, borderRadius: 12,
              border: `1px solid ${T.ink10}`, overflow: 'hidden',
              display: 'flex', flexDirection: 'column', textAlign: 'left',
            }}>
              <div style={{ background: T.ink04, padding: '10px 16px', borderBottom: `1px solid ${T.ink10}` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.navy, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  Standard<br/>HELOC
                </div>
              </div>
              <div style={{ padding: '14px 16px 0', minHeight: 96 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Monthly payment</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.navy, letterSpacing: '-0.5px', lineHeight: 1 }}>
                  {fmt(stdMonthly)}<span style={{ fontSize: 13, fontWeight: 600, color: T.ink40 }}>/mo</span>
                </div>
                <div style={{ fontSize: 11, color: T.ink60, marginTop: 4 }}>Same payment, every month</div>
              </div>
              <div style={{ padding: '10px 16px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: T.ink60 }}>
                <span>5-yr total <strong style={{ color: T.navy, fontWeight: 700 }}>{fmt(stdFive)}</strong></span>
                <span>APR <strong style={{ color: T.navy, fontWeight: 700 }}>{(stdOffer ? stdOffer.apr * 100 : 8).toFixed(2)}%</strong></span>
              </div>
            </div>

            {/* ── Optimum HELOC — highlighted as the saver ── */}
            <div style={{
              background: T.white, borderRadius: 12,
              border: `1.5px solid ${T.dark}`, overflow: 'hidden',
              display: 'flex', flexDirection: 'column', textAlign: 'left',
              boxShadow: '0 6px 16px rgba(16,16,16,0.18)',
            }}>
              <div style={{
                background: 'rgba(16,16,16,0.06)', padding: '10px 16px',
                borderBottom: `1px solid rgba(16,16,16,0.18)`,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.dark, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  Optimum<br/>HELOC
                </div>
                <span style={{
                  background: T.dark, color: T.white,
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
                  padding: '2px 7px', borderRadius: 99, textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>Lowest 5-yr cost</span>
              </div>
              <div style={{ padding: '14px 16px 0', minHeight: 96 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Monthly payment</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.dark, letterSpacing: '-0.5px', lineHeight: 1 }}>
                  $0<span style={{ fontSize: 13, fontWeight: 600, color: T.ink40 }}>/mo</span>
                </div>
                <div style={{ fontSize: 11, color: T.ink60, marginTop: 4 }}>First 6 months — then ~{fmt(recMonthly)}/mo</div>
              </div>
              <div style={{ padding: '10px 16px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: T.ink60 }}>
                <span>5-yr total <strong style={{ color: T.navy, fontWeight: 700 }}>{fmt(recFive)}</strong></span>
                <span>APR <strong style={{ color: T.navy, fontWeight: 700 }}>{(recOffer ? recOffer.apr * 100 : 8).toFixed(2)}%</strong></span>
              </div>
            </div>
          </div>

          {/* Why Optimum HELOC? — full-bleed dark benefits panel (matches email) */}
          <div style={{
            background: T.dark, color: T.white, borderRadius: 14,
            padding: '24px 24px 26px', marginBottom: 28, textAlign: 'left',
            boxShadow: '0 12px 28px -10px rgba(16,16,16,0.5)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>
              Why Optimum HELOC?
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.18, marginBottom: 18 }}>
              Two big wins for your wallet.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { n: 1, headline: 'First 6 months free', sub: 'Gives your solar savings time to ramp up before payments start.' },
                { n: 2, headline: <>Save <span style={{ background: T.white, color: T.dark, padding: '0 8px', borderRadius: 6 }}>~{fmt(fiveYearSavings)}</span> over 5 years</>, sub: 'Optimum HELOC vs Standard HELOC — real money back in your pocket.' },
              ].map(item => (
                <div key={item.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: T.white, color: T.dark,
                    fontSize: 14, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                  }}>{item.n}</div>
                  <div style={{ paddingTop: 2 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.3 }}>{item.headline}</div>
                    <div style={{ fontSize: 13.5, opacity: 0.92, marginTop: 4, lineHeight: 1.55 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* (8) Fine print */}
          <p style={{
            fontFamily: MONO,
            fontSize: 11, color: T.ink40, lineHeight: 1.55,
            maxWidth: 540, margin: '36px auto 0',
          }}>
            Pre-qualification based on a soft credit check. Final terms subject to underwriting and verification.
            Lending services provided by {lenderName}{lenderNmls ? ` · NMLS #${lenderNmls}` : ''} · Equal Housing Lender.
          </p>

        </div>}{/* /staged sequence */}
      </main>

      {/* Exit transition — the GreenLyne disc physically flies from the brand
          lockup to viewport center, then a glowing gradient ring sweeps around
          it while a loading label fades in below. */}
      {exiting && flyStart && (() => {
        const startSize  = flyStart.size       // disc starts at original 96px
        const targetSize = 128                 // grows slightly when centered
        // Translate from captured viewport coords to viewport center
        const dx = (window.innerWidth  / 2) - flyStart.startX
        const dy = (window.innerHeight / 2) - flyStart.startY
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'transparent',
            pointerEvents: 'auto',
          }}>
            {/* Flying disc — sits at the original lockup spot, then glides to center.
                Uses the captured viewport coords so it always lines up perfectly. */}
            <div style={{
              position: 'fixed',
              top: 0, left: 0,
              width: startSize, height: startSize,
              transform: flying
                ? `translate(${flyStart.startX - startSize/2 + dx}px, ${flyStart.startY - startSize/2 + dy}px) scale(${targetSize/startSize})`
                : `translate(${flyStart.startX - startSize/2}px, ${flyStart.startY - startSize/2}px) scale(1)`,
              transition: 'transform .95s cubic-bezier(0.65, 0, 0.35, 1)',
            }}>
              {/* Soft halo behind the disc */}
              <div style={{
                position: 'absolute', inset: -50, borderRadius: '50%',
                background: `radial-gradient(circle, ${T.mint}66 0%, ${T.mint}00 65%)`,
                opacity: ringOn ? 1 : 0,
                transition: 'opacity .6s ease .1s',
                pointerEvents: 'none',
              }} />
              {/* The disc itself */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: T.navy, display: 'grid', placeItems: 'center',
                boxShadow: `0 24px 56px -16px ${T.navy}88`,
              }}>
                <img src="/greenlyne-icon-off-white.svg" alt="GreenLyne"
                  style={{ width: '46%', height: '46%', objectFit: 'contain' }} />
              </div>
            </div>

            {/* Glowing gradient ring — appears around the disc once it lands */}
            <div style={{
              position: 'fixed',
              top: '50%', left: '50%',
              width: 200, height: 200,
              marginLeft: -100, marginTop: -100,
              opacity: ringOn ? 1 : 0,
              transform: `scale(${ringOn ? 1 : 0.6})`,
              transition: 'opacity .55s ease, transform .7s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: 'none',
            }}>
              {/* Track */}
              <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0 }}>
                <circle cx="100" cy="100" r="92" fill="none" stroke={T.ink10} strokeWidth="2.5" />
              </svg>
              {/* Spinning emerald arc */}
              <svg width="200" height="200" viewBox="0 0 200 200" style={{
                position: 'absolute', inset: 0,
                animation: 'glyn-spin 1.6s linear infinite',
              }}>
                <circle cx="100" cy="100" r="92" fill="none"
                  stroke={T.emerald} strokeWidth="3" strokeLinecap="round"
                  strokeDasharray="160 580" />
              </svg>
            </div>

            {/* Loading label */}
            <div style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, 0)',
              marginTop: 130,
              fontFamily: BODY, fontSize: 14, fontWeight: 600,
              color: T.ink70, letterSpacing: '0.04em',
              opacity: ringOn ? 1 : 0,
              transition: 'opacity .55s ease .15s',
            }}>
              Loading application<span className="glyn-dots" />
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/* ─── Plan teaser tile ─────────────────────────────────────────────────── */
function PlanTeaser({ eyebrow, title, sub, accent, highlight }) {
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: accent, marginBottom: 6,
      }}>
        {highlight && <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />}
        {eyebrow}
      </div>
      <div style={{
        fontFamily: DISPLAY, fontSize: 18, fontWeight: 700,
        letterSpacing: '-0.012em', color: T.navy, marginBottom: 4,
      }}>
        {title}
      </div>
      <div style={{ fontSize: 12.5, color: T.ink60, lineHeight: 1.45 }}>
        {sub}
      </div>
    </div>
  )
}

/* ─── Inline icons ─────────────────────────────────────────────────────── */
function ShieldIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function NoCheckIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> }
function ClockIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 15 14"/></svg> }
function LockIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
