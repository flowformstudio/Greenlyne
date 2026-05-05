import { useEffect, useState } from 'react'
import { T, FONT, TYPE } from '../tokens'
import { Eyebrow } from '../primitives'
import { ApplicationLayout, ConfirmBar, PageHeader, Section } from '../AppShell'
import { Input, DollarInput, Select, Field, Tile, Row, Col, HelpText } from '../formPrimitives'

const SCREENS = [
  { section: 0, key: 'identity',  heading: 'Personal information',          eyebrow: 'About you',
    helper: 'For verification purposes, please provide your legal name as it appears on your government-issued ID.' },
  { section: 0, key: 'contact',   heading: 'How can we reach you?',          eyebrow: 'About you',
    helper: 'Only used for your application.' },
  { section: 1, key: 'address',   heading: 'Property information',           eyebrow: 'The property',
    helper: 'The home used as collateral.' },
  { section: 1, key: 'property',  heading: 'Tell us about the property',     eyebrow: 'The property',
    helper: 'A few quick details about your home.' },
  { section: 2, key: 'income',    heading: "What's your annual income?",     eyebrow: 'Income & loan',
    helper: 'Include all sources, pre-tax.' },
  { section: 2, key: 'loan',      heading: 'How much would you like to borrow?', eyebrow: 'Income & loan',
    helper: 'Match it to your project.' },
]

const US_STATES = [
  '', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

function dobToIso(mdy) {
  if (!mdy) return ''
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(mdy)
  if (!m) return ''
  const [, mo, dd, yyyy] = m
  return `${yyyy}-${mo.padStart(2,'0')}-${dd.padStart(2,'0')}`
}
function dobFromIso(iso) {
  if (!iso) return ''
  const [yyyy, mo, dd] = iso.split('-')
  return `${mo}/${dd}/${yyyy}`
}

export default function ScreenBasicInfo({ state, dispatch, step }) {
  const screenIdx = state.step1Screen || 0
  const meta = SCREENS[screenIdx]
  const step1 = state.step1

  const set = (field, value) => dispatch({ type: 'SET_STEP1', field, value })
  const setScreen = i => dispatch({ type: 'SET_STEP1_SCREEN', value: i })

  function canContinue() {
    switch (screenIdx) {
      case 0: return !!step1.firstName && !!step1.lastName && !!step1.dob
      case 1: return !!step1.phone && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1.email || '')
      case 2: return !!step1.address && !!step1.city && !!step1.state && !!step1.zip
      case 3: return !!step1.propType
      case 4: return !!step1.annualIncome && !!step1.incomeSource
      case 5: return !!step1.loanAmount && Number(step1.loanAmount) >= 25000
      default: return true
    }
  }

  function goNext() {
    if (!canContinue()) return
    if (screenIdx < SCREENS.length - 1) setScreen(screenIdx + 1)
    else dispatch({ type: 'NEXT' })
  }
  function goBack() {
    if (screenIdx > 0) setScreen(screenIdx - 1)
  }

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader eyebrow={meta.eyebrow} title={meta.heading} sub={meta.helper} eyebrowColor={T.royal} />

      {/* Sub-step rail */}
      <SubStepRail screens={SCREENS} current={screenIdx} />

      <div style={{ marginTop: 28, maxWidth: 720 }}>
        {screenIdx === 0 && <IdentityFields step1={step1} set={set} />}
        {screenIdx === 1 && <ContactFields step1={step1} set={set} />}
        {screenIdx === 2 && <AddressFields step1={step1} set={set} />}
        {screenIdx === 3 && <PropertyFields step1={step1} set={set} />}
        {screenIdx === 4 && <IncomeFields step1={step1} set={set} />}
        {screenIdx === 5 && <LoanFields step1={step1} set={set} />}
      </div>

      <ConfirmBar
        onBack={screenIdx > 0 ? goBack : undefined}
        onContinue={goNext}
        continueDisabled={!canContinue()}
        continueLabel={screenIdx === SCREENS.length - 1 ? 'Generate my offer' : 'Continue'}
        summary={
          <div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>
            Sub-step {screenIdx + 1} of {SCREENS.length} · {meta.heading}
          </div>
        }
      />
    </ApplicationLayout>
  )
}

function SubStepRail({ screens, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
      {screens.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'up'
        return (
          <div key={s.key} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: state === 'done' ? T.emerald : state === 'active' ? T.royal : T.ink10,
            transition: 'background .25s',
          }} />
        )
      })}
    </div>
  )
}

/* ─── Sub-screens ───────────────────────────────────────────────────── */
function IdentityFields({ step1, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Row gap={12}>
        <Col flex="2 1 0">
          <Field label="First Name"><Input value={step1.firstName} onChange={v => set('firstName', v)} /></Field>
        </Col>
        <Col flex="0 0 96px" minWidth={88} maxWidth={96}>
          <Field label="Mid. Initial"><Input value={step1.middleInitial} onChange={v => set('middleInitial', v)} /></Field>
        </Col>
        <Col flex="2 1 0">
          <Field label="Last Name"><Input value={step1.lastName} onChange={v => set('lastName', v)} /></Field>
        </Col>
      </Row>
      <Row gap={12}>
        <Col flex="2 1 0">
          <Field label="Date of Birth">
            <Input type="date" value={dobToIso(step1.dob)} onChange={v => set('dob', dobFromIso(v))} placeholder="MM/DD/YYYY" />
          </Field>
        </Col>
        <Col flex="2 1 0" />
      </Row>
    </div>
  )
}

function ContactFields({ step1, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Field label="Phone Number"><Input value={step1.phone} onChange={v => set('phone', v)} placeholder="(415) 555-0142" style={{ maxWidth: 320 }} /></Field>
        <HelpText>Used to reach you about your pre-qualification, application, or account.</HelpText>
      </div>
      <div>
        <Field label="Email Address"><Input type="email" value={step1.email} onChange={v => set('email', v)} placeholder="you@example.com" style={{ maxWidth: 460 }} /></Field>
        <HelpText>We'll send your pre-qualification result and account updates here.</HelpText>
      </div>
    </div>
  )
}

function AddressFields({ step1, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Street Address"><Input value={step1.address} onChange={v => set('address', v)} placeholder="1482 Sunridge Drive" /></Field>
      <div style={{ maxWidth: 240 }}>
        <Field label="Apt/Suite" helper="optional"><Input value={step1.unit} onChange={v => set('unit', v)} placeholder="" /></Field>
      </div>
      <Field label="City"><Input value={step1.city} onChange={v => set('city', v)} placeholder="Sacramento" /></Field>
      <Row gap={12}>
        <Col flex="1 1 0">
          <Field label="State">
            <Select value={step1.state} onChange={v => set('state', v)} options={US_STATES.map(s => ({ value: s, label: s || 'Select…' }))} />
          </Field>
        </Col>
        <Col flex="0 0 200px" minWidth={160} maxWidth={200}>
          <Field label="ZIP"><Input value={step1.zip} onChange={v => set('zip', v.replace(/\D/g,'').slice(0,5))} placeholder="95826" /></Field>
        </Col>
      </Row>
    </div>
  )
}

function PropertyFields({ step1, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginBottom: 12, fontFamily: FONT.display }}>Occupancy type</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {['Primary property','Secondary property'].map(opt => (
            <Tile key={opt}
              active={step1.propType === opt}
              onClick={() => set('propType', opt)}
              title={opt}
              sub={opt === 'Primary property' ? 'Where you live most of the year.' : 'A second home you own.'} />
          ))}
        </div>
        <HelpText>Investment properties are not eligible.</HelpText>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginBottom: 12, fontFamily: FONT.display }}>Is this property currently for sale?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[{v:false, label:'No'}, {v:true, label:'Yes'}].map(opt => (
            <Tile key={String(opt.v)}
              active={!!step1.forSale === opt.v}
              onClick={() => set('forSale', opt.v)}
              title={opt.label} />
          ))}
        </div>
        <HelpText>If you have purchased your home in the last 90 days or if title was transferred to you in the last 90 days, you are not eligible for this product.</HelpText>
        {step1.forSale && (
          <HelpText>Properties listed for sale may affect your eligibility.</HelpText>
        )}
      </div>
    </div>
  )
}

function IncomeFields({ step1, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ maxWidth: 420 }}>
        <Field label="Annual Income (Pre-Tax)" helper="Include bonus and all jobs">
          <DollarInput value={step1.annualIncome} onChange={v => set('annualIncome', v)} placeholder="124,000" />
        </Field>
        <HelpText>You may include income that is considered community or marital income in your state.</HelpText>
      </div>
      <div style={{ maxWidth: 420 }}>
        <Field label="Other Income" helper="optional">
          <DollarInput value={step1.otherIncome || ''} onChange={v => set('otherIncome', v)} placeholder="0" />
        </Field>
        <HelpText>Rental, investment, retirement, etc.</HelpText>
        <HelpText>Disclosure of alimony, child support, or separate maintenance payments is not required unless you would like us to consider this income for qualification purposes.</HelpText>
      </div>
      <div style={{ maxWidth: 420 }}>
        <Field label="Primary Source of Annual Income">
          <Select value={step1.incomeSource || ''} onChange={v => set('incomeSource', v)}
            options={[{ value: '', label: 'Select income source…' }, 'Employment', 'Self-employment', 'Retirement / pension', 'Social Security', 'Rental income', 'Other']} />
        </Field>
      </div>
    </div>
  )
}

function LoanFields({ step1, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ maxWidth: 320 }}>
        <Field label="Requested Loan Amount">
          <DollarInput value={step1.loanAmount} onChange={v => set('loanAmount', v)} placeholder="120,000" />
        </Field>
        {step1.loanAmount && Number(step1.loanAmount) < 25000 && (
          <div style={{
            marginTop: 10, padding: '10px 14px',
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 10, fontSize: 13, color: '#B91C1C', fontWeight: 500,
          }}>Minimum loan amount is $25,000.</div>
        )}
      </div>
      <div style={{ maxWidth: 320 }}>
        <Field label="Estimated Project Cost">
          <DollarInput value={step1.projectCost || ''} onChange={v => set('projectCost', v)} placeholder="96,000" />
        </Field>
      </div>
    </div>
  )
}
