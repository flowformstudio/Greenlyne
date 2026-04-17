import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import WesthavenHeader from '../components/WesthavenHeader'

const C = {
  navy: '#001660', blue: '#254BCE', teal: '#016163',
  green: '#93DDBA', greenDark: '#1a7a50',
  bg: '#F5F1EE', white: '#ffffff', border: '#D1D1D1',
  muted: '#6B7280', text: '#111827',
  red: '#DC2626', redBg: '#FEF2F2', redBorder: '#FCA5A5',
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function Shell({ children, navigate }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <WesthavenHeader />
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px 48px' }}>
        <div style={{ width: '100%', maxWidth: 560, marginTop: 32 }}>
          {children}
          {navigate && (
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
              <button
                onClick={() => navigate('/offer', { state: { showHub: true } })}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, color: C.muted, fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                ← Back to all scenarios
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Badge({ color, bg, border, children }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 100, padding: '6px 14px',
      fontSize: 12, fontWeight: 700, color,
      marginBottom: 20,
    }}>
      {children}
    </div>
  )
}

function LoanOfficerCard() {
  return (
    <div style={{
      background: C.white, border: `1.5px solid ${C.border}`,
      borderRadius: 14, padding: '20px 22px', marginTop: 16,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
        background: C.navy, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20,
      }}>👤</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 2 }}>
          Speak with a loan officer
        </div>
        <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.5 }}>
          A Westhaven specialist can review your options in detail.
        </div>
      </div>
      <button style={{
        background: C.navy, border: 'none', borderRadius: 10,
        padding: '10px 16px', fontSize: 16, fontWeight: 700,
        color: C.white, cursor: 'pointer', flexShrink: 0,
      }}>Connect</button>
    </div>
  )
}

function RadioList({ items, selected, onSelect, disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
      {items.map(({ id, label, sub }) => (
        <button
          key={id}
          onClick={() => !disabled && onSelect(id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '15px 18px',
            background: selected === id ? '#EFF6FF' : C.white,
            border: `2px solid ${selected === id ? C.blue : C.border}`,
            borderRadius: 12, cursor: disabled ? 'default' : 'pointer',
            textAlign: 'left', transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${selected === id ? C.blue : C.border}`,
            background: selected === id ? C.blue : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {selected === id && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.white }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, color: C.text }}>{label}</div>
            {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
          </div>
        </button>
      ))}
    </div>
  )
}

function PrimaryBtn({ onClick, disabled, children, color }) {
  const bg = disabled ? '#E5E7EB' : (color || C.blue)
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '15px', background: bg,
      border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 700,
      color: disabled ? C.muted : C.white, cursor: disabled ? 'default' : 'pointer',
      transition: 'background 0.15s',
    }}>
      {children}
    </button>
  )
}

function MiniSpinner({ label, sub, navigate }) {
  return (
    <Shell navigate={navigate}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 24 }}>
          <svg width="72" height="72" viewBox="0 0 72 72" style={{ position: 'absolute' }}>
            <circle cx="36" cy="36" r="30" fill="none" stroke="#E5E7EB" strokeWidth="5" />
          </svg>
          <svg width="72" height="72" viewBox="0 0 72 72" style={{ position: 'absolute', animation: 'qfspin 1s linear infinite' }}>
            <circle cx="36" cy="36" r="30" fill="none" stroke={C.teal} strokeWidth="5"
              strokeLinecap="round" strokeDasharray="75 113" />
          </svg>
          <style>{`@keyframes qfspin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{label}</div>
        {sub && <div style={{ fontSize: 17, color: C.muted }}>{sub}</div>}
      </div>
    </Shell>
  )
}

// ── EC1: Identity Challenge ───────────────────────────────────────────────────

const IDENTITY_NAMES = [
  { id: 'a', label: 'Charles Rivera' },
  { id: 'b', label: 'Charlotte Rivera' },
  { id: 'c', label: 'Christopher Rivera' },
  { id: 'd', label: 'Chad Rivera' },
  { id: 'e', label: 'Charlene Rivera' },
]
// 'a' = correct (Charles = homeowner of record; Alex is fuzzy match)

function IdentityChallengeScreen({ onPass, onFail, navigate }) {
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit() {
    if (!selected || submitting) return
    setSubmitting(true)
    setTimeout(() => {
      if (selected === 'a') onPass()
      else onFail()
    }, 700)
  }

  return (
    <Shell navigate={navigate}>
      <Badge color="#92400E" bg="#FEF3C7" border="#FDE68A">🪪 Identity Verification Required</Badge>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
        We need to confirm your identity
      </h1>
      <p style={{ fontSize: 18, color: C.muted, margin: '0 0 10px', lineHeight: 1.6 }}>
        Your application name is a close match to the homeowner of record.
        Please select the name that appears on your government-issued ID.
      </p>
      <div style={{
        background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10,
        padding: '12px 15px', marginBottom: 24, fontSize: 16, color: '#78350F',
      }}>
        <strong>Why this step?</strong> Property ownership is verified against public records. Name on application: <strong>Alex Rivera</strong>
      </div>
      <RadioList items={IDENTITY_NAMES} selected={selected} onSelect={setSelected} disabled={submitting} />
      <PrimaryBtn onClick={handleSubmit} disabled={!selected || submitting}>
        {submitting ? 'Verifying…' : 'Confirm Identity'}
      </PrimaryBtn>
    </Shell>
  )
}

// ── EC2: Property Not Qualified ───────────────────────────────────────────────

function PropertyDeclineScreen({ navigate }) {
  return (
    <Shell navigate={navigate}>
      <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ background: C.redBg, padding: '32px 28px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#FEE2E2', border: `2px solid ${C.redBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px',
          }}>🏠</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Property Not Qualified
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>
            Your property doesn't have enough equity
          </h2>
          <p style={{ fontSize: 18, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            We couldn't approve a HELOC based on your current equity position.
          </p>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Reason for decline</div>
          <div style={{
            background: C.redBg, border: `1px solid ${C.redBorder}`,
            borderRadius: 10, padding: '14px 16px',
            fontSize: 17, color: '#7F1D1D', lineHeight: 1.6, marginBottom: 20,
          }}>
            Your combined loan-to-value (CLTV) ratio of <strong>91%</strong> exceeds our maximum of <strong>85%</strong>.
            Your property does not have sufficient equity to secure a home equity line of credit at this time.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Est. Home Value', value: '$420,000' },
              { label: 'Existing Mortgage', value: '$382,200' },
              { label: 'Max HELOC (85% CLTV)', value: '$357,000' },
              { label: 'Available HELOC', value: '$0', warn: true },
            ].map(({ label, value, warn }) => (
              <div key={label} style={{ background: C.bg, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: warn ? C.red : C.text }}>{value}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.6, margin: 0 }}>
            As your home appreciates or your mortgage balance decreases, you may qualify in the future. No hard credit inquiry was performed.
          </p>
        </div>
      </div>
      <LoanOfficerCard />
    </Shell>
  )
}

// ── EC3: Address Challenge ────────────────────────────────────────────────────

const ADDRESS_OPTIONS = [
  { id: 'a', label: '847 Crestview Lane', sub: 'Sacramento, CA 95825' },
  { id: 'b', label: '1482 Sunridge Drive', sub: 'Sacramento, CA 95814  (current)' },
  { id: 'c', label: '2201 Oak Park Blvd', sub: 'Sacramento, CA 95820' },
  { id: 'd', label: '3 Pinecrest Court', sub: 'Elk Grove, CA 95758' },
  { id: 'e', label: '1109 Winding Creek Rd', sub: 'Roseville, CA 95678' },
]
// 'c' = correct past address that got a credit hit

function AddressChallengeScreen({ onPass, onFail, navigate }) {
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit() {
    if (!selected || submitting) return
    setSubmitting(true)
    setTimeout(() => {
      if (selected === 'c') onPass()
      else onFail()
    }, 700)
  }

  return (
    <Shell navigate={navigate}>
      <Badge color="#1E40AF" bg="#EFF6FF" border="#BFDBFE">📍 Address Verification Required</Badge>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
        We found your credit file
      </h1>
      <p style={{ fontSize: 18, color: C.muted, margin: '0 0 10px', lineHeight: 1.6 }}>
        Your credit file was located under a previous address. To confirm your identity, please select an address you have lived at.
      </p>
      <div style={{
        background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10,
        padding: '12px 15px', marginBottom: 24, fontSize: 16, color: '#1E40AF',
      }}>
        <strong>Why this step?</strong> Credit bureaus use address history to match files. Your entered address returned no credit record, but a past address did.
      </div>
      <RadioList items={ADDRESS_OPTIONS} selected={selected} onSelect={setSelected} disabled={submitting} />
      <PrimaryBtn onClick={handleSubmit} disabled={!selected || submitting}>
        {submitting ? 'Verifying…' : 'Confirm Address'}
      </PrimaryBtn>
    </Shell>
  )
}

// ── EC4: Spouse / Co-Borrower Addition ───────────────────────────────────────

function SpouseAdditionScreen({ onQualify, navigate }) {
  const [firstName, setFirstName] = useState('')
  const [income, setIncome] = useState('')
  const [phase, setPhase] = useState('form') // form | processing | approved

  const iStyle = {
    width: '100%', boxSizing: 'border-box', padding: '11px 14px',
    fontSize: 18, border: `1.5px solid ${C.border}`, borderRadius: 8,
    background: C.white, color: C.text, outline: 'none',
  }

  function handleSubmit() {
    if (!firstName || !income) return
    setPhase('processing')
    setTimeout(() => setPhase('approved'), 2400)
  }

  if (phase === 'processing') {
    return <MiniSpinner navigate={navigate} label="Re-running qualification…" sub={`Calculating combined DTI with ${firstName || 'co-borrower'}'s income`} />
  }

  if (phase === 'approved') {
    return (
      <Shell navigate={navigate}>
        <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ background: '#F0FDF4', padding: '32px 28px 24px', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#DCFCE7', border: '2px solid #86EFAC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, margin: '0 auto 16px',
            }}>✅</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Co-Borrower Added
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
              You qualify with {firstName}!
            </h2>
            <p style={{ fontSize: 18, color: C.muted, margin: 0 }}>
              Combined household income brings your DTI within range.
            </p>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Your DTI (solo)', value: '58%', warn: true },
                { label: 'Combined DTI', value: '39%', ok: true },
                { label: 'DTI Maximum', value: '50%' },
                { label: 'Qualification', value: '✓ Approved', ok: true },
              ].map(({ label, value, warn, ok }) => (
                <div key={label} style={{ background: C.bg, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: ok ? C.greenDark : warn ? C.red : C.text }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <PrimaryBtn onClick={onQualify}>View My Pre-Approval →</PrimaryBtn>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell navigate={navigate}>
      <Badge color="#1E40AF" bg="#EFF6FF" border="#BFDBFE">👥 Co-Borrower Can Help You Qualify</Badge>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
        Add your spouse's income
      </h1>
      <p style={{ fontSize: 18, color: C.muted, margin: '0 0 12px', lineHeight: 1.6 }}>
        Your current DTI ratio is <strong>58%</strong> — above our 50% maximum. Adding your spouse's income lowers the ratio and can unlock qualification.
      </p>
      <div style={{
        background: '#FEF3C7', border: '1px solid #FDE68A',
        borderRadius: 10, padding: '12px 15px', marginBottom: 24,
        fontSize: 16, color: '#78350F', lineHeight: 1.5,
      }}>
        <strong>Note:</strong> This adds income to the numerator only. Your spouse's debts are not pulled into this application at this stage.
      </div>

      <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '24px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 18 }}>
          Spouse / Co-Borrower
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 16, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>First Name *</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Maria" style={iStyle} />
          </div>
          <div>
            <label style={{ fontSize: 16, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Last Name</label>
            <input placeholder="Rivera" style={iStyle} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 16, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Annual Income *</label>
          <input value={income} onChange={e => setIncome(e.target.value)} placeholder="$75,000" style={iStyle} />
        </div>
      </div>

      <PrimaryBtn onClick={handleSubmit} disabled={!firstName || !income}>
        Re-Run Qualification →
      </PrimaryBtn>
      <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 10 }}>
        Soft inquiry only — no impact to either credit score
      </p>
    </Shell>
  )
}

// ── EC5: Debt Consolidation ───────────────────────────────────────────────────

const REQ_DEBTS = [
  { id: 'r1', name: 'Existing HELOC — First National Bank',   monthly: 342, balance: 28400 },
  { id: 'r2', name: 'Second lien — Contractor lien',          monthly: 615, balance: 41200 },
]
const REC_DEBTS = [
  { id: 'c1', name: 'Auto loan — 2022 Tesla Model 3',         monthly: 485, balance: 24800 },
  { id: 'c2', name: 'Personal loan — Marcus by Goldman',      monthly: 312, balance: 18600 },
]
const OPT_DEBTS = [
  { id: 'o1', name: 'Student loans — Navient',                monthly: 210, balance: 14200 },
  { id: 'o2', name: 'Credit card minimums — Chase Sapphire',  monthly: 180, balance: 12800 },
]

const GROSS_MO   = 5500   // applicant gross monthly income
const OTHER_MO   = 1200   // non-consolidated monthly obligations (car, etc.)
const PROJECT_COST = 50000

// DTI calc: uses only consolidation loan payment (not project), per lender rules
function helocRate(bal) {
  if (!bal) return 0
  const r = 0.0925 / 12, n = 300
  return Math.round(bal * r / (1 - Math.pow(1 + r, -n)))
}

function DebtBucket({ label, sublabel, accent, bg, border: bdr, debts, locked, checked, onToggle }) {
  const balTotal = debts.reduce((s, d) => s + d.balance, 0)
  return (
    <div style={{ background: bg, border: `1.5px solid ${bdr}`, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{
        padding: '13px 18px', borderBottom: `1px solid ${bdr}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: accent, marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{sublabel}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: C.muted }}>Total balance</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>${balTotal.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {debts.map(debt => (
          <div key={debt.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {locked ? (
              <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ) : (
              <button onClick={() => onToggle(debt.id)} style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0, padding: 0,
                background: checked[debt.id] ? accent : 'transparent',
                border: `2px solid ${checked[debt.id] ? accent : C.border}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {checked[debt.id] && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: C.text }}>{debt.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>Balance: ${debt.balance.toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, flexShrink: 0 }}>
              ${debt.monthly}/mo
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DebtConsolidationScreen({ onQualify, onDecline, navigate }) {
  const [recOn, setRecOn] = useState({ c1: true, c2: true })
  const [optOn, setOptOn] = useState({ o1: false, o2: false })

  const reqBal  = REQ_DEBTS.reduce((s, d) => s + d.balance, 0)  // 69,600
  const reqMo   = REQ_DEBTS.reduce((s, d) => s + d.monthly, 0)  // 957
  const recBal  = REC_DEBTS.filter(d => recOn[d.id]).reduce((s, d) => s + d.balance, 0)
  const recMo   = REC_DEBTS.filter(d => recOn[d.id]).reduce((s, d) => s + d.monthly, 0)
  const optBal  = OPT_DEBTS.filter(d => optOn[d.id]).reduce((s, d) => s + d.balance, 0)
  const optMo   = OPT_DEBTS.filter(d => optOn[d.id]).reduce((s, d) => s + d.monthly, 0)

  const consolidationBal = reqBal + recBal + optBal
  const fullLoan         = consolidationBal + PROJECT_COST
  const fullPayment      = helocRate(fullLoan)
  const dtiPayment       = helocRate(consolidationBal)  // DTI uses consolidation only
  const replacedMo       = reqMo + recMo + optMo
  const newDTI           = Math.round((dtiPayment + OTHER_MO) / GROSS_MO * 100)
  const beforeDTI        = Math.round((reqMo + recMo + optMo + OTHER_MO) / GROSS_MO * 100)
  const qualifies        = newDTI <= 50
  const netChange        = fullPayment - replacedMo

  return (
    <Shell navigate={navigate}>
      <Badge color="#5B21B6" bg="#F5F3FF" border="#DDD6FE">💳 Debt Consolidation Path Available</Badge>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: '0 0 8px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
        Here's how you can still qualify
      </h1>
      <p style={{ fontSize: 18, color: C.muted, margin: '0 0 8px', lineHeight: 1.6 }}>
        Your DTI is <strong>{beforeDTI}%</strong>, above our <strong>50%</strong> maximum. Rolling existing debts into your HELOC lowers your monthly obligations and can bring DTI into range.
      </p>
      <p style={{ fontSize: 16, color: C.muted, margin: '0 0 24px', lineHeight: 1.5 }}>
        Select which debts to consolidate. Required items are mandatory per lender policy.
      </p>

      <DebtBucket
        label="Required — Must Consolidate"
        sublabel="Lender policy: existing junior liens must be retired"
        accent="#DC2626"
        bg="#FEF2F2"
        border="#FCA5A5"
        debts={REQ_DEBTS}
        locked={true}
        checked={{}}
        onToggle={() => {}}
      />

      <DebtBucket
        label="Recommended — Lower Your Payment"
        sublabel="Consolidating these reduces your DTI and monthly burden"
        accent={C.blue}
        bg="#EFF6FF"
        border="#BFDBFE"
        debts={REC_DEBTS}
        locked={false}
        checked={recOn}
        onToggle={(id) => setRecOn(prev => ({ ...prev, [id]: !prev[id] }))}
      />

      <DebtBucket
        label="Optional — Your Choice"
        sublabel="Not required, but available if you'd like to consolidate"
        accent={C.muted}
        bg={C.bg}
        border={C.border}
        debts={OPT_DEBTS}
        locked={false}
        checked={optOn}
        onToggle={(id) => setOptOn(prev => ({ ...prev, [id]: !prev[id] }))}
      />

      {/* Summary panel */}
      <div style={{ background: C.navy, borderRadius: 16, padding: '24px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Your New HELOC
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          {[
            { label: 'Total Loan Amount',     value: `$${fullLoan.toLocaleString()}` },
            { label: 'New Monthly Payment',   value: `$${fullPayment.toLocaleString()}/mo` },
            { label: 'Monthly Debts Retired', value: replacedMo > 0 ? `$${replacedMo.toLocaleString()}/mo` : '—' },
            {
              label: 'Net Monthly Change',
              value: netChange <= 0
                ? `Save $${Math.abs(netChange).toLocaleString()}/mo`
                : `+$${netChange.toLocaleString()}/mo`,
              green: netChange <= 0,
            },
          ].map(({ label, value, green }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: green ? C.green : C.white }}>{value}</div>
            </div>
          ))}
        </div>
        {/* DTI gauge */}
        <div style={{
          background: qualifies ? 'rgba(147,221,186,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${qualifies ? 'rgba(147,221,186,0.4)' : 'rgba(239,68,68,0.35)'}`,
          borderRadius: 10, padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: qualifies ? C.green : '#FCA5A5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              New DTI Ratio
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
              {qualifies ? '✓ Under 50% maximum — you qualify' : '✗ Still above 50% maximum'}
            </div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: qualifies ? C.green : '#FCA5A5', letterSpacing: '-1px' }}>
            {newDTI}%
          </div>
        </div>
      </div>

      {qualifies ? (
        <PrimaryBtn onClick={onQualify}>Proceed with Consolidation Plan →</PrimaryBtn>
      ) : (
        <>
          <div style={{
            background: C.redBg, border: `1px solid ${C.redBorder}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 14,
            fontSize: 17, color: '#7F1D1D', lineHeight: 1.5,
          }}>
            Even including all optional debts, your DTI of {newDTI}% still exceeds our 50% maximum. We're unable to approve through consolidation alone.
          </div>
          <PrimaryBtn onClick={onDecline} color="#374151">See decline options →</PrimaryBtn>
        </>
      )}
    </Shell>
  )
}

// ── EC6: Full Decline ─────────────────────────────────────────────────────────

function FullDeclineScreen({ navigate }) {
  return (
    <Shell navigate={navigate}>
      <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ background: C.redBg, padding: '32px 28px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#FEE2E2', border: `2px solid ${C.redBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px',
          }}>❌</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Application Not Approved
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>
            We're unable to approve your application
          </h2>
          <p style={{ fontSize: 18, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Based on our review, your application does not meet our current qualifying criteria.
          </p>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Reason for decline</div>
          <div style={{
            background: C.redBg, border: `1px solid ${C.redBorder}`,
            borderRadius: 10, padding: '14px 16px', marginBottom: 20,
            fontSize: 17, color: '#7F1D1D', lineHeight: 1.6,
          }}>
            Your debt-to-income ratio of <strong>72%</strong> significantly exceeds our maximum qualifying threshold of <strong>50%</strong>. Debt consolidation alone is not sufficient to bring your DTI into range.
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Your options going forward</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {[
              { icon: '📉', title: 'Pay down existing debt', desc: 'Reducing monthly obligations will lower your DTI over time.' },
              { icon: '💼', title: 'Increase household income', desc: 'A higher income base or co-borrower can change your DTI picture.' },
              { icon: '🏠', title: 'Build more home equity', desc: 'As your mortgage balance decreases, your available HELOC may increase.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: C.bg, borderRadius: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.6, margin: 0 }}>
            No hard credit inquiry was performed. You may reapply at any time.
          </p>
        </div>
      </div>
      <LoanOfficerCard />
    </Shell>
  )
}

// ── Generic Decline (identity / address fail) ─────────────────────────────────

const DECLINE_COPY = {
  identity: {
    icon: '🪪',
    title: 'Identity could not be verified',
    body: 'We were unable to confirm your identity against the homeowner of record. For security purposes, we cannot proceed with this application automatically.',
  },
  address: {
    icon: '📍',
    title: 'Address could not be verified',
    body: 'We were unable to match any address on file to your provided information. We cannot proceed without successful address verification.',
  },
}

function DeclineScreen({ reason, navigate }) {
  const copy = DECLINE_COPY[reason] || DECLINE_COPY.identity
  return (
    <Shell navigate={navigate}>
      <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ background: C.redBg, padding: '32px 28px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#FEE2E2', border: `2px solid ${C.redBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px',
          }}>{copy.icon}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Verification Failed
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>
            {copy.title}
          </h2>
          <p style={{ fontSize: 18, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            {copy.body}
          </p>
        </div>
      </div>
      <LoanOfficerCard />
    </Shell>
  )
}

// ── Credit OK transition ──────────────────────────────────────────────────────

function CreditOkScreen({ navigate }) {
  const [phase, setPhase] = useState('credit') // credit | done
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('done')
      setTimeout(() => navigate('/pre-qualified'), 500)
    }, 2800)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <Shell navigate={navigate}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 24 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'absolute' }}>
            <circle cx="40" cy="40" r="33" fill="none" stroke="#E5E7EB" strokeWidth="5" />
          </svg>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'absolute', animation: 'qfspin 1s linear infinite' }}>
            <circle cx="40" cy="40" r="33" fill="none" stroke={C.teal} strokeWidth="5"
              strokeLinecap="round" strokeDasharray="85 123" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 6 }}>
          {phase === 'credit' ? 'Identity verified ✓' : 'Credit check complete ✓'}
        </div>
        <div style={{ fontSize: 17, color: C.muted }}>
          {phase === 'credit' ? 'Running credit check…' : 'Loading your offer…'}
        </div>
      </div>
    </Shell>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function QualificationFlow() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const init        = location.state?.scenario || 'ec1'
  const [screen, setScreen]         = useState(init)
  const [declineReason, setDecline] = useState(null)

  const goDecline = (reason) => { setDecline(reason); setScreen('decline') }

  switch (screen) {
    case 'ec1':
      return <IdentityChallengeScreen
        navigate={navigate}
        onPass={() => setScreen('credit-ok')}
        onFail={() => goDecline('identity')}
      />
    case 'ec2':
      return <PropertyDeclineScreen navigate={navigate} />
    case 'ec3':
      return <AddressChallengeScreen
        navigate={navigate}
        onPass={() => setScreen('credit-ok')}
        onFail={() => goDecline('address')}
      />
    case 'ec4':
      return <SpouseAdditionScreen navigate={navigate} onQualify={() => navigate('/pre-qualified')} />
    case 'ec5':
      return <DebtConsolidationScreen
        navigate={navigate}
        onQualify={() => navigate('/pre-qualified')}
        onDecline={() => setScreen('ec6')}
      />
    case 'ec6':
      return <FullDeclineScreen navigate={navigate} />
    case 'credit-ok':
      return <CreditOkScreen navigate={navigate} />
    case 'decline':
      return <DeclineScreen navigate={navigate} reason={declineReason} />
    default:
      return null
  }
}
