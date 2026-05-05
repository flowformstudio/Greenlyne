import { T, FONT } from '../tokens'
import { ApplicationLayout, PageHeader, Card } from '../AppShell'

export default function ScreenOpsReviewWait({ step }) {
  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Manual review"
        eyebrowColor={T.royal}
        title="Your application is being reviewed."
        sub="Our underwriting team is finalizing your offer. This usually takes 1-2 business days. We'll email you the moment it's ready." />
      <div style={{ maxWidth: 720 }}>
        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { k: 'Status',     v: 'Pending underwriter review' },
              { k: 'Submitted',  v: 'Today, 11:42 AM' },
              { k: 'ETA',        v: '1-2 business days' },
              { k: 'Underwriter', v: 'Sarah K.' },
            ].map(r => (
              <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderTop: `1px dashed ${T.ink10}` }}>
                <span style={{ fontSize: 13, color: T.ink60 }}>{r.k}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 13.5, color: T.navy, fontWeight: 600 }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ApplicationLayout>
  )
}
