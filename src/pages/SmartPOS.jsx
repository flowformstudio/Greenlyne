// src/pages/SmartPOS.jsx
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const C = {
  navy: '#001660', blue: '#254BCE', teal: '#016163',
  green: '#93DDBA', bg: '#F5F1EE', white: '#ffffff', muted: '#94a3b8',
}

const STATES = {
  ESTIMATE:      'ESTIMATE',
  MICRO_CONFIRM: 'MICRO_CONFIRM',
  REFINED:       'REFINED',
  INTENT:        'INTENT',
  HANDOFF:       'HANDOFF',
}

const HANDOFF_STATES = {
  PENDING:   'PENDING',
  SCHEDULED: 'SCHEDULED',
  ACTIVE:    'ACTIVE',
  COMPLETED: 'COMPLETED',
}

// ── Shared header ──────────────────────────────────────────────────────────────
function Header({ source }) {
  return (
    <div style={{ background: C.white, borderBottom: '1px solid rgba(0,22,96,0.07)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Westhaven logo placeholder */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, background: '#e0271a', borderRadius: 1 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: '#0d0d0d' }}>Westhaven</span>
      </div>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Powered by GreenLyne
      </div>
    </div>
  )
}

// ── Progress dots ──────────────────────────────────────────────────────────────
function ProgressDots({ step, total = 4 }) {
  return (
    <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ width: 20, height: 4, borderRadius: 2, background: i < step ? C.navy : 'rgba(0,22,96,0.12)' }} />
      ))}
      <span style={{ fontSize: 10, color: C.muted, marginLeft: 4 }}>Step {step} of {total}</span>
    </div>
  )
}

// ── ESTIMATE screen ────────────────────────────────────────────────────────────
function ScreenEstimate({ source, onNext }) {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <Header source={source} />

      {/* Address pill */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(1,97,99,0.08)', border: '1px solid rgba(1,97,99,0.15)', borderRadius: 100, padding: '5px 12px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.teal }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.teal }}>1482 Sunridge Drive, Sacramento CA</span>
        </div>
      </div>

      {/* Headline */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          Your home may qualify for a solar plan that lowers your monthly energy cost.
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Current bill */}
        <div style={{ background: C.white, borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(0,22,96,0.07)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Current electric bill</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.navy, letterSpacing: '-0.03em', lineHeight: 1 }}>
            $1,400<span style={{ fontSize: 16, color: C.muted, fontWeight: 400 }}>/mo</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Unpredictable · rises every year</div>
        </div>

        {/* Solar payment */}
        <div style={{ background: C.navy, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Estimated solar payment</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.green, letterSpacing: '-0.03em', lineHeight: 1 }}>
            $1,260<span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>/mo</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Fixed rate · you own the system</div>
        </div>

        {/* Savings */}
        <div style={{ background: 'rgba(147,221,186,0.15)', border: '1px solid rgba(147,221,186,0.3)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Est. monthly savings</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.teal, letterSpacing: '-0.03em', lineHeight: 1 }}>
              $140<span style={{ fontSize: 16, fontWeight: 400 }}>/mo</span>
            </div>
          </div>
          <div style={{ fontSize: 28 }}>🌿</div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '20px' }}>
        <button
          onClick={onNext}
          style={{ width: '100%', background: C.navy, border: 'none', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          See Your Exact Plan →
        </button>
        <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 8 }}>We ran this estimate for your property · No commitment</div>
      </div>
    </div>
  )
}

// ── MICRO_CONFIRM screen ───────────────────────────────────────────────────────
function ScreenMicroConfirm({ source, billRange, setBillRange, onNext }) {
  const [owns, setOwns] = useState(true)

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <Header source={source} />
      <ProgressDots step={2} />

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, lineHeight: 1.2, marginBottom: 4 }}>
          Confirm two details to sharpen your estimate.
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>Takes 10 seconds.</div>
      </div>

      {/* Bill slider */}
      <div style={{ margin: '16px 20px 0', background: C.white, borderRadius: 16, padding: 18, border: '1px solid rgba(0,22,96,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
          What's your average monthly electric bill?
        </div>
        <input
          type="range" min={50} max={300} step={10}
          value={billRange}
          onChange={e => setBillRange(Number(e.target.value))}
          style={{ width: '100%', accentColor: C.navy, marginBottom: 10 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: C.muted }}>$50</span>
          <span style={{ fontSize: 10, color: C.muted }}>$300+</span>
        </div>
        <div style={{ textAlign: 'center', background: 'rgba(0,22,96,0.05)', borderRadius: 8, padding: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>${billRange}</span>
          <span style={{ fontSize: 13, color: C.muted }}>/mo</span>
        </div>
      </div>

      {/* Ownership toggle */}
      <div style={{ margin: '12px 20px 0', background: C.white, borderRadius: 16, padding: 18, border: '1px solid rgba(0,22,96,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
          Do you own 1482 Sunridge Drive?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: '🏠 Yes, I own it', value: true },
            { label: '🏢 I rent', value: false },
          ].map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setOwns(opt.value)}
              style={{
                borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit',
                border: owns === opt.value ? `2px solid ${C.navy}` : '2px solid rgba(0,22,96,0.12)',
                background: owns === opt.value ? C.navy : C.white,
                fontSize: 12, fontWeight: 700,
                color: owns === opt.value ? C.white : C.muted,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '16px 20px 20px' }}>
        <button
          onClick={onNext}
          style={{ width: '100%', background: C.blue, border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Update My Estimate →
        </button>
      </div>
    </div>
  )
}

// ── Main SmartPOS component ────────────────────────────────────────────────────
export default function SmartPOS() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const source = searchParams.get('source') || 'email' // 'qr' | 'email'

  const [phase, setPhase] = useState(STATES.ESTIMATE)
  const [handoffPhase, setHandoffPhase] = useState(HANDOFF_STATES.PENDING)
  const [billRange, setBillRange] = useState(140) // slider value
  const [billBucket, setBillBucket] = useState(null) // chip selection

  // Viewport: QR = 390px mobile, Email = full desktop
  const wrapperStyle = source === 'qr'
    ? { maxWidth: 390, margin: '0 auto' }
    : { width: '100%' }

  function goToFinancing() {
    navigate('/financing', {
      state: {
        address: '1482 Sunridge Drive',
        city: 'Sacramento',
        state: 'CA',
        billRange,
        estimate: { payment: 1260, savings: 140, currentBill: 1400 },
        source,
      }
    })
  }

  return (
    <div style={wrapperStyle}>
      {phase === STATES.ESTIMATE && (
        <ScreenEstimate source={source} onNext={() => setPhase(STATES.MICRO_CONFIRM)} />
      )}
      {phase === STATES.MICRO_CONFIRM && (
        <ScreenMicroConfirm
          source={source}
          billRange={billRange}
          setBillRange={setBillRange}
          onNext={() => setPhase(STATES.REFINED)}
        />
      )}
      {phase === STATES.REFINED && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: C.muted, fontSize: 14 }}>REFINED — coming in Task 5</div>
          <button onClick={() => setPhase(STATES.INTENT)} style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>Next →</button>
        </div>
      )}
      {phase === STATES.INTENT && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: C.muted, fontSize: 14 }}>INTENT — coming in Task 6</div>
          <button onClick={() => setPhase(STATES.HANDOFF)} style={{ background: C.teal, color: C.white, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>Next →</button>
        </div>
      )}
      {phase === STATES.HANDOFF && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: C.muted, fontSize: 14 }}>HANDOFF ({handoffPhase}) — coming in Task 7</div>
          <button onClick={goToFinancing} style={{ background: C.green, color: C.navy, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>→ Financing</button>
        </div>
      )}
    </div>
  )
}
