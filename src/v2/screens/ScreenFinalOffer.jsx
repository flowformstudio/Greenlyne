import { T, FONT, TYPE, RADIUS, SHADOW, HIGHLIGHT } from '../tokens'
import { Eyebrow, BrandMark } from '../primitives'
import { ApplicationLayout, PageHeader, Card } from '../AppShell'

const currency = (v, frac=0) => Number(v).toLocaleString('en-US', { style:'currency', currency:'USD', maximumFractionDigits: frac })

export default function ScreenFinalOffer({ state, dispatch, step }) {
  const loan = state.loan || { plan: 'recommended', monthly: 443, apr: 8.28, totalLoan: 121647 }

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Your final offer"
        eyebrowColor={T.emerald}
        title={<>Your offer is locked in for <span style={HIGHLIGHT}>30 days</span>.</>}
        sub="Final terms have been verified by underwriting. Review and accept to begin closing." />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
        <Card>
          <Eyebrow>Loan terms</Eyebrow>
          <div style={{ ...TYPE.sectionH2, fontSize: 22, color: T.navy, marginTop: 4, marginBottom: 18 }}>What you'll pay</div>
          <Stat label="Monthly payment" value={`${currency(loan.monthly)}/mo`} accent />
          <div style={{ height: 14 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Stat label="APR" value={`${loan.apr.toFixed(2)}%`} small />
            <Stat label="Total loan" value={currency(loan.totalLoan)} small />
            <Stat label="Term" value="30 years" small />
            <Stat label="First payment" value="Jun 1, 2026" small />
          </div>
        </Card>

        <Card dark>
          <Eyebrow color={T.mint}>What happens next</Eyebrow>
          <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, marginTop: 4, lineHeight: 1.25 }}>
            Three steps to closing.
          </div>
          <ol style={{ margin: '18px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 14 }}>
            {[
              ['Sign closing documents', 'eNotary session, ~30 min'],
              ['Funds wire to your installer', '1-2 business days after signing'],
              ['Make first payment', 'Auto-debit set up at signing'],
            ].map(([h, s], i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: T.mint, color: T.navy,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  fontFamily: FONT.display, fontWeight: 700, fontSize: 12,
                }}>{i + 1}</span>
                <div>
                  <div style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: 600 }}>{h}</div>
                  <div style={{ fontSize: 12, color: '#F5F1EE99', marginTop: 2 }}>{s}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Sticky confirm */}
      <div style={{
        position: 'sticky', bottom: 16, margin: '36px -12px 0',
        background: T.white, border: `1px solid ${T.ink10}`,
        borderRadius: 16, padding: '14px 18px',
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 20, alignItems: 'center',
        boxShadow: SHADOW.stickyConfirm,
      }}>
        <button onClick={() => dispatch({ type: 'DECLINE_OFFER' })} style={{
          padding: '10px 16px', borderRadius: 999,
          background: T.white, border: `1px solid ${T.ink20}`,
          fontWeight: 700, fontSize: 13, color: T.ink70, cursor: 'pointer', fontFamily: FONT.body,
        }}>Decline offer</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Eyebrow>Final offer · ready to sign</Eyebrow>
        </div>
        <button onClick={() => dispatch({ type: 'ACCEPT' })} style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '13px 22px', borderRadius: 999,
          background: T.royal, border: 0, fontWeight: 700, fontSize: 14, color: T.off,
          cursor: 'pointer', boxShadow: '0 10px 24px -12px rgba(37,75,206,1)', fontFamily: FONT.body,
        }}>
          Accept & continue
          <BrandMark size={15} color={T.off} />
        </button>
      </div>
    </ApplicationLayout>
  )
}

function Stat({ label, value, accent, small }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div style={{
        fontFamily: FONT.display, fontWeight: 700,
        fontSize: small ? 22 : 38,
        color: accent ? T.royal : T.navy,
        letterSpacing: small ? '-0.015em' : '-0.025em',
        marginTop: 4,
      }}>{value}</div>
    </div>
  )
}
