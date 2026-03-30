# GreenLyne Demo Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the GreenLyne demo from a financing-form-first flow to a value-first journey: Demo Launcher → SmartPOS (ESTIMATE → MICRO_CONFIRM → REFINED → INTENT → HANDOFF) → /financing.

**Architecture:** New SmartPOS component at `/offer` runs a client-side state machine through 5 phases (8 states total). Source param (`?source=qr|email`) controls viewport width and INTENT-tap behavior. Existing OfferLanding moves to `/financing` with copy reframing only. POSDemo closing states are expanded from 3 ambiguous states to 5 explicit ones.

**Tech Stack:** React 19, Vite 7, Tailwind CSS v4, React Router DOM v7. All components use inline styles (not Tailwind) — follow the pattern in OfferLanding.jsx.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/pages/DemoLauncher.jsx` | Rep entry chooser — QR path vs Email path |
| Create | `src/pages/SmartPOS.jsx` | Value-first state machine (ESTIMATE → HANDOFF) |
| Modify | `src/App.jsx` | Add /demo, /financing routes; reroute /offer |
| Modify | `src/pages/OfferLanding.jsx` | Copy reframe + continuation banner + read passed state |
| Modify | `src/pages/POSDemo.jsx` | Replace C-states with 5 explicit closing sub-states |

### Brand tokens (use in all new files)

```js
const C = {
  navy:  '#001660',
  blue:  '#254BCE',
  teal:  '#016163',
  green: '#93DDBA',
  bg:    '#F5F1EE',
  white: '#ffffff',
  muted: '#94a3b8',
}
```

---

## Task 1: Update routing in App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Read the current App.jsx to confirm imports and route list**

```bash
cat src/App.jsx
```

Expected: Routes for `/`, `/pos-demo`, `/email`, `/offer`, `/pre-qualified`.

- [ ] **Step 2: Replace App.jsx with updated routing**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AppLayout from './layout/AppLayout'
import Pipeline from './pages/Pipeline'
import GeoCampaigns from './pages/GeoCampaigns'
import Settings from './pages/Settings'
import UserManagement from './pages/settings/UserManagement'
import Organizations from './pages/settings/Organizations'
import ChangePassword from './pages/settings/ChangePassword'
import POSDemo from './pages/POSDemo'
import EmailPreview from './pages/EmailPreview'
import OfferLanding from './pages/OfferLanding'
import PreQualified from './pages/PreQualified'
import DemoLauncher from './pages/DemoLauncher'
import SmartPOS from './pages/SmartPOS'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/demo" element={<DemoLauncher />} />
      <Route path="/offer" element={<SmartPOS />} />
      <Route path="/financing" element={<OfferLanding />} />
      <Route path="/pos-demo" element={<POSDemo />} />
      <Route path="/email" element={<EmailPreview />} />
      <Route path="/pre-qualified" element={<PreQualified />} />
      <Route element={<AppLayout />}>
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/geo-campaigns" element={<GeoCampaigns />} />
        <Route path="/settings" element={<Settings />}>
          <Route index element={<Navigate to="/settings/users" replace />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="password" element={<ChangePassword />} />
        </Route>
        <Route path="/dashboard" element={<Navigate to="/pipeline" replace />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 3: Verify dev server has no import errors**

Open http://localhost:5174/demo in the browser. Expected: blank page or 404 content (DemoLauncher doesn't exist yet) — NOT a white crash screen with a React error.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add /demo, /financing routes; reroute /offer to SmartPOS"
```

---

## Task 2: Create DemoLauncher.jsx

**Files:**
- Create: `src/pages/DemoLauncher.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/pages/DemoLauncher.jsx
import { useNavigate } from 'react-router-dom'

const C = {
  navy: '#001660', blue: '#254BCE', teal: '#016163',
  green: '#93DDBA', bg: '#F5F1EE', white: '#ffffff', muted: '#94a3b8',
}

export default function DemoLauncher() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, borderRadius: 8, padding: '6px 14px', marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.white, letterSpacing: '-0.01em' }}>GreenLyne Demo</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Choose your demo path</div>
        <div style={{ fontSize: 14, color: C.muted }}>Select how the homeowner will enter the flow</div>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 640 }}>
        {/* QR path */}
        <button
          onClick={() => navigate('/offer?source=qr')}
          style={{ flex: '1 1 280px', background: C.white, border: `2px solid rgba(0,22,96,0.1)`, borderRadius: 16, padding: '28px 24px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,22,96,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,22,96,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>📱</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>QR / On-site demo</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>Homeowner scans a QR code at the rep's location. Mobile view. Rep is auto-notified when homeowner confirms intent.</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, borderRadius: 8, padding: '8px 14px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>Launch QR flow →</span>
          </div>
        </button>

        {/* Email path */}
        <button
          onClick={() => navigate('/offer?source=email')}
          style={{ flex: '1 1 280px', background: C.white, border: `2px solid rgba(0,22,96,0.1)`, borderRadius: 16, padding: '28px 24px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.boxShadow = '0 4px 16px rgba(1,97,99,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,22,96,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>📧</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Email demo flow</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>Homeowner clicks a link in their email. Desktop view. Homeowner chooses to talk now or get a callback.</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.teal, borderRadius: 8, padding: '8px 14px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>Launch email flow →</span>
          </div>
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 48, fontSize: 11, color: C.muted }}>
        Westhaven Solar · GreenLyne financing · OWNING lender
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:5174/demo. Expected: Two cards visible — "QR / On-site demo" and "Email demo flow." Clicking QR card navigates to `/offer?source=qr`. Clicking Email card navigates to `/offer?source=email`. Both land on a blank page (SmartPOS not built yet) without crashing.

- [ ] **Step 3: Commit**

```bash
git add src/pages/DemoLauncher.jsx
git commit -m "feat: add DemoLauncher entry chooser at /demo"
```

---

## Task 3: Create SmartPOS.jsx — skeleton + ESTIMATE state

**Files:**
- Create: `src/pages/SmartPOS.jsx`

- [ ] **Step 1: Create SmartPOS with ESTIMATE state**

```jsx
// src/pages/SmartPOS.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const C = {
  navy: '#001660', blue: '#254BCE', teal: '#016163',
  green: '#93DDBA', bg: '#F5F1EE', white: '#ffffff', muted: '#94a3b8',
}

const STATES = {
  ESTIMATE:      'ESTIMATE',
  MICRO_CONFIRM: 'MICRO_CONFIRM',
  REFINED:       'REFINED',
  INTENT:        'INTENT',
  HANDOFF:       'HANDOFF',
}

const HANDOFF_STATES = {
  PENDING:   'PENDING',
  SCHEDULED: 'SCHEDULED',
  ACTIVE:    'ACTIVE',
  COMPLETED: 'COMPLETED',
}

// ── Shared header ──────────────────────────────────────────────────────────────
function Header({ source }) {
  return (
    <div style={{ background: C.white, borderBottom: '1px solid rgba(0,22,96,0.07)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Westhaven logo placeholder */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, background: '#e0271a', borderRadius: 1 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: '#0d0d0d' }}>Westhaven</span>
      </div>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {source === 'qr' ? 'Powered by GreenLyne' : 'Powered by GreenLyne'}
      </div>
    </div>
  )
}

// ── Progress dots ──────────────────────────────────────────────────────────────
function ProgressDots({ step, total = 4 }) {
  return (
    <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ width: 20, height: 4, borderRadius: 2, background: i < step ? C.navy : 'rgba(0,22,96,0.12)' }} />
      ))}
      <span style={{ fontSize: 10, color: C.muted, marginLeft: 4 }}>Step {step} of {total}</span>
    </div>
  )
}

// ── ESTIMATE screen ────────────────────────────────────────────────────────────
function ScreenEstimate({ source, onNext }) {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <Header source={source} />

      {/* Address pill */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(1,97,99,0.08)', border: '1px solid rgba(1,97,99,0.15)', borderRadius: 100, padding: '5px 12px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.teal }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.teal }}>1482 Sunridge Drive, Sacramento CA</span>
        </div>
      </div>

      {/* Headline */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          Your home may qualify for a solar plan that lowers your monthly energy cost.
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Current bill */}
        <div style={{ background: C.white, borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(0,22,96,0.07)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Current electric bill</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.navy, letterSpacing: '-0.03em', lineHeight: 1 }}>
            $1,400<span style={{ fontSize: 16, color: C.muted, fontWeight: 400 }}>/mo</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Unpredictable · rises every year</div>
        </div>

        {/* Solar payment */}
        <div style={{ background: C.navy, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Estimated solar payment</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.green, letterSpacing: '-0.03em', lineHeight: 1 }}>
            $1,260<span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>/mo</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Fixed rate · you own the system</div>
        </div>

        {/* Savings */}
        <div style={{ background: 'rgba(147,221,186,0.15)', border: '1px solid rgba(147,221,186,0.3)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Est. monthly savings</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.teal, letterSpacing: '-0.03em', lineHeight: 1 }}>
              $140<span style={{ fontSize: 16, fontWeight: 400 }}>/mo</span>
            </div>
          </div>
          <div style={{ fontSize: 28 }}>🌿</div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '20px' }}>
        <button
          onClick={onNext}
          style={{ width: '100%', background: C.navy, border: 'none', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          See Your Exact Plan →
        </button>
        <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 8 }}>We ran this estimate for your property · No commitment</div>
      </div>
    </div>
  )
}

// ── Main SmartPOS component ────────────────────────────────────────────────────
export default function SmartPOS() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const source = searchParams.get('source') || 'email' // 'qr' | 'email'

  const [phase, setPhase] = useState(STATES.ESTIMATE)
  const [handoffPhase, setHandoffPhase] = useState(HANDOFF_STATES.PENDING)
  const [billRange, setBillRange] = useState(140) // slider value
  const [billBucket, setBillBucket] = useState(null) // chip selection

  // Viewport: QR = 390px mobile, Email = full desktop
  const wrapperStyle = source === 'qr'
    ? { maxWidth: 390, margin: '0 auto' }
    : { width: '100%' }

  function goToFinancing() {
    navigate('/financing', {
      state: {
        address: '1482 Sunridge Drive',
        city: 'Sacramento',
        state: 'CA',
        billRange,
        estimate: { payment: 1260, savings: 140, currentBill: 1400 },
        source,
      }
    })
  }

  return (
    <div style={wrapperStyle}>
      {phase === STATES.ESTIMATE && (
        <ScreenEstimate source={source} onNext={() => setPhase(STATES.MICRO_CONFIRM)} />
      )}
      {phase === STATES.MICRO_CONFIRM && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: C.muted, fontSize: 14 }}>MICRO_CONFIRM — coming in Task 4</div>
          <button onClick={() => setPhase(STATES.REFINED)} style={{ marginTop: 16, background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>Next →</button>
        </div>
      )}
      {phase === STATES.REFINED && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: C.muted, fontSize: 14 }}>REFINED — coming in Task 5</div>
          <button onClick={() => setPhase(STATES.INTENT)} style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>Next →</button>
        </div>
      )}
      {phase === STATES.INTENT && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: C.muted, fontSize: 14 }}>INTENT — coming in Task 6</div>
          <button onClick={() => setPhase(STATES.HANDOFF)} style={{ background: C.teal, color: C.white, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>Next →</button>
        </div>
      )}
      {phase === STATES.HANDOFF && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: C.muted, fontSize: 14 }}>HANDOFF ({handoffPhase}) — coming in Task 7</div>
          <button onClick={goToFinancing} style={{ background: C.green, color: C.navy, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>→ Financing</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:5174/offer?source=qr. Expected: ESTIMATE screen constrained to 390px with the three metric cards (current bill, solar payment, savings). "See Your Exact Plan →" button advances to a placeholder screen.

Open http://localhost:5174/offer?source=email. Expected: Same content but full-width.

Clicking through all placeholder screens should reach `/financing` without crashing.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SmartPOS.jsx
git commit -m "feat: SmartPOS skeleton + ESTIMATE state"
```

---

## Task 4: SmartPOS — MICRO_CONFIRM state

**Files:**
- Modify: `src/pages/SmartPOS.jsx`

- [ ] **Step 1: Add ScreenMicroConfirm component above the main export**

Add this function after `ScreenEstimate` and before `export default function SmartPOS()`:

```jsx
// ── MICRO_CONFIRM screen ───────────────────────────────────────────────────────
function ScreenMicroConfirm({ source, billRange, setBillRange, onNext }) {
  const [owns, setOwns] = useState(true)

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <Header source={source} />
      <ProgressDots step={2} />

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, lineHeight: 1.2, marginBottom: 4 }}>
          Confirm two details to sharpen your estimate.
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>Takes 10 seconds.</div>
      </div>

      {/* Bill slider */}
      <div style={{ margin: '16px 20px 0', background: C.white, borderRadius: 16, padding: 18, border: '1px solid rgba(0,22,96,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
          What's your average monthly electric bill?
        </div>
        <input
          type="range" min={50} max={300} step={10}
          value={billRange}
          onChange={e => setBillRange(Number(e.target.value))}
          style={{ width: '100%', accentColor: C.navy, marginBottom: 10 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: C.muted }}>$50</span>
          <span style={{ fontSize: 10, color: C.muted }}>$300+</span>
        </div>
        <div style={{ textAlign: 'center', background: 'rgba(0,22,96,0.05)', borderRadius: 8, padding: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>${billRange}</span>
          <span style={{ fontSize: 13, color: C.muted }}>/mo</span>
        </div>
      </div>

      {/* Ownership toggle */}
      <div style={{ margin: '12px 20px 0', background: C.white, borderRadius: 16, padding: 18, border: '1px solid rgba(0,22,96,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
          Do you own 1482 Sunridge Drive?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: '🏠 Yes, I own it', value: true },
            { label: '🏢 I rent', value: false },
          ].map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setOwns(opt.value)}
              style={{
                borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit',
                border: owns === opt.value ? `2px solid ${C.navy}` : '2px solid rgba(0,22,96,0.12)',
                background: owns === opt.value ? C.navy : C.white,
                fontSize: 12, fontWeight: 700,
                color: owns === opt.value ? C.white : C.muted,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '16px 20px 20px' }}>
        <button
          onClick={onNext}
          style={{ width: '100%', background: C.blue, border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Update My Estimate →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the MICRO_CONFIRM placeholder in SmartPOS render**

Replace this block:
```jsx
      {phase === STATES.MICRO_CONFIRM && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: C.muted, fontSize: 14 }}>MICRO_CONFIRM — coming in Task 4</div>
          <button onClick={() => setPhase(STATES.REFINED)} style={{ marginTop: 16, background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>Next →</button>
        </div>
      )}
```

With:
```jsx
      {phase === STATES.MICRO_CONFIRM && (
        <ScreenMicroConfirm
          source={source}
          billRange={billRange}
          setBillRange={setBillRange}
          onNext={() => setPhase(STATES.REFINED)}
        />
      )}
```

- [ ] **Step 3: Verify in browser**

Navigate to http://localhost:5174/offer?source=qr. Click "See Your Exact Plan →". Expected: MICRO_CONFIRM screen with a bill slider defaulting to 140 and two ownership cards. Moving the slider updates the displayed dollar value. "Update My Estimate →" advances to the REFINED placeholder.

- [ ] **Step 4: Commit**

```bash
git add src/pages/SmartPOS.jsx
git commit -m "feat: SmartPOS MICRO_CONFIRM state — bill slider + ownership toggle"
```

---

## Task 5: SmartPOS — REFINED state

**Files:**
- Modify: `src/pages/SmartPOS.jsx`

- [ ] **Step 1: Add ScreenRefined component**

Add this function after `ScreenMicroConfirm` and before `export default function SmartPOS()`:

```jsx
// ── REFINED screen ─────────────────────────────────────────────────────────────
function ScreenRefined({ source, billRange, onNext }) {
  const savings = Math.max(20, Math.round((billRange - 20) * 0.7 / 10) * 10)
  const solarPayment = billRange - savings

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <Header source={source} />
      <ProgressDots step={3} />

      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(1,97,99,0.08)', border: '1px solid rgba(1,97,99,0.2)', borderRadius: 100, padding: '4px 10px', marginBottom: 10 }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.teal }}>Updated for your bill range</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, lineHeight: 1.2, marginBottom: 3 }}>Here's your refined plan.</div>
        <div style={{ fontSize: 11, color: C.muted }}>Based on a ${Math.round(billRange * 0.85)}–${billRange}/mo bill at 1482 Sunridge Drive</div>
      </div>

      {/* Savings hero */}
      <div style={{ margin: '12px 16px 0', background: C.navy, borderRadius: 14, padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Est. monthly savings</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.green, letterSpacing: '-0.03em', lineHeight: 1 }}>${savings}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>per month · after switching to solar</div>
      </div>

      {/* Before / After */}
      <div style={{ margin: '10px 16px 0', display: 'grid', gridTemplateColumns: '1fr auto 1fr', background: C.white, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,22,96,0.07)' }}>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Now</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.muted, letterSpacing: '-0.02em', lineHeight: 1, textDecoration: 'line-through', textDecorationColor: 'rgba(224,39,26,0.5)' }}>${billRange}</div>
          <div style={{ fontSize: 9, color: '#d1d5db', marginTop: 2 }}>electric bill</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: '#d1d5db', fontSize: 14, background: '#f8f9fa' }}>→</div>
        <div style={{ padding: 12, background: 'rgba(0,22,96,0.03)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>With solar</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, letterSpacing: '-0.02em', lineHeight: 1 }}>${solarPayment}</div>
          <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>fixed payment</div>
        </div>
      </div>

      {/* Expectation setter */}
      <div style={{ margin: '10px 16px 0', padding: '10px 12px', background: 'rgba(37,75,206,0.05)', borderRadius: 10, border: '1px solid rgba(37,75,206,0.1)' }}>
        <div style={{ fontSize: 10, color: C.blue, lineHeight: 1.6 }}>After you confirm, a solar specialist will walk you through your exact plan.</div>
      </div>

      {/* CTA */}
      <div style={{ padding: '12px 16px 14px' }}>
        <button
          onClick={onNext}
          style={{ width: '100%', background: C.navy, border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Confirm &amp; Get Exact Plan →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace REFINED placeholder in SmartPOS render**

Replace:
```jsx
      {phase === STATES.REFINED && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: C.muted, fontSize: 14 }}>REFINED — coming in Task 5</div>
          <button onClick={() => setPhase(STATES.INTENT)} style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>Next →</button>
        </div>
      )}
```

With:
```jsx
      {phase === STATES.REFINED && (
        <ScreenRefined
          source={source}
          billRange={billRange}
          onNext={() => setPhase(STATES.INTENT)}
        />
      )}
```

- [ ] **Step 3: Verify in browser**

Flow through ESTIMATE → MICRO_CONFIRM (move slider to $250) → click "Update My Estimate →". Expected: REFINED screen showing updated savings hero based on the $250 value, before/after comparison below, and "Confirm & Get Exact Plan →" button.

- [ ] **Step 4: Commit**

```bash
git add src/pages/SmartPOS.jsx
git commit -m "feat: SmartPOS REFINED state — dynamic savings from bill range"
```

---

## Task 6: SmartPOS — INTENT state

**Files:**
- Modify: `src/pages/SmartPOS.jsx`

- [ ] **Step 1: Add ScreenIntent component**

Add this function after `ScreenRefined` and before `export default function SmartPOS()`:

```jsx
// ── INTENT screen ──────────────────────────────────────────────────────────────
function ScreenIntent({ source, billRange, onConfirm }) {
  const savings = Math.max(20, Math.round((billRange - 20) * 0.7 / 10) * 10)
  const solarPayment = billRange - savings
  const [emailChoice, setEmailChoice] = useState(null) // null | 'now' | 'later'

  // QR path: single CTA that calls onConfirm immediately
  // Email path: show two CTAs, either calls onConfirm
  const handleConfirm = () => onConfirm()

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <Header source={source} />

      <div style={{ padding: '28px 16px 0', textAlign: 'center' }}>
        {/* Plan summary card */}
        <div style={{ background: C.navy, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Your plan · 1482 Sunridge Drive</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Solar payment</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.white }}>${solarPayment}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>/mo</span></div>
            </div>
            <div style={{ background: 'rgba(147,221,186,0.12)', borderRadius: 10, padding: 10, border: '1px solid rgba(147,221,186,0.2)' }}>
              <div style={{ fontSize: 9, color: 'rgba(147,221,186,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>You save</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>${savings}<span style={{ fontSize: 11, color: 'rgba(147,221,186,0.5)' }}>/mo</span></div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Est. system: 8.4 kW · $131,800 HELOC · $0 down</div>
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 6, lineHeight: 1.25 }}>Ready to get your exact plan?</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
          A solar specialist will walk you through the confirmed numbers and answer your questions.
        </div>

        {source === 'qr' ? (
          /* QR: single CTA, rep notified silently */
          <>
            <button
              onClick={handleConfirm}
              style={{ width: '100%', background: C.teal, border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}
            >
              Confirm &amp; Get My Exact Plan
            </button>
            <div style={{ fontSize: 11, color: C.muted, paddingBottom: 20 }}>No commitment · No credit check · Takes 2 minutes</div>
          </>
        ) : (
          /* Email: two CTAs */
          <>
            <button
              onClick={handleConfirm}
              style={{ width: '100%', background: C.teal, border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}
            >
              Talk to a specialist now
            </button>
            <button
              onClick={handleConfirm}
              style={{ width: '100%', background: 'transparent', border: `1.5px solid rgba(0,22,96,0.2)`, borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 600, color: C.navy, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}
            >
              We'll reach out shortly
            </button>
            <div style={{ fontSize: 11, color: C.muted, paddingBottom: 20 }}>No commitment · No credit check · Takes 2 minutes</div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace INTENT placeholder in SmartPOS render**

Replace:
```jsx
      {phase === STATES.INTENT && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: C.muted, fontSize: 14 }}>INTENT — coming in Task 6</div>
          <button onClick={() => setPhase(STATES.HANDOFF)} style={{ background: C.teal, color: C.white, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>Next →</button>
        </div>
      )}
```

With:
```jsx
      {phase === STATES.INTENT && (
        <ScreenIntent
          source={source}
          billRange={billRange}
          onConfirm={() => setPhase(STATES.HANDOFF)}
        />
      )}
```

- [ ] **Step 3: Verify QR path**

Open http://localhost:5174/offer?source=qr. Flow through to INTENT. Expected: Single "Confirm & Get My Exact Plan" teal button. Tapping advances to HANDOFF placeholder.

- [ ] **Step 4: Verify Email path**

Open http://localhost:5174/offer?source=email. Flow through to INTENT. Expected: Two CTAs — "Talk to a specialist now" and "We'll reach out shortly." Either advances to HANDOFF placeholder.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SmartPOS.jsx
git commit -m "feat: SmartPOS INTENT state — QR single CTA vs Email dual CTA"
```

---

## Task 7: SmartPOS — HANDOFF states (all 4 sub-states)

**Files:**
- Modify: `src/pages/SmartPOS.jsx`

- [ ] **Step 1: Add ScreenHandoff component with all 4 sub-states**

Add this function after `ScreenIntent` and before `export default function SmartPOS()`:

```jsx
// ── HANDOFF screen ─────────────────────────────────────────────────────────────
function ScreenHandoff({ source, handoffPhase, setHandoffPhase, onComplete }) {
  if (handoffPhase === HANDOFF_STATES.PENDING) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
        <Header source={source} />
        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Spinner (CSS animation via style tag) */}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(0,22,96,0.08)', borderTopColor: C.navy, animation: 'spin 1s linear infinite', marginTop: 24 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, lineHeight: 1.3, marginBottom: 8 }}>Reviewing your estimate…</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>A solar specialist is being connected to your plan</div>
          </div>
          {/* Plan recap */}
          <div style={{ background: C.white, borderRadius: 12, padding: '12px 14px', width: '100%', maxWidth: 320, border: '1px solid rgba(0,22,96,0.07)' }}>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 6 }}>Your plan</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>$1,260/mo</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.teal }}>Save $140/mo</span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: C.muted, textAlign: 'center' }}>No lender language · no financing yet</div>
          {/* Demo advance button */}
          <button onClick={() => setHandoffPhase(HANDOFF_STATES.SCHEDULED)} style={{ marginTop: 16, background: 'rgba(0,22,96,0.06)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 11, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            [Demo] Specialist assigned →
          </button>
        </div>
      </div>
    )
  }

  if (handoffPhase === HANDOFF_STATES.SCHEDULED) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
        <Header source={source} />
        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(37,75,206,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 0' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 4 }}>You're all set.</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>Your solar specialist will call you</div>
          </div>
          <div style={{ background: C.white, borderRadius: 12, padding: 16, border: '1px solid rgba(37,75,206,0.15)' }}>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>Scheduled call</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>Today at 2:30 PM</div>
            <div style={{ fontSize: 12, color: C.blue, marginTop: 2 }}>Trevor Evanson · Westhaven</div>
          </div>
          <div style={{ background: 'rgba(37,75,206,0.05)', borderRadius: 10, padding: 10, fontSize: 12, color: C.blue, lineHeight: 1.5 }}>
            He'll review your exact plan and answer any questions — takes about 15 min.
          </div>
          <button onClick={() => setHandoffPhase(HANDOFF_STATES.ACTIVE)} style={{ background: 'rgba(0,22,96,0.06)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 11, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            [Demo] Call starting →
          </button>
        </div>
      </div>
    )
  }

  if (handoffPhase === HANDOFF_STATES.ACTIVE) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
        {/* GreenLyne now visible in header */}
        <div style={{ background: C.white, borderBottom: '1px solid rgba(0,22,96,0.07)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, background: '#e0271a', borderRadius: 1 }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0d0d0d' }}>Westhaven</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.teal }}>GreenLyne</span>
          </div>
        </div>
        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Call in progress</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, lineHeight: 1.3 }}>Trevor is walking you through your plan</div>
          </div>
          {/* Live plan card */}
          <div style={{ background: C.navy, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Your plan · on screen</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Payment</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.white }}>$1,260/mo</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Savings</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.green }}>$140/mo</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 1.5 }}>
            Stay on this screen — your specialist has the same plan in front of them
          </div>
          <button onClick={() => setHandoffPhase(HANDOFF_STATES.COMPLETED)} style={{ background: 'rgba(0,22,96,0.06)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 11, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            [Demo] Call complete →
          </button>
        </div>
      </div>
    )
  }

  // COMPLETED
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      {/* GreenLyne + OWNING co-brand */}
      <div style={{ background: C.white, borderBottom: '1px solid rgba(0,22,96,0.07)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, background: '#e0271a', borderRadius: 1 }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: '#0d0d0d' }}>Westhaven</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.teal }}>GreenLyne</span>
          <span style={{ fontSize: 10, color: C.muted }}>·</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.navy }}>OWNING</span>
        </div>
      </div>
      <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(1,97,99,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 0' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Plan confirmed.</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>Your solar specialist reviewed your estimate and confirmed this plan works for your home.</div>
        </div>
        <div style={{ background: C.white, borderRadius: 10, padding: 12, border: '1px solid rgba(0,22,96,0.08)', fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
          "Now that your plan is confirmed, let's look at the financing that supports it."
        </div>
        <button
          onClick={onComplete}
          style={{ width: '100%', background: C.navy, border: 'none', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Continue to Financing →
        </button>
        <div style={{ fontSize: 9, color: C.muted, textAlign: 'center' }}>GreenLyne financing · OWNING lender</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace HANDOFF placeholder in SmartPOS render**

Replace:
```jsx
      {phase === STATES.HANDOFF && (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: C.muted, fontSize: 14 }}>HANDOFF ({handoffPhase}) — coming in Task 7</div>
          <button onClick={goToFinancing} style={{ background: C.green, color: C.navy, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>→ Financing</button>
        </div>
      )}
```

With:
```jsx
      {phase === STATES.HANDOFF && (
        <ScreenHandoff
          source={source}
          handoffPhase={handoffPhase}
          setHandoffPhase={setHandoffPhase}
          onComplete={goToFinancing}
        />
      )}
```

- [ ] **Step 3: Verify all 4 sub-states**

Navigate http://localhost:5174/offer?source=qr, flow all the way through to HANDOFF. Expected:
- H·PENDING: Spinner, plan recap, "[Demo] Specialist assigned →" button
- H·SCHEDULED: Check icon, "Today at 2:30 PM · Trevor Evanson", "[Demo] Call starting →" button
- H·ACTIVE: "Call in progress" header, live plan card, "[Demo] Call complete →" button
- H·COMPLETED: Check icon, "Plan confirmed", "Continue to Financing →" button which navigates to `/financing`

- [ ] **Step 4: Commit**

```bash
git add src/pages/SmartPOS.jsx
git commit -m "feat: SmartPOS HANDOFF — all 4 sub-states (PENDING, SCHEDULED, ACTIVE, COMPLETED)"
```

---

## Task 8: Reframe OfferLanding.jsx for /financing

**Files:**
- Modify: `src/pages/OfferLanding.jsx`

- [ ] **Step 1: Read the top of OfferLanding to understand current heading and imports**

```bash
grep -n "useLocation\|Confirm Your\|Step.*of.*4\|step.*1\|step.*2\|step.*3\|step.*4\|Submit.*Elig\|checking.*qualif\|Confirm your identity\|Your financial" src/pages/OfferLanding.jsx | head -30
```

- [ ] **Step 2: Add useLocation import and read passed state**

In `OfferLanding.jsx`, find the existing destructured imports line (should include `useNavigate, useLocation`). If `useLocation` is not already imported, add it. Then at the top of the `OfferLanding` function body, add state reading:

Find the function start (it will look like `export default function OfferLanding()` or similar). Add state reading right after the existing `useNavigate()` and `useLocation()` hooks:

```jsx
const location = useLocation()
const passedState = location.state || {}
const confirmedAddress = passedState.address || '1482 Sunridge Drive'
const confirmedCity    = passedState.city    || 'Sacramento'
const confirmedState   = passedState.state   || 'CA'
```

- [ ] **Step 3: Add continuation banner**

Find the render return in `OfferLanding`. Right after the `<Header />` component (or wherever the header ends and before the `<ProgressBar />` or first step content), insert the continuation banner:

```jsx
{/* Continuation banner — plan confirmed from SmartPOS */}
<div style={{ background: '#0a1f12', border: '1px solid #166534', borderRadius: 10, padding: '10px 14px', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
  <div>
    <div style={{ fontSize: 12, fontWeight: 700, color: '#f0fdf4' }}>Plan confirmed · {confirmedAddress}</div>
    <div style={{ fontSize: 11, color: '#4ade80', marginTop: 1 }}>Solar payment $1,260/mo · Save $140/mo</div>
  </div>
</div>
```

- [ ] **Step 4: Update page heading copy**

Find the page heading text. It currently reads `"Confirm Your Pre-Configured Offer"` (or close to it). Change it to `"Let's finalize your plan"`.

- [ ] **Step 5: Update step label copy**

Find where step labels are defined (the `steps` array in `ProgressBar` or wherever `Step 1 of 4` is displayed). The sub-labels should be updated:

| Step | New label |
|------|-----------|
| Property | "Set up your plan" |
| About You | "A few details about you" |
| Financials | "Your financial picture" |
| Review | "Review & Finalize" |

- [ ] **Step 6: Update step sub-headings**

Search for these existing sub-heading strings and replace them:

| Find | Replace |
|------|---------|
| `"We're checking if you qualify"` or `"checking if you qualify"` | `"Let's confirm your property details"` |
| `"Confirm your identity"` | `"A few details about you"` |
| `"Your financial snapshot"` | `"Your financial picture"` |
| `"Submit & Check Eligibility"` | `"Submit & Finalize My Plan"` |

Use Grep to find the exact strings first, then Edit to replace them.

- [ ] **Step 7: Update GreenLyne badge to equal-weight (not "powered by")**

Find `GreenLyneBadge` component. Currently the first line reads `"Financing services powered by"`. Change it to render GreenLyne + Westhaven at equal weight. Replace the label text:

```jsx
// Change this line in GreenLyneBadge:
<div style={{ fontSize: 8.5, fontWeight: 700, color: '#8899bb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Financing services powered by</div>
// To:
<div style={{ fontSize: 8.5, fontWeight: 700, color: '#8899bb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>GreenLyne · OWNING lender</div>
```

- [ ] **Step 8: Pre-fill address field from passed state**

Find the initial form state (the `useState` that initializes `address`, `city`, `state` fields). Update the defaults to use the passed state values:

The initial state object for the form fields will have `address: ''` or similar. Change it to read from `confirmedAddress` and `confirmedCity`. Since the `useState` runs on mount, use the passed values as defaults:

```jsx
// Find the useState call that initializes form fields (Step 1 / Property step)
// It will look like: const [form, setForm] = useState({ address: '', city: '', ... })
// Change the defaults to:
const [form, setForm] = useState({
  address:         confirmedAddress,
  city:            confirmedCity,
  state:           confirmedState,
  // ... rest of existing fields unchanged ...
})
```

- [ ] **Step 9: Verify the full /financing flow**

Navigate http://localhost:5174/offer?source=email and flow through all the way to "Continue to Financing →". Expected:
- `/financing` loads with the dark green continuation banner at top
- Page heading reads "Let's finalize your plan"
- Address field is pre-filled with "1482 Sunridge Drive"
- City field is pre-filled with "Sacramento"
- Submit button reads "Submit & Finalize My Plan"

- [ ] **Step 10: Commit**

```bash
git add src/pages/OfferLanding.jsx
git commit -m "feat: reframe OfferLanding as /financing — continuation banner, copy updates, pre-fill"
```

---

## Task 9: POSDemo — 5 explicit closing sub-states

**Files:**
- Modify: `src/pages/POSDemo.jsx`

- [ ] **Step 1: Add new closing state constants**

Find the `const S = { ... }` state constants object at the top of `POSDemo.jsx`. Add 5 new states after `SIGN_CLOSING` and before `FUNDED`:

```js
// Replace existing closing states:
CLOSING_PREP:          'closing_prep',
CLOSING_PREP_WAIT:     'closing_prep_wait',
ENOTARY_WAIT:          'enotary_wait',
MANUAL_NOTARY_WAIT:    'manual_notary_wait',
SIGN_CLOSING:          'sign_closing',

// With these 5 explicit states:
DOCS_PREPARING:        'docs_preparing',
READY_TO_SCHEDULE:     'ready_to_schedule',
NOTARY_SCHEDULED:      'notary_scheduled',
SIGNING_IN_PROGRESS:   'signing_in_progress',
LOAN_CLOSED:           'loan_closed',
```

Keep `FUNDED` unchanged.

- [ ] **Step 2: Update STEPS array**

Find the `STEPS` array (near the top). It currently has:
```js
{ n: 5, label: 'Review & Sign',  states: [S.CLOSING_PREP, S.CLOSING_PREP_WAIT] },
{ n: 6, label: 'Closing',        states: [S.ENOTARY_WAIT, S.MANUAL_NOTARY_WAIT, S.SIGN_CLOSING] },
```

Replace with:
```js
{ n: 5, label: 'Review & Sign',  states: [S.DOCS_PREPARING, S.READY_TO_SCHEDULE] },
{ n: 6, label: 'Closing',        states: [S.NOTARY_SCHEDULED, S.SIGNING_IN_PROGRESS, S.LOAN_CLOSED] },
```

- [ ] **Step 3: Update reducer transitions**

Find the reducer's state transition map. Update all references from old closing states to new ones:

- `[S.CLOSING_PREP]` → `[S.DOCS_PREPARING]`
- `[S.CLOSING_PREP_WAIT]` → `[S.READY_TO_SCHEDULE]`
- `ACCEPT` action dispatch target: `S.CLOSING_PREP` → `S.DOCS_PREPARING`
- `ADVANCE_NOTARY` action: transitions from `READY_TO_SCHEDULE` → `NOTARY_SCHEDULED`
- Add new action `NOTARY_ARRIVED` → `SIGNING_IN_PROGRESS`
- `SIGN` action → `S.LOAN_CLOSED` (instead of `S.FUNDED`)
- Add new action `CLOSE_LOAN` → `S.FUNDED`

- [ ] **Step 4: Update sim-mode step shortcuts**

Find the sim-mode advance shortcuts (line ~311):
```js
5: S.CLOSING_PREP,
6: S.SIGN_CLOSING,
```

Replace with:
```js
5: S.DOCS_PREPARING,
6: S.SIGNING_IN_PROGRESS,
```

- [ ] **Step 5: Update `isWaitingNotary` references**

Find any `appState === S.ENOTARY_WAIT || appState === S.MANUAL_NOTARY_WAIT` checks. Replace with:
```js
appState === S.NOTARY_SCHEDULED || appState === S.SIGNING_IN_PROGRESS
```

Also update `flexScreens` set — replace `S.ENOTARY_WAIT, S.MANUAL_NOTARY_WAIT` with `S.NOTARY_SCHEDULED`.

- [ ] **Step 6: Replace old screen components with 5 new ones**

Remove the 5 old screen functions: `ScreenClosingPrep`, `ScreenClosingPrepWait`, `ScreenENotaryWait`, `ScreenManualNotaryWait`, `ScreenSignClosing`.

Add these 5 new ones before the main `POSDemo` export:

```jsx
function ScreenDocsPrepairing({ dispatch }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">C·1 — Documents Preparing</div>
      <h1 className="text-2xl font-bold mb-3" style={{ color: '#001660' }}>Closing documents are being prepared</h1>
      <div className="rounded-2xl border p-6 mb-4 text-center" style={{ borderColor: 'rgba(0,22,96,0.1)', background: '#f8f9fa' }}>
        <div className="text-4xl mb-3">📄</div>
        <div className="text-sm font-semibold mb-1" style={{ color: '#001660' }}>Document generation in progress</div>
        <div className="text-xs text-gray-400 leading-relaxed">Our team is preparing your closing documents. This typically takes 1–2 business days. We'll notify you when they're ready to review.</div>
      </div>
      <div className="rounded-xl p-4 text-sm text-blue-600" style={{ background: 'rgba(37,75,206,0.05)', border: '1px solid rgba(37,75,206,0.1)' }}>
        No action needed right now — we'll reach out when your notary appointment can be scheduled.
      </div>
    </div>
  )
}

function ScreenReadyToSchedule({ dispatch }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">C·2 — Ready to Schedule</div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#001660' }}>Your documents are ready</h1>
      <p className="text-sm text-gray-500">Schedule your notary appointment to complete the signing process.</p>
      <div className="rounded-2xl border p-6" style={{ borderColor: 'rgba(22,163,74,0.25)', background: 'rgba(22,163,74,0.03)' }}>
        <div className="text-sm font-semibold mb-3" style={{ color: '#001660' }}>Available notary appointments</div>
        {[
          { label: 'Tomorrow at 10:00 AM', sub: 'Sarah Chen · eNotary' },
          { label: 'Tomorrow at 2:00 PM',  sub: 'James Park · eNotary' },
          { label: 'Wed at 11:00 AM',      sub: 'Maria Santos · In-person' },
        ].map((slot, i) => (
          <button key={i} onClick={() => dispatch({ type: 'ADVANCE_NOTARY' })}
            className="w-full text-left rounded-xl border p-4 mb-2 transition-all hover:border-blue-400"
            style={{ borderColor: 'rgba(0,22,96,0.1)', background: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}>
            <div className="text-sm font-semibold" style={{ color: '#001660' }}>{slot.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{slot.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ScreenNotaryScheduled({ dispatch }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">C·3 — Notary Scheduled</div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#001660' }}>Appointment confirmed</h1>
      <div className="rounded-2xl border p-6" style={{ borderColor: 'rgba(37,75,206,0.15)', background: '#fff' }}>
        <div className="text-xs text-gray-400 mb-1">Scheduled notary appointment</div>
        <div className="text-2xl font-bold mb-1" style={{ color: '#001660' }}>Tomorrow at 10:00 AM</div>
        <div className="text-sm font-medium mb-3" style={{ color: '#254BCE' }}>Sarah Chen · eNotary · 45 min</div>
        <button className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: 'rgba(37,75,206,0.08)', color: '#254BCE', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add to calendar
        </button>
      </div>
      <div className="rounded-xl p-4 text-sm text-gray-500" style={{ background: '#f8f9fa', border: '1px solid rgba(0,22,96,0.06)' }}>
        You'll receive a link to join the eNotary session 10 minutes before your appointment. No printer needed.
      </div>
      <button onClick={() => dispatch({ type: 'NOTARY_ARRIVED' })}
        className="text-xs text-gray-400 underline block text-center w-full"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        [Demo] Notary session starting →
      </button>
    </div>
  )
}

function ScreenSigningInProgress({ dispatch }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
        <div className="text-[11px] font-bold uppercase tracking-widest text-green-600">C·4 — Signing in Progress</div>
      </div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#001660' }}>You're almost done.</h1>
      <p className="text-sm text-gray-500">Your notary session is in progress. Sign each document as presented.</p>
      <div className="rounded-2xl border p-6 space-y-3" style={{ borderColor: 'rgba(0,22,96,0.1)', background: '#fff' }}>
        {[
          { label: 'Loan agreement', done: true },
          { label: 'Deed of trust', done: true },
          { label: 'Right of rescission notice', done: false },
          { label: 'Closing disclosure', done: false },
        ].map((doc, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: doc.done ? '#ECFDF5' : 'rgba(0,22,96,0.05)', border: doc.done ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(0,22,96,0.1)' }}>
              {doc.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <span className="text-sm" style={{ color: doc.done ? '#6b7280' : '#001660', fontWeight: doc.done ? 400 : 600 }}>{doc.label}</span>
          </div>
        ))}
      </div>
      <button onClick={() => dispatch({ type: 'SIGN' })}
        className="w-full rounded-xl p-4 text-sm font-bold text-white"
        style={{ background: '#001660', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        Complete Signing →
      </button>
    </div>
  )
}

function ScreenLoanClosed({ dispatch }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-green-600 mb-1">C·5 — Loan Closed ✓</div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#001660' }}>All documents signed.</h1>
      <div className="rounded-2xl p-6 text-center" style={{ background: '#ECFDF5', border: '1px solid rgba(22,163,74,0.2)' }}>
        <div className="text-4xl mb-3">🎉</div>
        <div className="text-lg font-bold mb-2" style={{ color: '#001660' }}>Your loan is officially closed!</div>
        <div className="text-sm text-gray-500 leading-relaxed">Your solar installation is being scheduled with Westhaven. You'll receive a confirmation call within 1 business day.</div>
      </div>
      <button onClick={() => dispatch({ type: 'CLOSE_LOAN' })}
        className="w-full rounded-xl p-4 text-sm font-bold text-white"
        style={{ background: '#016163', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        View funded details →
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Update the screen router in POSDemo**

Find the switch/case block that routes to screen components (around line 1733). Replace old closing state cases:

```jsx
// Replace:
case S.CLOSING_PREP:      return <ScreenClosingPrep dispatch={dispatch} />
case S.CLOSING_PREP_WAIT: return <ScreenClosingPrepWait dispatch={dispatch} />
case S.ENOTARY_WAIT:      return <ScreenENotaryWait />
case S.MANUAL_NOTARY_WAIT:return <ScreenManualNotaryWait />
case S.SIGN_CLOSING:      return <ScreenSignClosing loan={loan} step2={step2} dispatch={dispatch} />

// With:
case S.DOCS_PREPARING:      return <ScreenDocsPrepairing dispatch={dispatch} />
case S.READY_TO_SCHEDULE:   return <ScreenReadyToSchedule dispatch={dispatch} />
case S.NOTARY_SCHEDULED:    return <ScreenNotaryScheduled dispatch={dispatch} />
case S.SIGNING_IN_PROGRESS: return <ScreenSigningInProgress dispatch={dispatch} />
case S.LOAN_CLOSED:         return <ScreenLoanClosed dispatch={dispatch} />
```

- [ ] **Step 8: Add NOTARY_ARRIVED and CLOSE_LOAN to the reducer**

In the reducer, add:
```js
case 'NOTARY_ARRIVED': return { ...state, app: S.SIGNING_IN_PROGRESS }
case 'CLOSE_LOAN':     return { ...state, app: S.FUNDED }
```

And update `SIGN` to go to `LOAN_CLOSED`:
```js
case 'SIGN': return { ...state, app: S.LOAN_CLOSED }
```

- [ ] **Step 9: Verify POSDemo closing flow**

Navigate to http://localhost:5174/pos-demo. Use sim-mode to advance to step 5 (closing prep). Expected:
- C·1: "Closing documents are being prepared" — no action CTA
- C·2: "Your documents are ready" — 3 appointment slots, clicking one advances to C·3
- C·3: "Appointment confirmed" — shows Sarah Chen at 10:00 AM, "[Demo] Notary session starting →" advances to C·4
- C·4: "You're almost done" — document signing progress list, "Complete Signing →" advances to C·5
- C·5: "All documents signed" — celebration card, "View funded details →" advances to FUNDED

- [ ] **Step 10: Commit**

```bash
git add src/pages/POSDemo.jsx
git commit -m "feat: POSDemo closing states — 5 explicit sub-states (C1–C5)"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task(s) |
|---|---|
| Demo Launcher at /demo | Task 2 |
| SmartPOS state machine | Tasks 3–7 |
| QR (mobile) vs Email (desktop) viewport | Task 3 (wrapperStyle) |
| ESTIMATE screen — numbers hero | Task 3 |
| MICRO_CONFIRM — slider + ownership | Task 4 |
| REFINED — dynamic savings from bill range | Task 5 |
| INTENT — QR single CTA vs Email dual CTA | Task 6 |
| HANDOFF — 4 sub-states with branding progression | Task 7 |
| State passed to /financing | Task 7 (goToFinancing) |
| /financing continuation banner | Task 8 |
| /financing copy reframe (headings, step labels, CTA) | Task 8 |
| /financing pre-fill from state | Task 8 |
| /financing GreenLyne equal-weight badge | Task 8 |
| POSDemo 5 closing sub-states | Task 9 |
| App.jsx routing changes | Task 1 |

All spec requirements covered. ✓

**Type/name consistency check:**

- `HANDOFF_STATES` constants used in Task 3 (defined), Task 7 (used in ScreenHandoff and SmartPOS state) — consistent ✓
- `goToFinancing` defined in SmartPOS, called in Task 7 as `onComplete` prop → calls `goToFinancing` — consistent ✓
- POSDemo new state constants defined in Task 9 Step 1, used in Steps 2–8 — consistent ✓
- `dispatch({ type: 'ADVANCE_NOTARY' })` in ScreenReadyToSchedule goes to `S.NOTARY_SCHEDULED` — consistent with reducer update in Step 3 ✓
- `dispatch({ type: 'NOTARY_ARRIVED' })` added in Step 8, called in ScreenNotaryScheduled Step 6 — consistent ✓
- `dispatch({ type: 'CLOSE_LOAN' })` added in Step 8, called in ScreenLoanClosed Step 6 — consistent ✓
