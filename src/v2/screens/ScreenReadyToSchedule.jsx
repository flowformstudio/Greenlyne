import { useState } from 'react'
import { T, FONT, RADIUS } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, ConfirmBar, PageHeader, Card } from '../AppShell'

const SLOTS = [
  { id: 'today-3',  day: 'Today',         time: '3:00 PM',  zone: 'PT' },
  { id: 'today-4',  day: 'Today',         time: '4:30 PM',  zone: 'PT' },
  { id: 'tom-10',   day: 'Tomorrow',      time: '10:00 AM', zone: 'PT' },
  { id: 'tom-1',    day: 'Tomorrow',      time: '1:00 PM',  zone: 'PT' },
  { id: 'fri-9',    day: 'Friday May 1',  time: '9:00 AM',  zone: 'PT' },
  { id: 'fri-2',    day: 'Friday May 1',  time: '2:00 PM',  zone: 'PT' },
]

export default function ScreenReadyToSchedule({ dispatch, step }) {
  const [pick, setPick] = useState(null)

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Schedule eNotary"
        eyebrowColor={T.royal}
        title="Pick a time to sign."
        sub="A licensed eNotary will join you on a 30-minute video call to witness your signatures. Most slots open within 24 hours." />

      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {SLOTS.map(s => {
            const active = pick === s.id
            return (
              <button key={s.id} onClick={() => setPick(s.id)} style={{
                padding: '14px 16px', textAlign: 'left',
                background: active ? T.navy : T.white,
                color: active ? T.off : T.navy,
                border: `1.5px solid ${active ? T.navy : T.ink10}`,
                borderRadius: RADIUS.cardSm, cursor: 'pointer', fontFamily: FONT.body,
                transition: 'all .15s',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: active ? T.mint : T.ink60, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.day}</div>
                <div style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, marginTop: 4, letterSpacing: '-0.005em' }}>{s.time}</div>
                <div style={{ fontSize: 11, fontFamily: FONT.mono, opacity: 0.7, marginTop: 2 }}>{s.zone}</div>
              </button>
            )
          })}
        </div>
        <Card style={{ marginTop: 18, padding: '14px 16px', background: T.ink04, border: `1px dashed ${T.ink10}` }}>
          <Eyebrow color={T.emerald}>What you'll need</Eyebrow>
          <ul style={{ fontSize: 12.5, color: T.ink70, margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Your government-issued ID (the one you uploaded earlier)</li>
            <li>A device with camera + microphone</li>
            <li>A quiet space — the call takes about 30 minutes</li>
          </ul>
        </Card>
      </div>

      <ConfirmBar
        onBack={() => dispatch({ type: 'BACK' })}
        onContinue={() => dispatch({ type: 'NEXT' })}
        continueDisabled={!pick}
        continueLabel="Confirm time"
        summary={<div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>{pick ? `${SLOTS.find(s=>s.id===pick).day} · ${SLOTS.find(s=>s.id===pick).time}` : 'Pick a time'}</div>}
      />
    </ApplicationLayout>
  )
}
