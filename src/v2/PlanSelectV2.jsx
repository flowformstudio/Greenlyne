import { useState } from 'react'
import { T, FONT, TYPE, RADIUS, SHADOW, HIGHLIGHT } from './tokens'
import { Wordmark, Eyebrow, BrandMark, Page } from './primitives'

/* =============================================================
   Plan model — ported from design_handoff_plan_selection/src/AppV3.jsx
   ============================================================= */
const PROJECT_COST = 106000

const PLANS = {
  standard: {
    id: 'standard',
    eyebrow: 'Plan A',
    title: 'Straightforward',
    sub: 'Simple and fast. Full principal + interest from day one, no escrow involved.',
    monthly: 740, apr: 7.98, totalLoan: 97949,
    bullets: [
      { k: 'Escrow reserve',       v: '$0' },
      { k: 'Payment-free window',  v: 'None' },
      { k: 'Interest-only period', v: 'None' },
    ],
    tone: 'neutral', footnote: 'Full P+I until paid off',
  },
  recommended: {
    id: 'recommended',
    eyebrow: 'Plan B · Recommended',
    title: 'Eased in',
    sub: "Lower payments while your solar savings ramp up. Ideal if the savings don't fully offset your monthly cost yet.",
    monthly: 443, apr: 8.28, totalLoan: 121647,
    bullets: [
      { k: 'Escrow reserve',       v: '$10,988' },
      { k: 'Payment-free window',  v: 'First 6 months' },
      { k: 'Interest-only period', v: '3 years' },
    ],
    tone: 'accent', footnote: '$0/mo for first 6 months, then 3 yrs interest-only, then full P+I',
  },
  custom: {
    id: 'custom',
    eyebrow: 'Plan C · Custom',
    title: 'Shaped to you',
    sub: 'Every knob in reach. Tune your credit line, escrow window and interest-only period to fit your cash flow.',
    monthly: 559, apr: 8.05, totalLoan: 119364,
    bullets: [
      { k: 'Escrow reserve',       v: '$10,988' },
      { k: 'Payment-free window',  v: 'First 6 months' },
      { k: 'Interest-only period', v: '3 years' },
    ],
    tone: 'dark', footnote: 'HELOC · 7.75% fixed during draw',
  },
}

const SHAPE_ROWS = [
  {
    id: 'credit',
    label: 'Credit line & initial draw',
    value: '$120,000 credit line · $106,000 drawn at closing',
    options: ['$106k / $106k (match project)', '$120k / $106k (recommended reserve)', '$150k / $106k (max reserve)'],
    detail: 'Your credit line stays open for 10 years. Any unused portion is there for future home-energy upgrades — batteries, EV charger, heat pump — at the same rate.',
  },
  {
    id: 'defer',
    label: 'First 6 months payment-free?',
    value: 'Yes · escrow covers the first 6 months',
    options: ['No, pay from month 1', 'Yes · 3 months escrowed', 'Yes · 6 months escrowed', 'Yes · 12 months escrowed'],
    detail: 'A slice of your loan is held in escrow and auto-pays your first months. This is your own borrowed money — not a deferral or rate buydown.',
  },
  {
    id: 'io',
    label: 'Interest-only period',
    value: '3 years interest-only, then full P+I',
    options: ['None', '2 years', '3 years', '5 years'],
    detail: 'Pay only interest during this window. Principal payments begin after, amortizing over the remaining term.',
  },
  {
    id: 'reduction',
    label: 'Payment reduction level',
    value: 'Ease · 20% off for 3 years',
    options: ['None', 'Gentle · 10% off for 2 yrs', 'Ease · 20% off for 3 yrs', 'Soft · 30% off for 3 yrs'],
    detail: 'A temporary cash-flow cushion funded from the escrow reserve while your solar savings ramp up.',
  },
]

const currency = (v, frac = 0) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: frac })

const clamp = lines => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
})

/* =============================================================
   Top bar
   ============================================================= */
function TopBar() {
  return (
    <header style={{
      background: T.white, borderBottom: `1px solid ${T.ink10}`,
      padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 10, gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Wordmark />
        <div style={{ width: 1, height: 22, background: T.ink10 }} />
        <div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>
          Application <span style={{ color: T.navy }}>#1-20022-1759</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 12, color: T.ink60 }}>
        <span>Financing by <strong style={{ color: T.navy }}>Grand Bank</strong> · NMLS #2611</span>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: T.navy, color: T.off,
          display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, fontFamily: FONT.display,
        }}>A</div>
      </div>
    </header>
  )
}

/* =============================================================
   Progress rail
   ============================================================= */
function ProgressRail() {
  const steps = ['Basic info', 'Configure offer', 'Verify', 'Final offer', 'Review & sign', 'Closing', 'Funded']
  const current = 2
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
      <Eyebrow>Step {current} of 7</Eyebrow>
      <div style={{ width: 14 }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        {steps.map((s, i) => {
          const n = i + 1
          const state = n < current ? 'done' : n === current ? 'active' : 'up'
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: n === current ? '0 0 auto' : '1 1 0' }}>
              <div style={{
                width: state === 'active' ? 'auto' : 8,
                height: 8,
                padding: state === 'active' ? '0 10px' : 0,
                borderRadius: 4,
                background: state === 'done' ? T.emerald : state === 'active' ? T.navy : T.ink20,
                display: state === 'active' ? 'grid' : 'block',
                placeItems: 'center',
                color: T.off,
                fontSize: 10, fontFamily: FONT.mono, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>
                {state === 'active' ? s : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* =============================================================
   Hero
   ============================================================= */
function Hero({ name, amount }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <ProgressRail />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: 40 }}>
        <div>
          <Eyebrow style={{ marginBottom: 10 }} color={T.emerald}>Approved · soft pull only</Eyebrow>
          <h1 style={{
            ...TYPE.heroH1, color: T.navy, margin: '0 0 14px', maxWidth: 860,
          }}>
            Congratulations, {name}. You're pre-qualified for a HELOC up to{' '}
            <span style={HIGHLIGHT}>{currency(amount)}</span>
          </h1>
          <p style={{ ...TYPE.body, color: T.ink70, margin: 0, maxWidth: 620 }}>
            Your solar project at <strong style={{ color: T.navy }}>12 Westhaven Rd</strong> is{' '}
            <span style={{ fontFamily: FONT.mono, fontWeight: 600 }}>{currency(PROJECT_COST)}</span>.
            Choose the plan that fits how you want to pay for it — all three are pre-qualified.
          </p>
        </div>
        <div style={{
          padding: '14px 18px', borderRadius: 12,
          background: T.mintLite, border: `1px solid ${T.mint}`,
          display: 'grid', gap: 4, minWidth: 220,
        }}>
          <Eyebrow color={T.emerald}>Your offer ID</Eyebrow>
          <div style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 600, color: T.navy }}>GL-4417-AX · valid 30 days</div>
          <div style={{ fontSize: 11.5, color: T.ink60, marginTop: 2 }}>Expires May 24, 2026</div>
        </div>
      </div>
    </section>
  )
}

/* =============================================================
   Plan card — rigid grid rows so all 3 cards align horizontally
   ============================================================= */
const PLAN_ROWS = [
  '28px',  // ribbon slot
  '22px',  // eyebrow + selected
  '34px',  // title
  '60px',  // sub (3-line clamp)
  '1px',   // divider
  '18px',  // "Monthly payment"
  '60px',  // big price
  '34px',  // footnote
  '112px', // bullets (3 rows)
  '1px',   // divider
  '50px',  // APR + total
  '44px',  // CTA
].join(' ')

function PlanCard({ plan, selected, onSelect }) {
  const isDark   = plan.tone === 'dark'
  const isAccent = plan.tone === 'accent'

  const surface = isDark ? T.navy : T.white
  const ink     = isDark ? T.off  : T.navy
  const subInk  = isDark ? '#F5F1EECC' : T.ink70
  const dim     = isDark ? '#F5F1EE99' : T.ink60
  const faint   = isDark ? '#F5F1EE33' : T.ink10

  const border = selected
    ? (isDark ? `1.5px solid ${T.mint}` : isAccent ? `1.5px solid ${T.royal}` : `1.5px solid ${T.navy}`)
    : `1px solid ${T.ink10}`

  const shadow = selected
    ? (isDark ? SHADOW.cardSelectedDark : SHADOW.cardSelectedLight)
    : SHADOW.cardRest

  const priceColor = isAccent ? T.royal : isDark ? T.mint : T.navy

  return (
    <button
      onClick={onSelect}
      style={{
        position: 'relative', textAlign: 'left',
        padding: '0 22px 22px',
        borderRadius: RADIUS.card,
        background: surface, color: ink,
        border, boxShadow: shadow,
        cursor: 'pointer',
        transition: 'all .18s cubic-bezier(.2,.8,.2,1)',
        display: 'grid',
        gridTemplateRows: PLAN_ROWS,
        rowGap: 10,
        overflow: 'hidden',
        fontFamily: FONT.body,
      }}
    >
      {/* Row 1: ribbon */}
      <div style={{
        margin: '0 -22px', height: 28,
        background: isAccent ? T.royal : 'transparent',
        color: isAccent ? T.off : 'transparent',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 22px',
        fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase',
      }}>
        {isAccent && (
          <>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1.5L7.4 4.4L10.5 4.9L8.3 7.1L8.8 10.2L6 8.8L3.2 10.2L3.7 7.1L1.5 4.9L4.6 4.4Z"
                stroke="currentColor" strokeWidth="1" strokeLinejoin="round" fill="currentColor" fillOpacity=".15" />
            </svg>
            Recommended for you
          </>
        )}
      </div>

      {/* Row 2: eyebrow + selected */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 22 }}>
        <Eyebrow color={isDark ? T.mint : isAccent ? T.royal : T.ink60}>{plan.eyebrow}</Eyebrow>
        {selected ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 9px', borderRadius: 999,
            background: isDark ? T.mint : T.mintLite, color: T.emerald,
            fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
          }}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.8L3.6 6.9L7.5 2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Selected
          </span>
        ) : <span />}
      </div>

      {/* Row 3: title */}
      <div style={{ ...TYPE.planTitle, ...clamp(1) }}>{plan.title}</div>

      {/* Row 4: sub */}
      <div style={{ fontSize: 13.2, color: subInk, lineHeight: '20px', ...clamp(3) }}>{plan.sub}</div>

      {/* Row 5: divider */}
      <div style={{ height: 1, background: faint, margin: '0 -4px' }} />

      {/* Row 6: monthly payment eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', height: 18 }}>
        <Eyebrow color={dim}>Monthly payment</Eyebrow>
      </div>

      {/* Row 7: big price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, lineHeight: 1, height: 60 }}>
        <div style={{ ...TYPE.planPrice, color: priceColor }}>{currency(plan.monthly)}</div>
        <div style={{ fontSize: 15, color: subInk, fontWeight: 500 }}>/mo</div>
      </div>

      {/* Row 8: footnote */}
      <div style={{
        ...TYPE.monoCap,
        color: isDark ? '#F5F1EE88' : T.ink40,
        ...clamp(2),
      }}>{plan.footnote}</div>

      {/* Row 9: bullets — exactly 3 rows */}
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', alignContent: 'stretch' }}>
        {plan.bullets.map(b => (
          <div key={b.k} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            fontSize: 12.5,
            color: isDark ? '#F5F1EEE6' : T.ink70,
            borderTop: `1px dotted ${isDark ? '#F5F1EE1F' : T.ink10}`,
          }}>
            <span>{b.k}</span>
            <span style={{ fontFamily: FONT.mono, fontWeight: 600, color: isDark ? T.off : T.navy }}>{b.v}</span>
          </div>
        ))}
      </div>

      {/* Row 10: divider */}
      <div style={{ height: 1, background: faint, margin: '0 -4px' }} />

      {/* Row 11: APR + total */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'center', height: 50 }}>
        <div>
          <Eyebrow color={dim}>APR</Eyebrow>
          <div style={{ ...TYPE.cardStat, marginTop: 2 }}>{plan.apr.toFixed(2)}%</div>
        </div>
        <div>
          <Eyebrow color={dim}>Total loan</Eyebrow>
          <div style={{ ...TYPE.cardStat, marginTop: 2 }}>{currency(plan.totalLoan)}</div>
        </div>
      </div>

      {/* Row 12: CTA */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 44, borderRadius: 999,
        background: selected
          ? (isDark ? T.mint : isAccent ? T.royal : T.navy)
          : (isDark ? '#F5F1EE1A' : T.ink04),
        color: selected
          ? (isDark ? T.navy : T.off)
          : (isDark ? T.off : T.navy),
        border: selected ? '0' : `1px solid ${isDark ? '#F5F1EE33' : T.ink20}`,
        fontWeight: 700, fontSize: 13.5,
      }}>
        {selected ? '✓ Selected' : 'Choose this plan'}
      </div>
    </button>
  )
}

/* =============================================================
   Shape your loan (Custom plan disclosure)
   ============================================================= */
function ShapeRow({ row, open, onToggle }) {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.ink10}`,
      borderRadius: RADIUS.cardSm, overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '36px 1fr auto', alignItems: 'center',
        gap: 16, padding: '16px 18px',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: T.royal, color: T.off,
          display: 'grid', placeItems: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 7.2L5.8 9.5L10.5 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <Eyebrow color={T.royal}>{row.label}</Eyebrow>
          <div style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600, color: T.navy, marginTop: 3, letterSpacing: '-0.005em' }}>
            {row.value}
          </div>
        </div>
        <button onClick={onToggle} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 999,
          background: T.ink04, border: `1px solid ${T.ink10}`,
          color: T.navy, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          fontFamily: FONT.body,
        }}>
          {open ? 'Close' : 'Change'}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div style={{
          borderTop: `1px dashed ${T.ink10}`,
          padding: '16px 18px 18px',
          display: 'grid', gridTemplateColumns: '1fr 280px', gap: 22, background: T.ink04,
          animation: 'fadeUp .28s ease-out both',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {row.options.map(opt => {
              const active = opt === row.value
              return (
                <div key={opt} style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: active ? T.navy : T.white,
                  color: active ? T.off : T.navy,
                  border: `1px solid ${active ? T.navy : T.ink10}`,
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  fontFamily: FONT.mono, cursor: 'pointer',
                }}>{opt}</div>
              )
            })}
          </div>
          <div style={{ fontSize: 12.5, color: T.ink70, lineHeight: 1.55, borderLeft: `1px solid ${T.ink10}`, paddingLeft: 16 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Why this matters</Eyebrow>
            {row.detail}
          </div>
        </div>
      )}
    </div>
  )
}

function ShapeSection() {
  const [openId, setOpenId] = useState(null)
  return (
    <section style={{ marginTop: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <Eyebrow color={T.royal}>Shape your loan · Custom plan</Eyebrow>
          <h2 style={{ ...TYPE.sectionH2, color: T.navy, margin: '6px 0 0' }}>
            Pick the setup that works for you.
          </h2>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 999,
          background: T.white, border: `1px solid ${T.ink10}`,
          fontSize: 12, color: T.ink60,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.emerald }} />
          All changes re-priced instantly · no hard pull
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {SHAPE_ROWS.map(r => (
          <ShapeRow key={r.id} row={r}
            open={openId === r.id}
            onToggle={() => setOpenId(openId === r.id ? null : r.id)} />
        ))}
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 16,
        padding: '14px 16px', borderRadius: 12,
        background: T.ink04, border: `1px dashed ${T.ink10}`,
      }}>
        {[
          'No obligation',
          'No hard pull yet',
          'Terms disclosed at closing',
          'Payment support funded via escrow — not a deferral or rate buydown',
        ].map(t => (
          <div key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.ink70 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.2L5 8.7L9.7 3.5" stroke={T.emerald} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t}
          </div>
        ))}
      </div>
    </section>
  )
}

/* =============================================================
   Terms of Offer
   ============================================================= */
function TermsOfOffer({ plan }) {
  const rows = [
    { k: 'Initial draw amount',                  v: plan.totalLoan, color: T.navy },
    { k: 'Cash required at closing',             v: 0,              color: T.emerald },
    { k: 'Payment reserve (held in escrow)',     v: 10988,          color: T.royal,
      note: 'Your own borrowed funds, held aside to cover your first 6 months.' },
    { k: 'Origination fee (deducted from total)', v: 2375,          color: T.ink70 },
    { k: 'Recording tax fee (deducted from total)', v: 406,         color: T.ink70 },
  ]
  return (
    <section style={{ marginTop: 36 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24, alignItems: 'start' }}>
        <div style={{
          background: T.white, border: `1px solid ${T.ink10}`,
          borderRadius: 16, padding: '22px 24px',
        }}>
          <Eyebrow>Terms of your offer</Eyebrow>
          <div style={{ ...TYPE.sectionH2, fontSize: 22, color: T.navy, marginTop: 4 }}>
            Where the money goes
          </div>
          <div style={{ marginTop: 14 }}>
            {rows.map((r, i) => (
              <div key={r.k} style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                padding: '12px 0', borderTop: i === 0 ? '0' : `1px dashed ${T.ink10}`,
                alignItems: 'baseline', gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 13.5, color: T.navy, fontWeight: 500 }}>{r.k}</div>
                  {r.note && <div style={{ fontSize: 11.5, color: T.ink60, marginTop: 3, lineHeight: 1.4 }}>{r.note}</div>}
                </div>
                <div style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: r.color, letterSpacing: '-0.01em' }}>
                  {currency(r.v)}
                </div>
              </div>
            ))}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto',
              padding: '14px 0 0', borderTop: `2px solid ${T.navy}`,
              alignItems: 'baseline', gap: 10, marginTop: 6,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, letterSpacing: '.08em', textTransform: 'uppercase' }}>Total loan balance</div>
              <div style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: 700, color: T.navy, letterSpacing: '-0.02em' }}>
                {currency(plan.totalLoan)}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: T.navy, color: T.off,
          borderRadius: 16, padding: '22px 24px',
          display: 'grid', gap: 14,
        }}>
          <Eyebrow color={T.mint}>Your payment schedule</Eyebrow>
          <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            How {currency(plan.monthly)}/mo becomes full P+I over time
          </div>
          <Schedule plan={plan} />
        </div>
      </div>
    </section>
  )
}

function Schedule({ plan }) {
  const phases = plan.id === 'standard'
    ? [{ months: 'Month 1 – 300', label: 'Full P+I', amt: plan.monthly, c: T.off }]
    : [
        { months: 'Month 1 – 6',    label: 'Payment-free (escrow)', amt: 0,   c: T.mint },
        { months: 'Month 7 – 42',   label: 'Interest-only',         amt: 443, c: '#7BA0FF' },
        { months: 'Month 43 – 300', label: 'Full P+I',              amt: 740, c: T.off },
      ]
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {phases.map((p, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'center',
          padding: '12px 14px', borderRadius: 10,
          background: '#F5F1EE0F', border: '1px solid #F5F1EE1F',
        }}>
          <div style={{ width: 8, height: 36, borderRadius: 3, background: p.c }} />
          <div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, color: '#F5F1EE99', letterSpacing: '.06em', textTransform: 'uppercase' }}>
              {p.months}
            </div>
            <div style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              {p.label}
            </div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: p.c, letterSpacing: '-0.015em' }}>
            {currency(p.amt)}<span style={{ fontSize: 11, opacity: .6, fontWeight: 500 }}>/mo</span>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: '#F5F1EE99', lineHeight: 1.45, marginTop: 4 }}>
        Estimates only. Final terms subject to underwriting and property appraisal.
      </div>
    </div>
  )
}

/* =============================================================
   Sticky confirm bar
   ============================================================= */
function ConfirmBar({ plan }) {
  return (
    <div style={{
      position: 'sticky', bottom: 16,
      margin: '36px -12px 0',
      background: T.white, border: `1px solid ${T.ink10}`,
      borderRadius: 16,
      padding: '14px 18px',
      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 20, alignItems: 'center',
      boxShadow: SHADOW.stickyConfirm,
    }}>
      <button style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderRadius: 999,
        background: T.white, border: `1px solid ${T.ink20}`,
        fontWeight: 700, fontSize: 13, color: T.navy, cursor: 'pointer',
        fontFamily: FONT.body,
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M7 2L3 6L7 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Eyebrow>Selected · {plan.eyebrow}</Eyebrow>
        <div style={{ width: 1, height: 22, background: T.ink10 }} />
        <div style={{ fontFamily: FONT.mono, fontSize: 13.5, color: T.navy, fontWeight: 600 }}>
          {currency(plan.monthly)}/mo · {plan.apr.toFixed(2)}% APR · {currency(plan.totalLoan)} loan
        </div>
      </div>

      <button style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '13px 22px', borderRadius: 999,
        background: T.royal, border: 0,
        fontWeight: 700, fontSize: 14, color: T.off,
        cursor: 'pointer', boxShadow: '0 10px 24px -12px rgba(37,75,206,1)',
        fontFamily: FONT.body,
      }}>
        Confirm plan
        <BrandMark size={15} color={T.off} />
      </button>
    </div>
  )
}

/* =============================================================
   Screen
   ============================================================= */
export default function PlanSelectV2({ name = 'Alex', amount = 150000 }) {
  const [planId, setPlanId] = useState('recommended')
  const plan = PLANS[planId]

  return (
    <Page>
      {/* Inline keyframes for accordion fade-up */}
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <TopBar />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 40px 24px' }}>
        <Hero name={name} amount={amount} />

        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <Eyebrow>Select your plan</Eyebrow>
              <h2 style={{ ...TYPE.sectionH2, fontSize: 28, color: T.navy, margin: '6px 0 0' }}>
                Three ways to pay for your project.
              </h2>
            </div>
            <div style={{ fontSize: 12.5, color: T.ink60 }}>
              Same project · <span style={{ color: T.navy, fontWeight: 600 }}>{currency(PROJECT_COST)}</span> · Different payment shapes
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {Object.values(PLANS).map(p => (
              <PlanCard key={p.id} plan={p}
                selected={planId === p.id}
                onSelect={() => setPlanId(p.id)} />
            ))}
          </div>
        </section>

        <ShapeSection />
        <TermsOfOffer plan={plan} />
        <ConfirmBar plan={plan} />

        <footer style={{
          marginTop: 40, paddingTop: 22, borderTop: `1px solid ${T.ink10}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11.5, color: T.ink40, fontFamily: FONT.mono,
        }}>
          <span>© 2026 GreenLyne · Financing by Grand Bank, NMLS #2611 · Equal Housing Lender</span>
          <span>Application #1-20022-1759</span>
        </footer>
      </main>
    </Page>
  )
}
