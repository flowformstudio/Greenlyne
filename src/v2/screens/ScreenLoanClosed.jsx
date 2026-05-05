import { T, FONT, TYPE, HIGHLIGHT } from '../tokens'
import { Eyebrow, BrandMark } from '../primitives'
import { ApplicationLayout, PageHeader, Card } from '../AppShell'

const currency = v => Number(v).toLocaleString('en-US', { style:'currency', currency:'USD', maximumFractionDigits: 0 })

export default function ScreenLoanClosed({ state, dispatch, step }) {
  const loan = state.loan || { totalLoan: 121647, monthly: 443, apr: 8.28 }
  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Loan closed"
        eyebrowColor={T.emerald}
        title={<>Your loan is closed. Funds are <span style={HIGHLIGHT}>on the way</span>.</>}
        sub="Funds will wire to your installer in 1-2 business days. We'll email you the moment the wire clears, and your installer will reach out to schedule the install date." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Card>
          <Eyebrow>Loan summary</Eyebrow>
          <div style={{ ...TYPE.sectionH2, fontSize: 22, color: T.navy, marginTop: 4, marginBottom: 16 }}>The numbers</div>
          {[
            ['Total loan',      currency(loan.totalLoan)],
            ['Monthly payment', `${currency(loan.monthly)}/mo`],
            ['APR',             `${loan.apr.toFixed(2)}%`],
            ['First payment',   'Jun 1, 2026'],
            ['Term',            '30 years'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderTop: `1px dashed ${T.ink10}` }}>
              <span style={{ fontSize: 13, color: T.ink60 }}>{k}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 14, color: T.navy, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </Card>

        <Card dark>
          <Eyebrow color={T.mint}>Next 7 days</Eyebrow>
          <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, marginTop: 4, lineHeight: 1.25 }}>
            What to expect
          </div>
          <ul style={{ margin: '18px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 14 }}>
            {[
              ['Funds wire to installer', '1-2 business days'],
              ['Installer schedules your install', 'within 1 week'],
              ['Auto-debit confirmed', '5-7 business days before first payment'],
            ].map(([h, s], i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: T.mint, color: T.navy, display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: FONT.display, fontWeight: 700, fontSize: 12 }}>{i + 1}</span>
                <div>
                  <div style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: 600 }}>{h}</div>
                  <div style={{ fontSize: 12, color: '#F5F1EE99', marginTop: 2 }}>{s}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div style={{ marginTop: 36, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => dispatch({ type: 'CLOSE_LOAN' })} style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '13px 22px', borderRadius: 999,
          background: T.royal, border: 0, fontWeight: 700, fontSize: 14, color: T.off,
          cursor: 'pointer', fontFamily: FONT.body,
          boxShadow: '0 10px 24px -12px rgba(37,75,206,1)',
        }}>
          Demo: skip to funded
          <BrandMark size={15} color={T.off} />
        </button>
      </div>
    </ApplicationLayout>
  )
}
