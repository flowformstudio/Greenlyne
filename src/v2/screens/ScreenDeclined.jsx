import { T, FONT, RADIUS } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, PageHeader, Card } from '../AppShell'

export default function ScreenDeclined({ dispatch, step }) {
  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Application status"
        eyebrowColor={T.amber}
        title="We're not able to extend an offer at this time."
        sub="Based on the information available, your application doesn't meet our current requirements. This is not a reflection of your creditworthiness — and you can re-apply in 90 days." />

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card>
          <Eyebrow>What we found</Eyebrow>
          <div style={{ fontSize: 14, color: T.navy, marginTop: 6, lineHeight: 1.55 }}>
            Property valuation didn't support the requested loan amount at this time. You'll receive an Adverse Action Notice via email within 30 days with full details and your reporting rights.
          </div>
        </Card>
        <Card>
          <Eyebrow>Your options</Eyebrow>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13.5, color: T.ink70, lineHeight: 1.7 }}>
            <li>Wait 90 days and re-apply with updated information</li>
            <li>Apply with a co-borrower to strengthen the application</li>
            <li>Speak with a GreenLyne advisor at <strong style={{ color: T.navy }}>(800) 555-0142</strong></li>
          </ul>
        </Card>
        <button onClick={() => dispatch({ type: 'RESTART' })} style={{
          marginTop: 8, alignSelf: 'flex-start',
          padding: '12px 20px', borderRadius: 999,
          background: T.navy, color: T.off, border: 0,
          fontFamily: FONT.body, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>Start a new application</button>
      </div>
    </ApplicationLayout>
  )
}
