import { Link } from 'react-router-dom'
import { T, FONT, TYPE, RADIUS } from './tokens'
import { Page, Eyebrow, Pill, Wordmark } from './primitives'

const items = [
  {
    to: '/v2/pos-demo',
    eyebrow: 'Application · Step 2 of 7',
    title: 'Configure offer · Plan selection',
    desc: 'Three pre-approved plans, the Custom-plan shape rows, terms-of-offer breakdown, and sticky confirm bar.',
    status: 'preview',
  },
  {
    to: '/v2/offer',
    eyebrow: 'Solar calculator',
    title: 'Westhaven Power · homeowner offer landing',
    desc: 'Awaiting a v2 pass. Currently mirrors the production /offer.',
    status: 'untouched',
  },
]

export default function V2Index() {
  return (
    <Page>
      <header style={{
        background: T.white, borderBottom: `1px solid ${T.ink10}`,
        padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Wordmark />
          <div style={{ width: 1, height: 22, background: T.ink10 }} />
          <Pill tone="royal">v2 · design preview</Pill>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <Eyebrow style={{ marginBottom: 10 }}>Greenlyne · plan selection handoff</Eyebrow>
          <h1 style={{ ...TYPE.heroH1, color: T.navy, margin: '0 0 16px', fontSize: 44 }}>
            A parallel pass at the demo.
          </h1>
          <p style={{ ...TYPE.body, color: T.ink70, margin: 0, maxWidth: 580 }}>
            New design system applied side-by-side with the production demo.
            Production routes (<code style={{ fontFamily: FONT.mono }}>/offer</code>,{' '}
            <code style={{ fontFamily: FONT.mono }}>/pos-demo</code>) are untouched.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {items.map(item => (
            <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
              <div style={{
                background: T.white, border: `1px solid ${T.ink10}`,
                borderRadius: RADIUS.card, padding: '22px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all .18s cubic-bezier(.2,.8,.2,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.ink20; e.currentTarget.style.boxShadow = '0 8px 24px -16px rgba(0,22,96,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.ink10; e.currentTarget.style.boxShadow = 'none' }}>
                <div>
                  <Eyebrow style={{ marginBottom: 6 }}>{item.eyebrow}</Eyebrow>
                  <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.navy, marginBottom: 6, letterSpacing: '-0.012em' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, color: T.ink60, lineHeight: 1.5, maxWidth: 520 }}>{item.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {item.status === 'preview'
                    ? <Pill tone="emerald">Live</Pill>
                    : <Pill tone="neutral">Awaiting</Pill>}
                  <span style={{ color: T.royal, fontWeight: 700, fontSize: 13 }}>Open →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </Page>
  )
}
