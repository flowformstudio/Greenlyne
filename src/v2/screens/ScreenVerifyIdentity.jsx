import { useState } from 'react'
import { T, FONT, RADIUS } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, ConfirmBar, PageHeader, Card } from '../AppShell'

export default function ScreenVerifyIdentity({ dispatch, step }) {
  const [stage, setStage] = useState('intro') // intro | id-uploaded | selfie-done

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Identity verification"
        eyebrowColor={T.royal}
        title="Verify your identity."
        sub="A government-issued ID and a quick selfie. Takes about 60 seconds." />

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CheckRow num={1} done={stage !== 'intro'}
          title="Upload a government-issued photo ID"
          sub="Driver's license, passport, or state ID — front and back."
          cta={stage === 'intro' ? 'Upload ID' : 'Re-upload'}
          onClick={() => setStage('id-uploaded')} />
        <CheckRow num={2} done={stage === 'selfie-done'} disabled={stage === 'intro'}
          title="Take a quick selfie"
          sub="We compare it to your ID for facial matching."
          cta={stage === 'selfie-done' ? 'Re-take' : 'Take selfie'}
          onClick={() => setStage('selfie-done')} />
      </div>

      <ConfirmBar
        onBack={() => dispatch({ type: 'BACK' })}
        onContinue={() => dispatch({ type: 'NEXT' })}
        continueDisabled={stage !== 'selfie-done'}
        summary={<div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>Identity verification</div>}
      />
    </ApplicationLayout>
  )
}

function CheckRow({ num, done, disabled, title, sub, cta, onClick }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '18px 20px',
      background: T.white, border: `1px solid ${done ? T.mint : T.ink10}`,
      borderRadius: RADIUS.card,
      opacity: disabled ? 0.45 : 1,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: done ? T.emerald : T.ink04,
        display: 'grid', placeItems: 'center',
        color: done ? T.off : T.navy,
        fontFamily: FONT.display, fontWeight: 700, fontSize: 15,
      }}>
        {done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.off} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : num}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: T.navy, letterSpacing: '-0.005em' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: T.ink60, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
      </div>
      <button onClick={disabled ? undefined : onClick} disabled={disabled}
        style={{
          padding: '10px 16px', borderRadius: 999,
          background: done ? T.white : T.royal,
          color: done ? T.navy : T.off,
          border: done ? `1px solid ${T.ink20}` : 0,
          fontWeight: 700, fontSize: 13, fontFamily: FONT.body,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}>
        {cta}
      </button>
    </div>
  )
}
