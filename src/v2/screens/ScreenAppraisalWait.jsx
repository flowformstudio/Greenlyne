import { T, FONT } from '../tokens'
import { ApplicationLayout, PageHeader, Card } from '../AppShell'

export default function ScreenAppraisalWait({ step }) {
  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Property appraisal"
        eyebrowColor={T.royal}
        title="We've ordered an appraisal."
        sub="An independent appraiser will visit your property within 3-5 business days. We'll email you when the report is ready." />
      <div style={{ maxWidth: 720 }}>
        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { k: 'Status',   v: 'Appraisal ordered' },
              { k: 'Provider', v: 'Clear Capital' },
              { k: 'ETA',      v: '3-5 business days' },
              { k: 'Cost',     v: 'Covered by GreenLyne' },
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
