import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import WesthavenHeader from '../components/WesthavenHeader'

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const T = {
  navy:    '#001660',
  royal:   '#254BCE',
  emerald: '#016163',
  mint:    '#93DDBA',
  off:     '#F5F1EE',
  white:   '#FFFFFF',
  ink70:   '#001660c7',
  ink60:   '#001660a6',
  ink40:   '#00166066',
  ink20:   '#00166026',
  ink10:   '#00166014',
  ink06:   '#0016600d',
  ink04:   '#00166008',
}
const DISPLAY = "'Sora', ui-sans-serif, system-ui, sans-serif"
const BODY    = "'Manrope', ui-sans-serif, system-ui, sans-serif"
const MONO    = "'JetBrains Mono', ui-monospace, monospace"

// ─── Customer & roof data ─────────────────────────────────────────────────────
const CUSTOMER = {
  name:        'Alex',
  address:     '4218 Maple Ridge Dr, Sacramento CA',
  panelsMax:   19,
}

const PANEL_POLYS = [
  [[298,285],[330,285],[330,315],[298,315]],
  [[332,285],[364,285],[364,315],[332,315]],
  [[366,285],[398,285],[398,315],[366,315]],
  [[400,285],[432,285],[432,315],[400,315]],
  [[434,285],[466,285],[466,315],[434,315]],
  [[298,317],[330,317],[330,347],[298,347]],
  [[332,317],[364,317],[364,347],[332,347]],
  [[366,317],[398,317],[398,347],[366,347]],
  [[400,317],[432,317],[432,347],[400,347]],
  [[434,317],[466,317],[466,347],[434,347]],
  [[298,349],[330,349],[330,379],[298,379]],
  [[332,349],[364,349],[364,379],[332,379]],
  [[366,349],[398,349],[398,379],[366,379]],
  [[400,349],[432,349],[432,379],[400,379]],
  [[434,349],[466,349],[466,379],[434,379]],
  [[298,381],[330,381],[330,411],[298,411]],
  [[332,381],[364,381],[364,411],[332,411]],
  [[366,381],[398,381],[398,411],[366,411]],
  [[400,381],[432,381],[432,411],[400,411]],
]

const PANEL_HOURS = [
  2180, 2200, 2210, 2190, 2170,
  2100, 2140, 2170, 2150, 2090,
  2020, 2060, 2100, 2080, 2010,
  1910, 1950, 1980, 1930,
]

const PANEL_RANK = PANEL_HOURS
  .map((h, i) => ({ i, h }))
  .sort((a, b) => b.h - a.h)
  .map(p => p.i)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function heatColor(h) {
  const t  = Math.max(0, Math.min(1, (h - 1800) / (2220 - 1800)))
  const c1 = [1, 97, 99]     // emerald
  const c2 = [246, 182, 75]  // sun
  const c3 = [232, 95, 31]   // sun-hot
  const mix = (a, b, k) => a.map((v, j) => Math.round(v + (b[j] - v) * k))
  const c   = t < 0.5 ? mix(c1, c2, t * 2) : mix(c2, c3, (t - 0.5) * 2)
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

function calcSavings(bill, activePanels) {
  const coverage = activePanels / CUSTOMER.panelsMax
  const solarBill = Math.max(15, Math.round(bill * (0.22 + (1 - coverage) * 0.45)))
  const monthly   = bill - solarBill
  const y20       = Math.round(monthly * 12 * 20 * 1.35)
  const avgHoursRaw = activePanels > 0
    ? PANEL_RANK.slice(0, activePanels).reduce((s, i) => s + PANEL_HOURS[i], 0) / activePanels
    : 2064
  const avgHours = Math.round(avgHoursRaw)
  const kwhYear  = Math.round(activePanels * 0.4 * avgHoursRaw)
  const co2Tons  = Math.round(kwhYear * 0.00041 * 10) / 10
  return { solarBill, monthly, y20, kwhYear, co2Tons, avgHours }
}

// ─── AnimNum ─────────────────────────────────────────────────────────────────
function AnimNum({ value, prefix = '', size = 84, color = T.navy, weight = 700, family = DISPLAY }) {
  const [disp, setDisp] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current, to = value, start = performance.now(), dur = 360
    let raf
    const tick = t => {
      const p     = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisp(Math.round(from + (to - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else prev.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <span style={{ fontFamily: family, fontWeight: weight, fontSize: size, color, letterSpacing: '-0.035em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{disp.toLocaleString()}
    </span>
  )
}

function Eyebrow({ children, color = T.ink60 }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color, fontFamily: BODY }}>
      {children}
    </div>
  )
}

// ─── RoofScene SVG ───────────────────────────────────────────────────────────
function RoofScene({ activePanels, sunProgress, onTogglePanel }) {
  const W = 720, H = 560

  const activeSet = useMemo(() => {
    const s = new Set()
    PANEL_RANK.slice(0, activePanels).forEach(i => s.add(`${i}`))
    return s
  }, [activePanels])

  const sunAngle = 200 - sunProgress * 220
  const rad  = sunAngle * Math.PI / 180
  const arcR = 260
  const cx   = W / 2
  const cy   = H / 2
  const sunCx = cx + Math.cos(rad) * arcR
  const sunCy = cy - 80 + Math.sin(rad) * arcR * 0.55

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} preserveAspectRatio="xMidYMid slice">
      <defs>
        <clipPath id="solarFrameClip"><rect width={W} height={H} rx="2" /></clipPath>
        <radialGradient id="solarSunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFE9A8" stopOpacity="0.85" />
          <stop offset="45%"  stopColor="#F6B64B" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#F6B64B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="solarVignette" cx="50%" cy="50%" r="75%">
          <stop offset="60%"  stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <filter id="solarSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      <g clipPath="url(#solarFrameClip)">
        <image href="/solar-roof-new.png" x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid slice" />

        <g>
          <g opacity={0.25}>
            {PANEL_POLYS.map((pts, i) => (
              <polygon key={`dim-${i}`} points={pts.map(p => p.join(',')).join(' ')} fill="#0a1430" />
            ))}
          </g>

          {PANEL_POLYS.map((pts, i) => {
            const active  = activeSet.has(`${i}`)
            const polyStr = pts.map(p => p.join(',')).join(' ')
            const fill    = active ? heatColor(PANEL_HOURS[i]) : '#ffffff10'
            const stroke  = active ? '#ffffff' : '#ffffff55'
            return (
              <g key={i} onClick={() => onTogglePanel(i)} style={{ cursor: 'pointer' }}>
                <polygon points={polyStr} fill={fill} stroke={stroke} strokeWidth={active ? 1.2 : 0.8} opacity={active ? 0.9 : 0.45} />
                {active && (
                  <>
                    <line x1={(pts[0][0]+pts[1][0])/2} y1={(pts[0][1]+pts[1][1])/2} x2={(pts[2][0]+pts[3][0])/2} y2={(pts[2][1]+pts[3][1])/2} stroke="#fff" strokeWidth="0.5" opacity="0.4" />
                    <line x1={(pts[0][0]+pts[3][0])/2} y1={(pts[0][1]+pts[3][1])/2} x2={(pts[1][0]+pts[2][0])/2} y2={(pts[1][1]+pts[2][1])/2} stroke="#fff" strokeWidth="0.5" opacity="0.4" />
                  </>
                )}
              </g>
            )
          })}
        </g>

        <rect width={W} height={H} fill="url(#solarVignette)" />
        <circle cx={sunCx} cy={sunCy} r="44" fill="url(#solarSunGlow)" filter="url(#solarSoft)" />
        <circle cx={sunCx} cy={sunCy} r="10" fill="#FFE9A8" opacity="0.9" />
      </g>

      {/* Compass */}
      <g transform={`translate(${W - 56} 44)`}>
        <circle r="22" fill="#00000066" stroke="#ffffff40" />
        <path d="M0 -14 L4 4 L0 0 L-4 4 Z" fill="#F6B64B" />
        <text y="18" fontSize="10" fill="#ffffff" fontFamily={MONO} textAnchor="middle" letterSpacing="0.1em">N</text>
      </g>

      {/* Scale bar */}
      <g transform={`translate(40 ${H - 40})`}>
        <rect x="-10" y="-22" width="110" height="30" rx="6" fill="#00000055" />
        <line x1="0" y1="0" x2="60" y2="0" stroke="#ffffff" strokeWidth="1.5" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#ffffff" strokeWidth="1.5" />
        <line x1="60" y1="-4" x2="60" y2="4" stroke="#ffffff" strokeWidth="1.5" />
        <text x="30" y="-8" fontSize="10" fill="#ffffff" fontFamily={MONO} textAnchor="middle">20 ft</text>
      </g>

      {/* Address pill */}
      <g>
        <rect x="32" y="30" width="300" height="50" rx="10" fill="#00000088" stroke="#ffffff25" />
        <text x="46" y="50" fontSize="10" fill="#ffffffaa" fontFamily={MONO} letterSpacing="0.14em">SATELLITE · ANALYZED</text>
        <text x="46" y="68" fontSize="13" fill="#F5F1EE" fontFamily={DISPLAY} fontWeight="700" letterSpacing="-0.01em">{CUSTOMER.address}</text>
      </g>
    </svg>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function OfferLanding() {
  const navigate = useNavigate()
  const [bill,        setBill]        = useState(220)
  const [panels,      setPanels]      = useState(18)
  const [sunProgress, setSunProgress] = useState(0.5)
  const [autoSun,     setAutoSun]     = useState(true)

  // Animate sun arc
  useEffect(() => {
    if (!autoSun) return
    let raf
    const t0 = performance.now()
    const loop = t => {
      setSunProgress(((t - t0) / 9000) % 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [autoSun])

  const { solarBill, monthly, y20, kwhYear, co2Tons, avgHours } = useMemo(
    () => calcSavings(bill, panels),
    [bill, panels]
  )

  const billPct  = Math.round((bill - 80) / (500 - 80) * 100)
  const panelPct = Math.round(panels / CUSTOMER.panelsMax * 100)

  const sunTime = (() => {
    const mins = Math.round(6 * 60 + sunProgress * 14 * 60)
    const hh   = Math.floor(mins / 60)
    const mm   = mins % 60
    const ampm = hh >= 12 ? 'PM' : 'AM'
    return `${(hh + 11) % 12 + 1}:${mm.toString().padStart(2, '0')} ${ampm}`
  })()

  const togglePanel = i => {
    const isActive = PANEL_RANK.indexOf(i) < panels
    setPanels(isActive ? Math.max(0, panels - 1) : Math.min(CUSTOMER.panelsMax, panels + 1))
  }

  const sliderBg = (pct) =>
    `linear-gradient(to right, ${T.navy} 0%, ${T.navy} ${pct}%, ${T.ink10} ${pct}%, ${T.ink10} 100%)`

  return (
    <div style={{ minHeight: '100vh', background: T.off, fontFamily: BODY }}>

      <WesthavenHeader lender="grand-bank" maxWidth={1360} padding="0 40px" />

      <main style={{
        maxWidth: 1360, margin: '0 auto', padding: '32px 40px 56px',
        display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 28, alignItems: 'start',
      }}>

        {/* ── LEFT — roof visualization ── */}
        <section>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <Eyebrow>Roof analysis</Eyebrow>
              <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', margin: '8px 0 0', color: T.navy }}>
                Hi {CUSTOMER.name} — here's solar on your roof.
              </h1>
            </div>
          </div>

          {/* Roof card */}
          <div style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, #07153a 0%, #122a5c 100%)', border: `1px solid ${T.ink10}`, boxShadow: '0 30px 80px -30px #00166077', position: 'relative' }}>
            <RoofScene activePanels={panels} sunProgress={sunProgress} onTogglePanel={togglePanel} />

            {/* Sun time HUD */}
            <div style={{ position: 'absolute', top: 18, right: 90, padding: '8px 12px', borderRadius: 10, background: '#00000055', border: '1px solid #ffffff20', color: '#F5F1EE', fontSize: 11, fontFamily: MONO, letterSpacing: '.1em' }}>
              {sunTime}
            </div>

            {/* Panel count HUD */}
            <div style={{ position: 'absolute', bottom: 18, right: 18, padding: '10px 14px', borderRadius: 12, background: '#00000066', border: '1px solid #ffffff20', color: '#F5F1EE', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10.5, fontFamily: MONO, color: '#ffffff99', letterSpacing: '.12em', textTransform: 'uppercase' }}>Panels</span>
              <span style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700 }}>{panels} <span style={{ opacity: 0.5, fontSize: 13 }}>/ {CUSTOMER.panelsMax}</span></span>
            </div>
          </div>

          {/* Legend + sun toggle */}
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1.3fr auto', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: T.ink04, borderRadius: 12 }}>
              <span style={{ fontSize: 10.5, fontFamily: MONO, color: T.ink60, letterSpacing: '.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Sun hours / yr</span>
              <div style={{ flex: 1, height: 10, borderRadius: 999, background: `linear-gradient(90deg, ${heatColor(1800)}, ${heatColor(2000)}, ${heatColor(2200)})` }} />
              <span style={{ fontSize: 11, fontFamily: MONO, color: T.ink60 }}>1,800</span>
              <span style={{ fontSize: 11, fontFamily: MONO, color: T.ink60 }}>2,200+</span>
            </div>
            <button
              onClick={() => setAutoSun(v => !v)}
              style={{ padding: '10px 14px', borderRadius: 12, border: `1px solid ${T.ink10}`, background: T.white, fontSize: 12, fontWeight: 700, color: T.navy, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: BODY }}
            >
              {autoSun ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polygon points="6 4 20 12 6 20" fill="currentColor" />
                </svg>
              )}
              {autoSun ? 'Pause sun' : 'Play sun path'}
            </button>
          </div>

          {/* Stats grid */}
          <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Avg sun/yr',    value: avgHours.toLocaleString(),         sub: 'hours on active panels' },
              { label: 'System size',   value: `${(panels * 0.4).toFixed(1)} kW`, sub: `${panels} × 400W panels` },
              { label: 'Annual output', value: `${(kwhYear / 1000).toFixed(1)}K`, sub: 'kWh / year' },
              { label: 'CO₂ offset',   value: `${co2Tons}`,                       sub: 'tons / year' },
            ].map(s => (
              <div key={s.label} style={{ background: T.white, border: `1px solid ${T.ink10}`, borderRadius: 14, padding: '14px' }}>
                <Eyebrow color={T.ink60}>{s.label}</Eyebrow>
                <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: T.navy, letterSpacing: '-0.02em', marginTop: 6 }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: T.ink60, marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── RIGHT — savings + controls (sticky) ── */}
        <section style={{ display: 'grid', gap: 16, position: 'sticky', top: 120, maxWidth: 420, marginTop: 40, justifySelf: 'start', width: '100%' }}>

          {/* Align header row with left section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, minHeight: 62 }}>
            <div>
              <Eyebrow>Your savings</Eyebrow>
              <h2 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em', margin: '6px 0 0', color: T.navy }}>
                Numbers refresh as you drag.
              </h2>
            </div>
          </div>

          {/* Monthly savings hero card */}
          <div style={{ background: T.navy, color: T.off, borderRadius: 22, padding: '28px 30px 26px', boxShadow: '0 30px 70px -28px #00166088', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -80, top: -80, width: 260, height: 260, borderRadius: '50%', background: '#254BCE33', filter: 'blur(10px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <Eyebrow color={T.mint}>You could save · every month</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
                <AnimNum value={monthly} prefix="$" color={T.mint} size={84} />
                <span style={{ fontFamily: DISPLAY, fontSize: 20, color: '#F5F1EE99', fontWeight: 500 }}>/mo</span>
              </div>

              {/* Before → After */}
              <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 12, background: '#F5F1EE0a', border: '1px solid #F5F1EE22', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: MONO, letterSpacing: '.12em', textTransform: 'uppercase', color: '#F5F1EE77' }}>Today</div>
                  <div style={{ marginTop: 3, display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <AnimNum value={bill} prefix="$" size={22} color={T.off} family={DISPLAY} />
                    <span style={{ fontSize: 12, color: '#F5F1EE77', fontWeight: 500 }}>/mo</span>
                  </div>
                </div>
                <svg width="26" height="16" viewBox="0 0 26 16" fill="none">
                  <path d="M2 8h18M16 3l5 5-5 5" stroke="#F5F1EE55" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, fontFamily: MONO, letterSpacing: '.12em', textTransform: 'uppercase', color: T.mint }}>With solar</div>
                  <div style={{ marginTop: 3, display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'flex-end' }}>
                    <AnimNum value={solarBill} prefix="$" size={22} color={T.mint} family={DISPLAY} />
                    <span style={{ fontSize: 12, color: '#F5F1EE77', fontWeight: 500 }}>/mo</span>
                  </div>
                </div>
              </div>

              {/* 20-year strip */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #ffffff22', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#F5F1EEAA', lineHeight: 1.4 }}>Over 20 years, with 3% rate escalation</span>
                <AnimNum value={y20} prefix="$" size={24} color={T.off} family={DISPLAY} />
              </div>
            </div>
          </div>

          {/* Panel count slider */}
          <div style={{ background: T.white, border: `1px solid ${T.ink10}`, borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <div>
                <Eyebrow>Panels on your roof</Eyebrow>
                <div style={{ fontSize: 12, color: T.ink60, marginTop: 3 }}>Activated in highest-sun order</div>
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: T.navy, letterSpacing: '-0.015em' }}>
                {panels}<span style={{ fontSize: 13, color: T.ink40, fontWeight: 500 }}> / {CUSTOMER.panelsMax}</span>
              </div>
            </div>
            <input
              type="range" min="0" max={CUSTOMER.panelsMax} step="1" value={panels}
              onChange={e => setPanels(parseInt(e.target.value))}
              className="solar-slider"
              style={{ background: sliderBg(panelPct) }}
            />
          </div>

          {/* Bill slider */}
          <div style={{ background: T.white, border: `1px solid ${T.ink10}`, borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <div>
                <Eyebrow>Your current electric bill</Eyebrow>
                <div style={{ fontSize: 12, color: T.ink60, marginTop: 3 }}>Live update — numbers refresh as you drag</div>
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: T.navy, letterSpacing: '-0.015em' }}>
                ${bill}<span style={{ fontSize: 13, color: T.ink40, fontWeight: 500 }}>/mo</span>
              </div>
            </div>
            <input
              type="range" min="80" max="500" step="5" value={bill}
              onChange={e => setBill(parseInt(e.target.value))}
              className="solar-slider"
              style={{ background: sliderBg(billPct) }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: T.ink40, fontFamily: MONO }}>
              <span>$80</span><span>$250</span><span>$500+</span>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'grid', gap: 8 }}>
            <button
              onClick={() => navigate('/pos-demo')}
              style={{ padding: '16px 24px', borderRadius: 999, background: T.royal, color: T.off, border: 0, fontFamily: BODY, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: `0 18px 40px -16px ${T.royal}`, transition: 'filter 0.15s' }}
              onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseOut={e => e.currentTarget.style.filter = ''}
            >
              Start my loan application
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
            <button style={{ padding: '12px 20px', borderRadius: 999, background: 'transparent', color: T.navy, border: `1px solid ${T.ink20}`, fontFamily: BODY, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
              Talk to a solar specialist first
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {['No hard credit pull yet', 'Takes ~5 min', 'No obligation'].map(label => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: T.ink04, fontSize: 11, fontWeight: 600, color: T.ink70 }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.2L5 8.7L9.7 3.5" stroke={T.emerald} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ padding: '24px 48px 32px', borderTop: `1px solid ${T.ink10}`, marginTop: 20, background: T.white }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', fontSize: 11, color: T.ink40, lineHeight: 1.6 }}>
          Sun hours, shade, and roof geometry are derived from satellite imagery and LIDAR. Production and savings estimates assume typical panel degradation and 3% annual utility escalation. Financing provided by Grand Bank (NMLS #2611). Not a commitment to lend.
        </div>
      </footer>
    </div>
  )
}
