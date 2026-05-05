import { useState } from 'react'
import { T, FONT, RADIUS } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, ConfirmBar, PageHeader, Card } from '../AppShell'

const SOURCES = [
  { id: 'plaid',   name: 'Bank account (Plaid)',     desc: 'Securely link your bank to verify deposits in seconds.', recommended: true },
  { id: 'payroll', name: 'Payroll provider',         desc: 'ADP, Gusto, Paychex — auto-pulls your pay stubs.' },
  { id: 'upload',  name: 'Upload pay stubs',         desc: 'Manually upload your most recent two pay stubs (PDF or image).' },
]

export default function ScreenLinkIncome({ dispatch, step }) {
  const [linked, setLinked] = useState(null)

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Income verification"
        eyebrowColor={T.royal}
        title="Verify your income."
        sub="Pick the fastest method that works for you. Most applicants finish in under a minute via Plaid." />

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SOURCES.map(s => {
          const active = linked === s.id
          return (
            <button key={s.id} onClick={() => setLinked(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '18px 20px', textAlign: 'left',
                background: active ? 'rgba(37,75,206,0.05)' : T.white,
                border: `1.5px solid ${active ? T.royal : T.ink10}`,
                borderRadius: RADIUS.card, cursor: 'pointer',
                fontFamily: FONT.body,
              }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: active ? T.royal : T.ink04,
                display: 'grid', placeItems: 'center', flexShrink: 0,
                color: active ? T.off : T.royal,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: T.navy, letterSpacing: '-0.005em' }}>{s.name}</span>
                  {s.recommended && (
                    <span style={{
                      ...{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' },
                      padding: '3px 8px', borderRadius: 999, background: T.mintLite, color: T.emerald,
                    }}>Recommended</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: T.ink60, marginTop: 4, lineHeight: 1.4 }}>{s.desc}</div>
              </div>
              {active && (
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: T.royal, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2L5 8.7L9.7 3.5" stroke={T.off} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              )}
            </button>
          )
        })}

        <Card style={{ marginTop: 12, padding: '14px 16px', background: T.ink04, border: `1px dashed ${T.ink10}` }}>
          <Eyebrow color={T.emerald}>Bank-level encryption</Eyebrow>
          <div style={{ fontSize: 12.5, color: T.ink70, marginTop: 6, lineHeight: 1.5 }}>
            We never store bank credentials. All data is encrypted in transit and at rest, and you can revoke access at any time.
          </div>
        </Card>
      </div>

      <ConfirmBar
        onBack={() => dispatch({ type: 'BACK' })}
        onContinue={() => dispatch({ type: 'NEXT' })}
        continueDisabled={!linked}
        summary={<div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>Income link</div>}
      />
    </ApplicationLayout>
  )
}
