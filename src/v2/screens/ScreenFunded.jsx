import { T, FONT, TYPE, HIGHLIGHT } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, PageHeader, Card } from '../AppShell'

export default function ScreenFunded({ dispatch, step }) {
  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Funded · Wire confirmed"
        eyebrowColor={T.emerald}
        title={<>Funds have been wired. Your project is <span style={HIGHLIGHT}>fully funded</span>.</>}
        sub="Your installer has been notified and will be in touch with next steps. Welcome to the GreenLyne family." />

      <div style={{ maxWidth: 720 }}>
        <Card>
          <Eyebrow color={T.emerald}>What happens now</Eyebrow>
          <ul style={{ margin: '8px 0 0', paddingLeft: 22, fontSize: 14, color: T.ink70, lineHeight: 1.7 }}>
            <li>Your installer will contact you within 24 hours to schedule installation.</li>
            <li>Your first auto-debit is set for <strong style={{ color: T.navy }}>June 1, 2026</strong>.</li>
            <li>Track your loan, payments, and statements anytime in your GreenLyne dashboard.</li>
          </ul>
        </Card>

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button onClick={() => dispatch({ type: 'RESTART' })} style={{
            padding: '12px 20px', borderRadius: 999,
            background: T.navy, color: T.off, border: 0,
            fontFamily: FONT.body, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>Restart demo</button>
        </div>
      </div>
    </ApplicationLayout>
  )
}
