import { T, FONT } from '../tokens'
import { ApplicationLayout, ConfirmBar, PageHeader, Section } from '../AppShell'
import { Field, Input, Select, DollarInput, Row, Col } from '../formPrimitives'

export default function ScreenMoreInfo({ state, dispatch, step }) {
  const step3 = state.step3
  const set = (field, value) => dispatch({ type: 'SET_STEP3', field, value })

  const canContinue = !!step3.ssn && !!step3.employer && !!step3.monthlyExpenses

  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="A few more details"
        eyebrowColor={T.royal}
        title="Help us complete your underwriting."
        sub="This information is encrypted and only used to finalize your offer. No hard credit pull yet." />

      <Section eyebrow="Identity verification" title="Social Security Number">
        <div style={{ maxWidth: 320 }}>
          <Field label="SSN" helper="9 digits, encrypted">
            <Input value={step3.ssn} onChange={v => set('ssn', v.replace(/\D/g,'').slice(0,9))} placeholder="•••-••-••••" />
          </Field>
        </div>
      </Section>

      <Section eyebrow="Employment" title="Where do you work?">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 720 }}>
          <Field label="Employer"><Input value={step3.employer} onChange={v => set('employer', v)} placeholder="Acme, Inc." /></Field>
          <Field label="Years at employer"><Input value={step3.yearsEmployed} onChange={v => set('yearsEmployed', v.replace(/\D/g,''))} placeholder="6" /></Field>
        </div>
      </Section>

      <Section eyebrow="Monthly obligations" title="What do you spend per month?">
        <div style={{ maxWidth: 320 }}>
          <Field label="Monthly Expenses" helper="Mortgage / rent + minimums on debt">
            <DollarInput value={step3.monthlyExpenses} onChange={v => set('monthlyExpenses', v)} placeholder="3,200" />
          </Field>
        </div>
      </Section>

      <ConfirmBar
        onBack={() => dispatch({ type: 'BACK' })}
        onContinue={() => dispatch({ type: 'NEXT' })}
        continueDisabled={!canContinue}
        summary={<div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>Provide more info</div>}
      />
    </ApplicationLayout>
  )
}
