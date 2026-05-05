import { useMemo, useState } from 'react'
import { T, FONT, RADIUS } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, ConfirmBar, PageHeader, Card } from '../AppShell'

const ALTERNATE = '218 Maple Ridge Lane, Roseville, CA 95661'
const DISTRACTORS = [
  '904 Linden Park Way, Folsom, CA 95630',
  '5612 Birchwood Court, Elk Grove, CA 95758',
  '1207 Hillcrest Avenue, Davis, CA 95616',
  '3340 Cedar Glen Drive, Rocklin, CA 95677',
  '78 Westgate Terrace, Citrus Heights, CA 95610',
  '1456 Brookside Lane, Carmichael, CA 95608',
]

export default function ScreenAddressMismatch({ state, dispatch, step }) {
  const choices = useMemo(() => {
    const shuffled = [...DISTRACTORS].sort(() => Math.random() - 0.5).slice(0, 3)
    return [ALTERNATE, ...shuffled].sort(() => Math.random() - 0.5)
  }, [])
  const enteredAddress = [state.step1.address, state.step1.city, state.step1.state, state.step1.zip].filter(Boolean).join(', ')
  const [picked, setPicked] = useState(null)
  const [error,  setError]  = useState(false)

  function confirm() {
    if (!picked) return
    if (picked === ALTERNATE) dispatch({ type: 'ADDRESS_CONFIRMED' })
    else setError(true)
  }

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Confirm a previous address"
        eyebrowColor={T.royal}
        title="Confirm an address on your file"
        sub="To complete your credit check, please confirm an address associated with your file. Select the address that you currently or previously lived at." />

      <div style={{ maxWidth: 720 }}>
        <Card style={{ marginBottom: 18, padding: '14px 16px' }}>
          <Eyebrow style={{ marginBottom: 4 }}>Property on application</Eyebrow>
          <div style={{ fontSize: 13.5, color: T.ink70, lineHeight: 1.4 }}>{enteredAddress || '—'}</div>
        </Card>

        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 10, letterSpacing: '0.01em' }}>
          Which of these addresses have you lived at?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {choices.map(addr => {
            const active = picked === addr
            return (
              <button key={addr} onClick={() => { setPicked(addr); setError(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  background: active ? 'rgba(37,75,206,0.05)' : T.white,
                  border: `1.5px solid ${active ? T.royal : T.ink10}`,
                  borderRadius: RADIUS.cardSm, cursor: 'pointer',
                  textAlign: 'left', fontFamily: FONT.body,
                }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${active ? T.royal : T.ink20}`,
                  background: active ? T.royal : 'transparent',
                  display: 'grid', placeItems: 'center',
                }}>
                  {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.white }} />}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: T.navy, lineHeight: 1.4 }}>{addr}</span>
              </button>
            )
          })}
        </div>
        {error && (
          <div style={{
            marginTop: 16, padding: '12px 14px',
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)',
            borderRadius: RADIUS.cardSm, fontSize: 13, color: '#B91C1C', lineHeight: 1.5,
          }}>That address doesn't match what we found on your file. Please review your selection.</div>
        )}
      </div>

      <ConfirmBar
        onBack={() => dispatch({ type: 'BACK' })}
        onContinue={confirm}
        continueDisabled={!picked}
        continueLabel="Confirm"
        summary={<div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>Address verification</div>}
      />
    </ApplicationLayout>
  )
}
