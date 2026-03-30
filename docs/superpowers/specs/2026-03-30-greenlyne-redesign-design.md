# GreenLyne Demo Redesign — Design Spec

**Date:** 2026-03-30
**Status:** Approved

---

## Overview

Redesign the GreenLyne demo homeowner journey from entry point to funded loan. The current demo drops users directly into a financing form (`/offer`) before they've seen value. The redesigned flow leads with value, earns commitment progressively, then introduces financing as a natural next step.

The redesign introduces a new SmartPOS component (`/offer`) with a value-first state machine, repositions the existing financing form downstream (`/financing`), and clarifies the POSDemo closing states.

---

## 1. Entry Point — Demo Launcher (`/demo`)

A pre-demo screen for sales reps to choose which demo path to run. Not part of the homeowner journey — it's a rep tool.

**Two entry paths:**

| Path | Label | Route | Viewport |
|------|-------|-------|----------|
| QR scan | "QR / On-site demo" | `/offer?source=qr` | 390px (mobile) |
| Email link | "Email demo flow" | `/offer?source=email` | Desktop |

**Design:** Light product feel (option B from brainstorm). Westhaven-branded. Two large cards, subtle GreenLyne footer. No extra text — just launch.

**Route:** `/demo`
**New file:** `src/pages/DemoLauncher.jsx`

---

## 2. SmartPOS — State Machine (`/offer`)

Single route, no URL changes. All phases managed via internal state. Source (`qr` | `email`) detected from URL param and persisted in state throughout.

### State flow

```
ESTIMATE → MICRO_CONFIRM → REFINED → INTENT → HANDOFF → (exit to /financing)
```

### State: ESTIMATE

First screen after email CTA click or QR scan.

- **Layout:** Numbers-hero (option A). Three stacked metric cards: current bill ($1,400/mo) → solar payment ($1,260/mo) → savings ($140/mo green hero).
- **Header:** Westhaven logo + "Powered by GreenLyne" (subtle)
- **Address pill:** `1482 Sunridge Drive, Sacramento CA` as personalization signal
- **CTA:** "See Your Exact Plan →"
- **No lender language, no APR, no application framing**

### State: MICRO_CONFIRM

Two inputs only. Feels like a quick check, not a form.

- **Layout:** Slider + tap cards (option A). Bill slider ($50–$300+) + ownership toggle (own/rent).
- **Progress:** Step 2 of 4 progress dots
- **Headline:** "Confirm two details to sharpen your estimate."
- **CTA:** "Update My Estimate →"
- Address used in ownership question for personalization

### State: REFINED

Shows updated numbers after micro-confirm. Savings is the hero.

- **Hero:** `$140/mo` savings in large teal text on dark card
- **Secondary:** Before/After comparison ($1,400 → $1,260) below the hero
- **Expectation setter:** "After you confirm, a solar specialist will walk you through your exact plan."
- **CTA:** "Confirm & Get Exact Plan →"
- Progress: Step 3 of 4

### State: INTENT

Explicit commitment gate. Curiosity ends here, financing unlocks after this tap.

- **Minimal screen.** Plan summary recap (payment + savings side-by-side on dark card).
- **CTA:** "Confirm & Get My Exact Plan" (teal button, full-width)
- **Trust line:** "No commitment · No credit check · Takes 2 minutes"
- **Behavior diverges here by source:**
  - `source=qr`: rep auto-notified silently, goes straight to HANDOFF
  - `source=email`: shows two CTAs — "Talk to a specialist now" / "We'll reach out shortly" — either → HANDOFF

### State: HANDOFF (4 sub-states)

Replaces a single ambiguous state with 4 explicit steps, each with a clear purpose and user action.

| Sub-state | Badge | User action |
|-----------|-------|-------------|
| H·1 PENDING | — | None. Spinner. "Reviewing your estimate…" |
| H·2 SCHEDULED | Blue | None. Shows date/time/rep name. "Add to calendar" secondary CTA. |
| H·3 ACTIVE | Green live dot | Stay on screen. Rep has same plan on screen. |
| H·4 COMPLETED | — | Tap "Continue to Financing →" |

**Branding progression:**
- H·PENDING: Westhaven only
- H·SCHEDULED: Westhaven + rep name
- H·ACTIVE: GreenLyne becomes visible
- H·COMPLETED: GreenLyne + OWNING co-brand introduced

**H·4 exit:** Navigates to `/financing` passing state: `{ address, billRange, estimate, source }`.

---

## 3. Viewport Behavior

| Source | Viewport |
|--------|----------|
| `source=qr` | 390px mobile, centered |
| `source=email` | Full desktop width |

Detect from URL param on mount, store in component state. All SmartPOS states respect this setting.

---

## 4. Financing Form — Reframe (`/financing`)

The existing `OfferLanding.jsx` is repositioned downstream. Form fields, 4-step structure, and animations are **unchanged**. Only copy and framing are updated.

**Changes:**

| Element | Before | After |
|---------|--------|-------|
| Continuation banner | None | New banner: "Plan confirmed · 1482 Sunridge Drive · Solar payment $1,260/mo · Save $140/mo" |
| Page heading | "Confirm Your Pre-Configured Offer" | "Let's finalize your plan" |
| Step label | "Step 1 of 4" | "Step 1 of 4 — Set up your plan" |
| Sub-headings | Qualification framing | Confirmation framing (see below) |
| Submit CTA | "Submit & Check Eligibility" | "Submit & Finalize My Plan" |

**Sub-heading tone shifts:**
- "We're checking if you qualify" → "Let's confirm your property details"
- "Confirm your identity" → "A few details about you"
- "Your financial snapshot" → "Your financial picture"

**Branding:**
- Header: Westhaven logo + GreenLyne badge (equal weight, not "powered by")
- OWNING lender co-brand stays in Review step only
- Pre-filled fields from SmartPOS state (address, name, city)

---

## 5. POSDemo — Closing States

Replace the current ambiguous `CLOSING_PREP` / `ENOTARY_WAIT` / `SIGN_CLOSING` states with 5 explicit sub-states. Each state defines exactly what is happening and what the user should do.

| State | Badge | Purpose | User action |
|-------|-------|---------|-------------|
| C·1 DOCUMENTS_PREPARING | Locked | Docs being generated (1–2 business days) | None |
| C·2 READY_TO_SCHEDULE | Action needed | Documents ready, CTA unlocks | Schedule notary appointment |
| C·3 NOTARY_SCHEDULED | Waiting | Shows date/time/notary name | None. "Add to calendar" secondary. |
| C·4 SIGNING_IN_PROGRESS | Live | eNotary or in-person session active | Sign documents |
| C·5 LOAN_CLOSED | Complete | All docs signed, loan closed | Transitions to FUNDED state |

C·5 copy: "Your solar installation is being scheduled with Westhaven."

---

## 6. Routing Changes

| Route | Before | After |
|-------|--------|-------|
| `/demo` | Does not exist | New: `DemoLauncher.jsx` |
| `/offer` | `OfferLanding.jsx` (financing form) | New: `SmartPOS.jsx` (value-first state machine) |
| `/financing` | Does not exist | `OfferLanding.jsx` (repositioned, copy reframed) |
| `/pos-demo` | Existing POSDemo | Unchanged except closing sub-states |
| `/email` | `EmailPreview.jsx` | Unchanged — CTA already points to `/offer` |

`App.jsx` updates required:
- Add `/demo` route → `DemoLauncher`
- Change `/offer` route → `SmartPOS`
- Add `/financing` route → `OfferLanding`

---

## 7. New Files

| File | Purpose |
|------|---------|
| `src/pages/DemoLauncher.jsx` | Entry chooser for reps |
| `src/pages/SmartPOS.jsx` | Value-first state machine (ESTIMATE → HANDOFF) |

## 8. Modified Files

| File | Changes |
|------|---------|
| `src/App.jsx` | Add /demo and /financing routes, reroute /offer |
| `src/pages/OfferLanding.jsx` | Copy reframe + continuation banner + pre-fill from state |
| `src/pages/POSDemo.jsx` | Clarify closing states (C·1 through C·5) |

---

## 9. Brand Tokens

```js
const C = {
  navy:  '#001660',
  blue:  '#254BCE',
  teal:  '#016163',
  green: '#93DDBA',
  bg:    '#F5F1EE',
}
```

---

## 10. What Does Not Change

- Email preview (`/email`) — unchanged
- PreQualified page (`/pre-qualified`) — unchanged
- POSDemo states before closing — unchanged
- OfferLanding form fields, 4-step structure, animations — unchanged
- All existing brand tokens
