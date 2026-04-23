import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WesthavenHeader from '../components/WesthavenHeader'

const C = {
  navy:      '#001660',
  blue:      '#254BCE',
  teal:      '#016163',
  green:     '#93DDBA',
  greenDark: '#1a7a50',
  bg:        '#F5F1EE',
  white:     '#ffffff',
  border:    '#D1D1D1',
  muted:     '#6B7280',
  text:      '#111827',
}

function calcSavings(bill) {
  const solar = Math.round(bill * 0.25)
  return { bill, solar, saves: bill - solar }
}

export default function OfferLanding() {
  const navigate    = useNavigate()
  const [bill, setBill] = useState(220)
  const { solar, saves } = calcSavings(bill)

  const systemKw    = Math.round((bill / 150) * 5 * 10) / 10
  const savings20yr = Math.round(saves * 12 * 20 * 2.7 / 1000) * 1000

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <WesthavenHeader lender="grand-bank" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', paddingBottom: 56 }}>

        {/* ── FULL-BLEED SATELLITE IMAGE ──────────────────────────────── */}
        <div style={{ position: 'relative', width: '100%', height: 300, overflow: 'hidden', flexShrink: 0 }}>
          <img
            src="/solar-map.jpg"
            alt="Aerial satellite view of roof"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }}
          />

          {/* Solar heat overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 34% 22% at 50% 44%, rgba(255,224,51,0.55) 0%, rgba(255,130,0,0.38) 40%, rgba(180,30,0,0.18) 75%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* Analysis complete badge */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '5px 13px',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 700, color: C.green,
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 5L4 8L9 2" stroke="#93DDBA" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            </svg>
            Analysis complete
          </div>

          {/* Address badge */}
          <div style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '5px 13px',
            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.88)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            📍 1482 Sunridge Drive, Sacramento
          </div>
        </div>

        {/* ── CONTENT ─────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '0 20px' }}>

          {/* Big title */}
          <div style={{ padding: '28px 0 20px' }}>
            <h1 style={{ fontSize: 34, fontWeight: 700, color: C.navy, margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              Hi Alex, your roof looks great for solar!
            </h1>
          </div>

          {/* ── 3 STAT TILES ──────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            <StatTile value="1,804" label="hrs/yr usable sunlight" />
            <StatTile value="1,226" label="sq ft available" />
            <StatTile
              value={`$${savings20yr.toLocaleString()}`}
              label="savings over 20 years"
              dark
              valueSize={savings20yr >= 100000 ? 15 : 18}
            />
          </div>

          {/* ── SAVINGS CARD ──────────────────────────────────────────── */}
          <div style={{ background: C.navy, borderRadius: 16, marginBottom: 20, overflow: 'hidden' }}>

            {/* Savings display */}
            <div style={{ padding: '20px 20px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(147,221,186,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Estimated monthly savings
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>Current bill</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: C.white }}>~${bill}/mo</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>With solar</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: C.green }}>~${solar}/mo</div>
                </div>
              </div>

              {/* Savings highlight */}
              <div style={{
                background: 'rgba(147,221,186,0.15)', border: '1px solid rgba(147,221,186,0.3)',
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 14,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(147,221,186,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                    You save
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Based on your current bill</div>
                </div>
                <div style={{ fontSize: 34, fontWeight: 900, color: C.green, letterSpacing: '-1px', lineHeight: 1 }}>
                  ~${saves}<span style={{ fontSize: 18, fontWeight: 700 }}>/mo</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <MiniStat label="Est. system size" value={`${systemKw} kW`} />
                <MiniStat label="Est. project cost" value={`$${Math.round(systemKw * 3.2 * 1000).toLocaleString()}`} />
              </div>
            </div>

            {/* Bill slider */}
            <div style={{ padding: '14px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                Adjust your average monthly electric bill
              </div>
              <input
                type="range" min={50} max={500} step={5} value={bill}
                onChange={e => setBill(Number(e.target.value))}
                style={{ width: '100%', accentColor: C.green, height: 4, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>$50</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.green }}>${bill}/mo</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>$500</span>
              </div>
            </div>
          </div>

          {/* ── BIG CTA ───────────────────────────────────────────────── */}
          <button
            onClick={() => navigate('/pos-demo')}
            style={{
              width: '100%',
              padding: '18px 24px',
              background: C.blue,
              color: C.white,
              border: 'none',
              borderRadius: 16,
              fontSize: 19,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(37,75,206,0.35)',
              letterSpacing: '-0.01em',
              transition: 'background 0.15s, transform 0.1s',
              marginBottom: 12,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1e3fa8'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.transform = '' }}
          >
            Start my loan application →
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, margin: 0 }}>
            Takes ~5 minutes &nbsp;·&nbsp; No hard credit pull &nbsp;·&nbsp; No obligation
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatTile({ value, label, dark = false, valueSize = 18 }) {
  return (
    <div style={{
      background: dark ? C.navy : C.white,
      border: dark ? 'none' : `1.5px solid ${C.border}`,
      borderRadius: 14, padding: '15px 11px 12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: valueSize, fontWeight: 900, color: dark ? C.green : C.navy, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
        marginTop: 5, lineHeight: 1.4,
        color: dark ? 'rgba(255,255,255,0.45)' : C.muted,
      }}>
        {label}
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.white }}>{value}</div>
    </div>
  )
}
