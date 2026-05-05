import { useEffect, useState } from 'react'
import { T, FONT, RADIUS } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, ConfirmBar, PageHeader, Card } from '../AppShell'

const DOCS = [
  'Loan agreement',
  'Truth in Lending Disclosure',
  'Right to Cancel',
  'eSign consent',
  'Borrower acknowledgements',
]

export default function ScreenSigningInProgress({ dispatch, step }) {
  const [signed, setSigned] = useState(0)

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Live signing session"
        eyebrowColor={T.royal}
        title="Sign each document with your eNotary."
        sub="The eNotary will guide you through each form on a 30-minute video call. Your signatures are tamper-evident and timestamped." />

      <div style={{ maxWidth: 720 }}>
        <Card>
          {DOCS.map((d, i) => {
            const done = i < signed
            const active = i === signed
            return (
              <div key={d} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 0', borderTop: i === 0 ? 0 : `1px dashed ${T.ink10}`,
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: done ? T.emerald : active ? T.royal : T.ink10,
                  color: done || active ? T.off : T.navy,
                  display: 'grid', placeItems: 'center', fontFamily: FONT.display, fontWeight: 700, fontSize: 12,
                }}>
                  {done ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.off} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : (i + 1)}
                </span>
                <span style={{ flex: 1, fontFamily: FONT.display, fontSize: 14, fontWeight: active ? 700 : 600, color: done ? T.ink60 : T.navy }}>{d}</span>
                <button onClick={active ? () => setSigned(s => s + 1) : undefined}
                  disabled={!active}
                  style={{
                    padding: '8px 14px', borderRadius: 999,
                    background: active ? T.royal : 'transparent', color: active ? T.off : T.ink40,
                    border: active ? 0 : `1px solid ${T.ink10}`,
                    fontWeight: 700, fontSize: 12, fontFamily: FONT.body,
                    cursor: active ? 'pointer' : 'default',
                  }}>{done ? 'Signed' : active ? 'Sign now' : 'Pending'}</button>
              </div>
            )
          })}
        </Card>
      </div>

      <ConfirmBar
        onContinue={() => dispatch({ type: 'SIGN' })}
        continueDisabled={signed < DOCS.length}
        continueLabel="Finalize signing"
        summary={<div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>Signed {signed}/{DOCS.length}</div>}
      />
    </ApplicationLayout>
  )
}
