import { useEffect, useState } from 'react'
import { T, FONT, TYPE, RADIUS } from '../tokens'
import { Eyebrow, BrandMark } from '../primitives'
import { ApplicationLayout, PageHeader } from '../AppShell'

const STEPS = [
  'Retrieving property value…',
  'Pulling soft credit report…',
  'Checking title & ownership…',
  'Optimizing loan offer…',
  'Personalizing maximum amount…',
  'Configuring APR…',
  'Configuring loan insurance…',
]

const OUTCOMES = [
  { value: 'success',            label: 'Success — show offer' },
  { value: 'identity',           label: 'Identity challenge' },
  { value: 'address',            label: 'Address challenge' },
  { value: 'property',           label: 'Property challenge (not qualified)' },
  { value: 'decline',            label: 'Full decline' },
  { value: 'debt_consolidation', label: 'Debt consolidation' },
]

export default function ScreenAnalyzing({ state, dispatch, step, mode }) {
  const isReanalyze = mode === 'reanalyze'
  const isPicker    = mode === 'picker'
  const [progress, setProgress] = useState(isPicker ? 100 : 0)
  const [stepIdx,  setStepIdx]  = useState(isPicker ? STEPS.length : 0)
  const [isDone,   setIsDone]   = useState(isPicker)
  const [outcome,  setOutcome]  = useState('success')

  useEffect(() => {
    if (isPicker) return
    const stagePcts = isReanalyze ? [8,18,28,40,50,60,68] : [10,25,42,58,72,85,95]
    const stageMsec = isReanalyze ? [600,1500,2700,3900,5000,6100,7100] : [400,1100,2000,2900,3700,4500,5300]
    const doneMs    = isReanalyze ? 8400 : 6300
    const finalPct  = isReanalyze ? 70   : 100

    const timers = stageMsec.map((ms, i) => setTimeout(() => {
      setProgress(stagePcts[i]); setStepIdx(i)
    }, ms))
    const done = setTimeout(() => {
      setProgress(finalPct); setStepIdx(STEPS.length); setIsDone(true)
      if (!isReanalyze) {
        setTimeout(() => dispatch({ type: 'AUTO_ADVANCE' }), 400)
      }
    }, doneMs)
    let fillFinal, advance
    if (isReanalyze) {
      fillFinal = setTimeout(() => setProgress(100), doneMs + 300)
      advance   = setTimeout(() => dispatch({ type: 'JUMP_TO', state: 'offer_select' }), doneMs + 3800)
    }
    return () => {
      timers.forEach(clearTimeout); clearTimeout(done)
      if (fillFinal) clearTimeout(fillFinal); if (advance) clearTimeout(advance)
    }
  }, [isReanalyze, isPicker, dispatch])

  const successHeading = isReanalyze && isDone
  const heading = successHeading ? 'Verified — preparing your offer'
                : isPicker        ? 'Analysis complete'
                :                   'Analyzing your application'
  const sub = successHeading ? "All checks passed. Loading your personalized offer now."
            : isPicker        ? 'All checks passed. Pick the next outcome.'
            :                   'This usually takes 30–45 seconds.'

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow={isReanalyze ? 'Re-running checks' : 'Real-time analysis'}
        eyebrowColor={successHeading ? T.emerald : T.royal}
        title={heading}
        sub={sub} />

      <div style={{
        maxWidth: 720,
        background: T.white, border: `1px solid ${T.ink10}`,
        borderRadius: RADIUS.card, padding: '28px 32px',
      }}>
        {/* Spinner / check icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: successHeading ? T.mintLite : 'rgba(37,75,206,0.07)',
          border: `2px solid ${successHeading ? T.mint : 'rgba(37,75,206,0.18)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18,
        }}>
          {successHeading ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.emerald} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg className="animate-spin" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.royal} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 99, background: T.ink10, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: successHeading ? T.emerald : T.royal,
            width: `${progress}%`, transition: 'width 0.8s ease',
          }} />
        </div>
        <div style={{ ...TYPE.monoCap, color: T.ink60, marginBottom: 22 }}>
          {STEPS[Math.min(stepIdx, STEPS.length - 1)]}
        </div>

        {/* Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {STEPS.map((s, i) => {
            const done = i < stepIdx
            const active = i === stepIdx
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderTop: i === 0 ? 0 : `1px dashed ${T.ink10}`,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: done ? T.emerald : active ? T.royal : T.ink10,
                  display: 'grid', placeItems: 'center',
                }}>
                  {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.white }} />}
                </div>
                <span style={{
                  fontSize: 13.5,
                  color: done ? T.ink60 : active ? T.navy : T.ink40,
                  fontWeight: active ? 600 : 400,
                }}>{s}</span>
              </div>
            )
          })}
        </div>

        {/* Demo control panel */}
        {isDone && !isReanalyze && (
          <div style={{
            marginTop: 28, padding: '14px 16px',
            background: T.white, border: `1px dashed ${T.amber}`,
            borderRadius: RADIUS.cardSm,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              ...TYPE.eyebrow, fontSize: 9.5, color: T.amber,
              padding: '3px 7px', borderRadius: 6,
              background: 'rgba(200,107,0,0.1)', flexShrink: 0,
            }}>Demo</span>
            <select value={outcome} onChange={e => setOutcome(e.target.value)}
              style={{
                flex: 1, padding: '9px 32px 9px 12px', fontSize: 13.5,
                border: `1px solid ${T.ink20}`, borderRadius: 10,
                color: T.navy, fontFamily: FONT.body, fontWeight: 600,
                appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
                background: `${T.white} url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23001660' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 10px center`,
              }}>
              {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => dispatch({ type: 'PICK_OUTCOME', outcome })}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 999,
                background: T.royal, color: T.off, border: 0,
                fontSize: 13, fontWeight: 700, fontFamily: FONT.body, cursor: 'pointer',
              }}>
              Continue
              <BrandMark size={13} color={T.off} />
            </button>
          </div>
        )}
      </div>
    </ApplicationLayout>
  )
}
