import { T, FONT } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, ConfirmBar, PageHeader, Card } from '../AppShell'

export default function ScreenNotaryScheduled({ dispatch, step }) {
  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Confirmed"
        eyebrowColor={T.emerald}
        title="You're scheduled. We'll see you soon."
        sub="A calendar invite has been sent to your email. Join the call from any browser using the link below." />

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { k: 'When',     v: 'Tomorrow · 1:00 PM PT' },
              { k: 'Duration', v: 'About 30 minutes' },
              { k: 'eNotary',  v: 'Marcus T., Notary Solutions LLC' },
              { k: 'Calendar', v: 'Invite sent to your email' },
            ].map(r => (
              <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderTop: `1px dashed ${T.ink10}` }}>
                <span style={{ fontSize: 13, color: T.ink60 }}>{r.k}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 13.5, color: T.navy, fontWeight: 600 }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <ConfirmBar
        onContinue={() => dispatch({ type: 'NOTARY_ARRIVED' })}
        continueLabel="Demo: skip to signing"
        summary={<div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>Notary scheduled</div>}
      />
    </ApplicationLayout>
  )
}
