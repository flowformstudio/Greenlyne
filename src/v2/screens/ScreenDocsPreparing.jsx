import { useEffect, useState } from 'react'
import { T, FONT } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, ConfirmBar, PageHeader, Card } from '../AppShell'

const ITEMS = [
  'Loan agreement (full text)',
  'Truth in Lending Disclosure',
  'Right to Cancel form',
  'eSign consent',
  'Borrower acknowledgements',
]

export default function ScreenDocsPreparing({ dispatch, step }) {
  const [doneCount, setDoneCount] = useState(0)
  useEffect(() => {
    const ms = [600, 1200, 1900, 2600, 3300]
    const timers = ms.map((t, i) => setTimeout(() => setDoneCount(i + 1), t))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Closing prep"
        eyebrowColor={T.royal}
        title="Preparing your closing documents."
        sub="We're generating your loan agreement, disclosures, and signing package. This usually takes a few seconds." />

      <div style={{ maxWidth: 640 }}>
        <Card>
          {ITEMS.map((label, i) => {
            const done   = i < doneCount
            const active = i === doneCount
            return (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderTop: i === 0 ? 0 : `1px dashed ${T.ink10}`,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: done ? T.emerald : active ? T.royal : T.ink10,
                  display: 'grid', placeItems: 'center',
                }}>
                  {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.off} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.off }} />}
                </span>
                <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: done ? T.ink60 : active ? T.navy : T.ink40 }}>{label}</span>
              </div>
            )
          })}
        </Card>
      </div>

      <ConfirmBar
        onContinue={() => dispatch({ type: 'NEXT' })}
        continueDisabled={doneCount < ITEMS.length}
        continueLabel="Continue to scheduling"
        summary={<div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>Documents · {doneCount}/{ITEMS.length}</div>}
      />
    </ApplicationLayout>
  )
}
