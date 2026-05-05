import { T, FONT } from '../tokens'
import { ApplicationLayout, ConfirmBar, PageHeader, Card } from '../AppShell'

export default function ScreenDebtConsolidation({ dispatch, step }) {
  return (
    <ApplicationLayout currentStep={step}>
      <PageHeader
        eyebrow="Alternative path"
        eyebrowColor={T.royal}
        title="Debt consolidation path"
        sub="Coming soon — this flow will consolidate eligible debts into your HELOC at closing." />

      <div style={{ maxWidth: 720 }}>
        <Card>
          <div style={{ fontSize: 14, color: T.ink70, lineHeight: 1.6 }}>
            Based on your application, you may benefit from rolling existing debts (credit cards, personal loans) into the HELOC.
            We'll show eligible balances, the projected payment difference, and let you select which to include.
          </div>
        </Card>
      </div>

      <ConfirmBar
        onBack={() => dispatch({ type: 'BACK' })}
        onContinue={() => dispatch({ type: 'BACK' })}
        continueLabel="Return"
        summary={<div style={{ fontSize: 12.5, color: T.ink60, fontFamily: FONT.mono }}>Preview only</div>}
      />
    </ApplicationLayout>
  )
}
