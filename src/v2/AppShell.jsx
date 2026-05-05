import { T, FONT, TYPE, RADIUS, SHADOW } from './tokens'
import { Wordmark, Eyebrow, BrandMark, Page } from './primitives'

/* ── Top bar ──────────────────────────────────────────────────────────── */
export function TopBar({ applicationId = '#1-20022-1759' }) {
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
          Application <span style={{ color: T.navy }}>{applicationId}</span>
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

/* ── Progress rail ────────────────────────────────────────────────────── */
export const STEP_LABELS = [
  'Basic info', 'Configure offer', 'Verify', 'Final offer', 'Review & sign', 'Closing', 'Funded',
]

export function ProgressRail({ current = 1 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      <Eyebrow>Step {current} of 7</Eyebrow>
      <div style={{ width: 14 }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        {STEP_LABELS.map((s, i) => {
          const n = i + 1
          const state = n < current ? 'done' : n === current ? 'active' : 'up'
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: state === 'active' ? '0 0 auto' : '1 1 0' }}>
              <div style={{
                width: state === 'active' ? 'auto' : 8,
                height: 8,
                padding: state === 'active' ? '0 10px' : 0,
                borderRadius: 4,
                background: state === 'done' ? T.emerald : state === 'active' ? T.navy : T.ink20,
                display: state === 'active' ? 'grid' : 'block',
                placeItems: 'center',
                color: T.off,
                fontSize: 10, fontFamily: FONT.mono, fontWeight: 700,
                letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
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

/* ── Sticky confirm/nav bar ──────────────────────────────────────────── */
export function ConfirmBar({
  onBack,
  backLabel = 'Back',
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  summary,
  variant = 'continue', // 'continue' | 'confirm'
}) {
  const primaryColor = T.royal
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
      {onBack ? (
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 999,
          background: T.white, border: `1px solid ${T.ink20}`,
          fontWeight: 700, fontSize: 13, color: T.navy, cursor: 'pointer',
          fontFamily: FONT.body,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7 2L3 6L7 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel}
        </button>
      ) : <span />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifySelf: 'start' }}>
        {summary}
      </div>

      <button onClick={onContinue} disabled={continueDisabled} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '13px 22px', borderRadius: 999,
        background: continueDisabled ? T.ink20 : primaryColor,
        border: 0, fontWeight: 700, fontSize: 14,
        color: continueDisabled ? T.ink40 : T.off,
        cursor: continueDisabled ? 'not-allowed' : 'pointer',
        boxShadow: continueDisabled ? 'none' : '0 10px 24px -12px rgba(37,75,206,1)',
        fontFamily: FONT.body,
      }}>
        {continueLabel}
        {variant === 'confirm' && !continueDisabled && <BrandMark size={15} color={T.off} />}
        {variant === 'continue' && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M5 2L9 6L5 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  )
}

/* ── Footer ──────────────────────────────────────────────────────────── */
export function Footer({ applicationId = '#1-20022-1759' }) {
  return (
    <footer style={{
      marginTop: 40, paddingTop: 22, borderTop: `1px solid ${T.ink10}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: 11.5, color: T.ink40, fontFamily: FONT.mono,
    }}>
      <span>© 2026 GreenLyne · Financing by Grand Bank, NMLS #2611 · Equal Housing Lender</span>
      <span>Application {applicationId}</span>
    </footer>
  )
}

/* ── Section heading helpers ─────────────────────────────────────────── */
export function PageHeader({ eyebrow, title, sub, eyebrowColor }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {eyebrow && <Eyebrow color={eyebrowColor || T.ink60}>{eyebrow}</Eyebrow>}
      <h1 style={{
        ...TYPE.heroH1, fontSize: 38, color: T.navy, margin: '8px 0 0',
        maxWidth: 800,
      }}>
        {title}
      </h1>
      {sub && <p style={{ ...TYPE.body, color: T.ink70, margin: '14px 0 0', maxWidth: 720 }}>{sub}</p>}
    </div>
  )
}

export function Section({ title, eyebrow, children, style }) {
  return (
    <section style={{ marginBottom: 28, ...style }}>
      {eyebrow && <Eyebrow style={{ marginBottom: 8 }}>{eyebrow}</Eyebrow>}
      {title && (
        <h2 style={{ ...TYPE.sectionH2, fontSize: 22, color: T.navy, margin: '0 0 14px' }}>{title}</h2>
      )}
      {children}
    </section>
  )
}

export function Card({ children, dark = false, style }) {
  return (
    <div style={{
      background: dark ? T.navy : T.white,
      color: dark ? T.off : T.navy,
      border: dark ? 'none' : `1px solid ${T.ink10}`,
      borderRadius: RADIUS.card,
      padding: '22px 24px',
      ...style,
    }}>{children}</div>
  )
}

/* ── Application layout — wraps all v2 screens ───────────────────────── */
export function ApplicationLayout({ currentStep, children, applicationId = '#1-20022-1759', maxWidth = 1240 }) {
  return (
    <Page>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <TopBar applicationId={applicationId} />
      <main style={{ maxWidth, margin: '0 auto', padding: '32px 40px 24px' }}>
        <ProgressRail current={currentStep} />
        {children}
        <Footer applicationId={applicationId} />
      </main>
    </Page>
  )
}
