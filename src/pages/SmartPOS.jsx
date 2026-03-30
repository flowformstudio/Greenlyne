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

// ── REFINED screen ─────────────────────────────────────────────────────────────
function ScreenRefined({ source, billRange, onNext }) {
  const savings = Math.max(20, Math.round((billRange - 20) * 0.7 / 10) * 10)
  const solarPayment = billRange - savings

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <Header source={source} />
      <ProgressDots step={3} />

      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(1,97,99,0.08)', border: '1px solid rgba(1,97,99,0.2)', borderRadius: 100, padding: '4px 10px', marginBottom: 10 }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="3" role="img" aria-label="Estimate updated"><polyline points="20 6 9 17 4 12"/></svg>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.teal }}>Updated for your bill range</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, lineHeight: 1.2, marginBottom: 3 }}>Here's your refined plan.</div>
        <div style={{ fontSize: 11, color: C.muted }}>Based on a ${Math.round(billRange * 0.85)}–${billRange}/mo bill at 1482 Sunridge Drive</div>
      </div>

      {/* Savings hero */}
      <div style={{ margin: '12px 16px 0', background: C.navy, borderRadius: 14, padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Est. monthly savings</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.green, letterSpacing: '-0.03em', lineHeight: 1 }}>${savings}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>per month · after switching to solar</div>
      </div>

      {/* Before / After */}
      <div style={{ margin: '10px 16px 0', display: 'grid', gridTemplateColumns: '1fr auto 1fr', background: C.white, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,22,96,0.07)' }}>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Now</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.muted, letterSpacing: '-0.02em', lineHeight: 1, textDecoration: 'line-through', textDecorationColor: 'rgba(224,39,26,0.5)' }}>${billRange}</div>
          <div style={{ fontSize: 9, color: '#d1d5db', marginTop: 2 }}>electric bill</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: '#d1d5db', fontSize: 14, background: '#f8f9fa' }}>→</div>
        <div style={{ padding: 12, background: 'rgba(0,22,96,0.03)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>With solar</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, letterSpacing: '-0.02em', lineHeight: 1 }}>${solarPayment}</div>
          <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>fixed payment</div>
        </div>
      </div>

      {/* Expectation setter */}
      <div style={{ margin: '10px 16px 0', padding: '10px 12px', background: 'rgba(37,75,206,0.05)', borderRadius: 10, border: '1px solid rgba(37,75,206,0.1)' }}>
        <div style={{ fontSize: 10, color: C.blue, lineHeight: 1.6 }}>After you confirm, a solar specialist will walk you through your exact plan.</div>
      </div>

      {/* CTA */}
      <div style={{ padding: '12px 16px 14px' }}>
        <button
          onClick={onNext}
          style={{ width: '100%', background: C.navy, border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Confirm &amp; Get Exact Plan →
        </button>
      </div>
    </div>
  )
}

// ── INTENT screen ──────────────────────────────────────────────────────────────
function ScreenIntent({ source, billRange, onConfirm }) {
  const savings = Math.max(20, Math.round((billRange - 20) * 0.7 / 10) * 10)
  const solarPayment = billRange - savings

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <Header source={source} />

      <div style={{ padding: '28px 16px 0', textAlign: 'center' }}>
        {/* Plan summary card */}
        <div style={{ background: C.navy, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Your plan · 1482 Sunridge Drive</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Solar payment</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.white }}>${solarPayment}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>/mo</span></div>
            </div>
            <div style={{ background: 'rgba(147,221,186,0.12)', borderRadius: 10, padding: 10, border: '1px solid rgba(147,221,186,0.2)' }}>
              <div style={{ fontSize: 9, color: 'rgba(147,221,186,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>You save</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>${savings}<span style={{ fontSize: 11, color: 'rgba(147,221,186,0.5)' }}>/mo</span></div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Est. system: 8.4 kW · $131,800 HELOC · $0 down</div>
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 6, lineHeight: 1.25 }}>Ready to get your exact plan?</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
          A solar specialist will walk you through the confirmed numbers and answer your questions.
        </div>

        {source === 'qr' ? (
          /* QR: single CTA, rep notified silently */
          <>
            <button
              onClick={onConfirm}
              style={{ width: '100%', background: C.teal, border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}
            >
              Confirm &amp; Get My Exact Plan
            </button>
            <div style={{ fontSize: 11, color: C.muted, paddingBottom: 20 }}>No commitment · No credit check · Takes 2 minutes</div>
          </>
        ) : (
          /* Email: two CTAs */
          <>
            <button
              onClick={onConfirm}
              style={{ width: '100%', background: C.teal, border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}
            >
              Talk to a specialist now
            </button>
            <button
              onClick={onConfirm}
              style={{ width: '100%', background: 'transparent', border: '1.5px solid rgba(0,22,96,0.2)', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 600, color: C.navy, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}
            >
              We'll reach out shortly
            </button>
            <div style={{ fontSize: 11, color: C.muted, paddingBottom: 20 }}>No commitment · No credit check · Takes 2 minutes</div>
          </>
        )}
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
        <ScreenRefined
          source={source}
          billRange={billRange}
          onNext={() => setPhase(STATES.INTENT)}
        />
      )}
      {phase === STATES.INTENT && (
        <ScreenIntent
          source={source}
          billRange={billRange}
          onConfirm={() => setPhase(STATES.HANDOFF)}
        />
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
