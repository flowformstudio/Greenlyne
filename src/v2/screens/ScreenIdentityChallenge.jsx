import { useMemo, useState } from 'react'
import { T, FONT, RADIUS } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, ConfirmBar, PageHeader, Card } from '../AppShell'
import { DEMO_PERSONA } from '../../lib/persona'

const DISTRACTORS = [
  'Jordan Bennett','Casey Morgan','Taylor Brooks','Morgan Reyes',
  'Riley Sanchez','Quinn Patterson','Avery Sullivan','Drew Walsh',
  'Sydney Chen','Logan Hayes','Parker Nguyen','Hayden Cole',
]

export default function ScreenIdentityChallenge({ state, dispatch, step }) {
  const titleName   = `${DEMO_PERSONA.firstName} ${DEMO_PERSONA.lastName}`
  const enteredName = `${state.step1.firstName} ${state.step1.lastName}`.trim()
  const fullAddress = [state.step1.address, state.step1.city, state.step1.state, state.step1.zip].filter(Boolean).join(', ')

  const choices = useMemo(() => {
    const shuffled = [...DISTRACTORS].sort(() => Math.random() - 0.5).slice(0, 3)
    return [titleName, ...shuffled].sort(() => Math.random() - 0.5)
  }, [titleName])

  const [picked, setPicked] = useState(null)
  const [error,  setError]  = useState(false)

  function confirm() {
    if (!picked) return
    if (picked === titleName) dispatch({ type: 'IDENTITY_CONFIRMED', fullName: titleName })
    else setError(true)
  }

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Quick identity check"
        eyebrowColor={T.royal}
        title="Confirm the name on the title"
        sub="We pulled the public title record for the property you entered. Please select the name that appears on the title so we can match it to your application." />

      <div style={{ maxWidth: 720 }}>
        <Card style={{ marginBottom: 18, padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Eyebrow style={{ marginBottom: 4 }}>You entered</Eyebrow>
              <div style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600, color: T.navy }}>{enteredName || '—'}</div>
            </div>
            <div>
              <Eyebrow style={{ marginBottom: 4 }}>Property</Eyebrow>
              <div style={{ fontSize: 13, color: T.ink70, lineHeight: 1.4 }}>{fullAddress || '—'}</div>
            </div>
          </div>
        </Card>

        <div style={{ ...textBlock(), marginBottom: 10 }}>Which name is on the title?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {choices.map(name => {
            const active = picked === name
            return (
              <button key={name}
                onClick={() => { setPicked(name); setError(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  background: active ? 'rgba(37,75,206,0.05)' : T.white,
                  border: `1.5px solid ${active ? T.royal : T.ink10}`,
                  borderRadius: RADIUS.cardSm, cursor: 'pointer',
                  textAlign: 'left', fontFamily: FONT.body,
                  transition: 'all .15s',
                }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${active ? T.royal : T.ink20}`,
                  background: active ? T.royal : 'transparent',
                  display: 'grid', placeItems: 'center',
                }}>
                  {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.white }} />}
                </div>
                <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: T.navy }}>{name}</span>
              </button>
            )
          })}
        </div>

        {error && (
          <div style={{
            marginTop: 16, padding: '12px 14px',
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)',
            borderRadius: RADIUS.cardSm, fontSize: 13, color: '#B91C1C', lineHeight: 1.5,
          }}>
            That name doesn't match the property title. Please review your selection — you can't proceed until it matches.
          </div>
        )}
      </div>

      <ConfirmBar
        onBack={() => dispatch({ type: 'BACK' })}
        onContinue={confirm}
        continueDisabled={!picked}
        continueLabel="Confirm"
        summary={<div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>Identity verification</div>}
      />
    </ApplicationLayout>
  )
}

function textBlock() {
  return { fontSize: 13, fontWeight: 700, color: T.navy, fontFamily: FONT.body, letterSpacing: '0.01em' }
}
