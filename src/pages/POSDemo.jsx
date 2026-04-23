/**
 * Greenlyne POS Flow Demo — State-Machine HELOC Application
 * 16 application states across 7 phases
 */

import { useState, useMemo, useReducer, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { calcLoan, FEE_TIERS, DEFERRED_OPTIONS, formatCurrencyFull } from '../lib/loanCalc'
import ScreenOfferSelectNew from '../components/ScreenOfferSelect'

// ─── State constants ───────────────────────────────────────────────────────────
const S = {
  BASIC_INFO:            'basic_info',
  OFFER_LOADING:         'offer_loading',
  OFFER_SELECT:          'offer_select',
  IDENTITY_CHALLENGE:    'identity_challenge',
  ADDRESS_MISMATCH:      'address_mismatch',
  MORE_INFO:             'more_info',
  LINK_INCOME:           'link_income',
  VERIFY_IDENTITY:       'verify_identity',
  PROPERTY_VERIFY_WAIT:  'property_verify_wait',
  APPRAISAL_WAIT:        'appraisal_wait',
  OPS_REVIEW_WAIT:       'ops_review_wait',
  FINAL_OFFER:           'final_offer',
  DECLINED:              'declined',
  DOCS_PREPARING:        'docs_preparing',
  READY_TO_SCHEDULE:     'ready_to_schedule',
  NOTARY_SCHEDULED:      'notary_scheduled',
  SIGNING_IN_PROGRESS:   'signing_in_progress',
  LOAN_CLOSED:           'loan_closed',
  FUNDED:                'funded',
}

const SIDEBAR_STEPS = [
  { n: 1, label: 'Basic Info',               states: [S.BASIC_INFO] },
  { n: 2, label: 'Select Offer',             states: [S.OFFER_LOADING, S.OFFER_SELECT, S.IDENTITY_CHALLENGE, S.ADDRESS_MISMATCH] },
  { n: 3, label: 'Provide More Info',        states: [S.MORE_INFO] },
  { n: 4, label: 'Link Account to Verify Income Sources', states: [S.LINK_INCOME] },
  { n: 5, label: 'Verify Identity',          states: [S.VERIFY_IDENTITY] },
  { n: 6, label: 'Sign Documents',           states: [S.APPRAISAL_WAIT, S.OPS_REVIEW_WAIT, S.FINAL_OFFER, S.DECLINED, S.DOCS_PREPARING, S.READY_TO_SCHEDULE] },
  { n: 7, label: 'Schedule Notary Session',  states: [S.NOTARY_SCHEDULED, S.SIGNING_IN_PROGRESS, S.LOAN_CLOSED, S.FUNDED] },
]

const STEP_JUMP = {
  1: S.BASIC_INFO,
  2: S.OFFER_SELECT,
  3: S.MORE_INFO,
  4: S.LINK_INCOME,
  5: S.VERIFY_IDENTITY,
  6: S.DOCS_PREPARING,
  7: S.NOTARY_SCHEDULED,
}

const SEED = { projectCost: 45000, maxCredit: 294821, minCredit: 25000, defaultCredit: 131800, defaultWithdraw: 91800 }

const SEED_STEP1 = {
  firstName: 'Alex', middleInitial: '', lastName: 'Rivera',
  dob: '',
  phone: '', email: '',
  marital: '', purpose: '',
  address: '4821 Oakbrook Dr', city: 'San Jose', state: 'CA', zip: '95126',
  propType: '', ownership: '',
  propValue: '', mortgageBalance: '', forSale: false,
  singleFamily: false, goodRoof: false,
  annualIncome: '', incomeSource: '',
  loanAmount: '', projectCost: '',
}

const SEED_STEP3 = {
  ssn: '',
  marital: '', purpose: 'Home improvement',
  propOccupancy: 'Primary residence', hoa: 'No', floodZone: 'No',
  employmentStatus: 'Full-time employed',
  employer: 'Horizon Tech Solutions', yearsEmployed: '6',
  annualIncome: '124000', monthlyExpenses: '3200',
  disclosuresAccepted: false,
  ethnicity: '', race: '', sex: '',
}

const initialState = {
  app: S.BASIC_INFO,
  step1: { ...SEED_STEP1 },
  step2: { creditLimit: SEED.defaultCredit, withdrawNow: SEED.defaultWithdraw, tier: 0, deferredMonths: 0, autopay: true },
  step3: { ...SEED_STEP3 },
  step4: { bankLinked: false, idVerified: false },
  loan: null,
  sim: { offerCheck: 'ok', propertyCheck: 'ok', appraisalRequired: false, opsReview: false, notaryMethod: 'enotary' },
  simOpen: false,
  step2Config: null,  // persists configurator choices during session; cleared on restart
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    case 'NEXT': {
      // Verify Identity routes directly based on sim flags (no loading screen)
      if (state.app === S.VERIFY_IDENTITY) {
        const { propertyCheck, opsReview, appraisalRequired } = state.sim
        if (propertyCheck === 'decline') return { ...state, app: S.DECLINED }
        if (propertyCheck === 'bpo' && appraisalRequired) return { ...state, app: S.APPRAISAL_WAIT }
        return { ...state, app: opsReview ? S.OPS_REVIEW_WAIT : S.FINAL_OFFER }
      }
      const nextMap = {
        [S.BASIC_INFO]:           S.OFFER_LOADING,
        [S.OFFER_SELECT]:         S.MORE_INFO,
        [S.MORE_INFO]:            S.LINK_INCOME,
        [S.LINK_INCOME]:          S.VERIFY_IDENTITY,
        [S.DOCS_PREPARING]:       S.READY_TO_SCHEDULE,
        [S.READY_TO_SCHEDULE]:    S.NOTARY_SCHEDULED,
        [S.NOTARY_SCHEDULED]:     S.SIGNING_IN_PROGRESS,
        [S.SIGNING_IN_PROGRESS]:  S.LOAN_CLOSED,
      }
      const next = nextMap[state.app]
      if (!next) return state
      const updates = {}
      if (action.loan)  updates.loan  = action.loan
      if (action.step2) updates.step2 = action.step2
      return { ...state, app: next, ...updates }
    }
    case 'JUMP_TO':
      return { ...state, app: action.state }
    case 'BACK': {
      const backMap = {
        [S.OFFER_SELECT]:         S.BASIC_INFO,
        [S.IDENTITY_CHALLENGE]:   S.BASIC_INFO,
        [S.ADDRESS_MISMATCH]:     S.BASIC_INFO,
        [S.MORE_INFO]:            S.OFFER_SELECT,
        [S.LINK_INCOME]:     S.MORE_INFO,
        [S.VERIFY_IDENTITY]: S.LINK_INCOME,
        [S.DOCS_PREPARING]:  S.FINAL_OFFER,
      }
      const prev = backMap[state.app]
      return prev ? { ...state, app: prev } : state
    }
    case 'AUTO_ADVANCE': {
      if (state.app === S.OFFER_LOADING) {
        const { offerCheck } = state.sim
        if (offerCheck === 'identity_challenge') return { ...state, app: S.IDENTITY_CHALLENGE }
        if (offerCheck === 'address_mismatch')   return { ...state, app: S.ADDRESS_MISMATCH }
        return { ...state, app: S.OFFER_SELECT }
      }
      if (state.app === S.PROPERTY_VERIFY_WAIT) {
        const { propertyCheck, opsReview, appraisalRequired } = state.sim
        if (propertyCheck === 'decline') return { ...state, app: S.DECLINED }
        if (propertyCheck === 'bpo' && appraisalRequired) return { ...state, app: S.APPRAISAL_WAIT }
        return { ...state, app: opsReview ? S.OPS_REVIEW_WAIT : S.FINAL_OFFER }
      }
      return state
    }
    case 'ACCEPT':           return { ...state, app: S.DOCS_PREPARING }
    case 'DECLINE_OFFER':    return { ...state, app: S.DECLINED }
    case 'ADVANCE_APPRAISAL':return { ...state, app: S.FINAL_OFFER }
    case 'ADVANCE_OPS':      return { ...state, app: S.FINAL_OFFER }
    case 'ADVANCE_NOTARY':   return { ...state, app: S.NOTARY_SCHEDULED }
    case 'NOTARY_ARRIVED':   return { ...state, app: S.SIGNING_IN_PROGRESS }
    case 'SIGN':             return { ...state, app: S.LOAN_CLOSED }
    case 'CLOSE_LOAN':       return { ...state, app: S.FUNDED }
    case 'JUMP_TO': return { ...state, app: action.state }
    case 'SET_STEP1':          return { ...state, step1: { ...state.step1, [action.field]: action.value } }
    case 'SET_STEP3':          return { ...state, step3: { ...state.step3, [action.field]: action.value } }
    case 'SET_SIM':            return { ...state, sim: { ...state.sim, [action.key]: action.value } }
    case 'TOGGLE_SIM':         return { ...state, simOpen: !state.simOpen }
    case 'SAVE_STEP2_CONFIG':  return { ...state, step2Config: action.config }
    case 'RESTART':            return { ...initialState }
    default: return state
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n)  { return '$' + Math.round(n).toLocaleString() }

// ─── UI Primitives ─────────────────────────────────────────────────────────────
function Field({ label, helper, children }) {
  return (
    <div>
      <label className="block font-semibold mb-1" style={{ fontSize: 16, color: '#001660' }}>
        {label}
        {helper && <span className="ml-1.5 font-normal text-gray-400">{helper}</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', readOnly }) {
  return (
    <input
      type={type} value={value}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      placeholder={placeholder} readOnly={readOnly}
      className="w-full rounded-xl px-3.5 py-2.5 outline-none transition-all"
      style={{ fontSize: 18, border: '1px solid rgba(0,22,96,0.15)', background: readOnly ? '#F8F9FC' : '#fff', color: readOnly ? 'rgba(0,22,96,0.5)' : '#001660' }}
      onFocus={e => !readOnly && (e.target.style.borderColor = '#254BCE')}
      onBlur={e => (e.target.style.borderColor = 'rgba(0,22,96,0.15)')}
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-3.5 py-2.5 outline-none appearance-none"
        style={{ fontSize: 18, border: '1px solid rgba(0,22,96,0.15)', background: '#fff', color: '#001660', paddingRight: '2rem', cursor: 'pointer' }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,22,96,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: '#fff', border: '1px solid rgba(0,22,96,0.08)', boxShadow: '0 1px 8px rgba(0,22,96,0.05)' }}>
      {children}
    </div>
  )
}
function CardBody({ children }) { return <div className="px-7 pt-6 pb-[72px]">{children}</div> }
function CardHeader({ title, sub }) {
  return (
    <div className="px-7 py-4 border-b" style={{ borderColor: 'rgba(0,22,96,0.06)' }}>
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{title}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

function NavButtons({ onBack, onNext, nextLabel = 'Continue', disabled = false, showBack = true }) {
  return (
    <div className="flex items-center justify-between pt-2 pb-8">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={onBack} className="px-5 py-2.5 font-semibold rounded-xl border transition-colors"
            style={{ fontSize: 18, borderColor: 'rgba(0,22,96,0.15)', color: '#001660', background: '#fff' }}
            onMouseOver={e => (e.currentTarget.style.background = '#F8F9FC')}
            onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
            ← Back
          </button>
        )}
        <button className="px-5 py-2.5 font-medium rounded-xl border transition-colors"
          style={{ fontSize: 18, borderColor: 'rgba(0,22,96,0.15)', color: 'rgba(0,22,96,0.55)', background: '#fff' }}
          onMouseOver={e => (e.currentTarget.style.background = '#F8F9FC')}
          onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
          Save for later
        </button>
      </div>
      <button onClick={onNext} disabled={disabled}
        className="py-2.5 px-6 font-bold rounded-xl transition-all flex items-center gap-2"
        style={{ fontSize: 18, background: disabled ? 'rgba(0,22,96,0.2)' : '#254BCE', color: '#fff',
          boxShadow: disabled ? 'none' : '0 4px 16px rgba(37,75,206,0.3)', cursor: disabled ? 'not-allowed' : 'pointer' }}
        onMouseOver={e => { if (!disabled) e.currentTarget.style.background = '#1e3fa8' }}
        onMouseOut={e => { if (!disabled) e.currentTarget.style.background = '#254BCE' }}>
        {nextLabel}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  )
}

// Loan configurator sub-components
function RangeSlider({ value, min, max, step = 1000, onChange, formatLabel }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="w-full">
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="loan-slider w-full" style={{ '--fill-pct': `${pct}%` }} />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400">{formatLabel(min)}</span>
        <span className="text-[10px] text-gray-400">{formatLabel(max)}</span>
      </div>
    </div>
  )
}

function CreditBar({ withdrawNow, creditLimit }) {
  const nowPct = creditLimit > 0 ? Math.round((withdrawNow / creditLimit) * 100) : 0
  const laterPct = 100 - nowPct
  return (
    <div className="mt-3">
      <div className="h-7 rounded-lg overflow-hidden flex" style={{ background: 'rgba(0,22,96,0.07)' }}>
        <div className="h-full flex items-center justify-center transition-all duration-200"
          style={{ width: `${nowPct}%`, background: '#254BCE', minWidth: nowPct > 0 ? 4 : 0 }}>
          {nowPct > 12 && <span className="text-[10px] font-bold text-white whitespace-nowrap px-1.5">{formatCurrencyFull(withdrawNow)}</span>}
        </div>
        <div className="h-full flex items-center justify-center" style={{ width: `${laterPct}%` }}>
          {laterPct > 12 && <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap px-1.5">+{formatCurrencyFull(creditLimit - withdrawNow)}</span>}
        </div>
      </div>
      <div className="flex gap-3 mt-1.5">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ background: '#254BCE' }} /><span className="text-[10px] text-gray-400">Withdraw now</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ background: 'rgba(0,22,96,0.12)' }} /><span className="text-[10px] text-gray-400">Available later</span></div>
      </div>
    </div>
  )
}

// ─── Brand bar ─────────────────────────────────────────────────────────────────
function BrandBar({ onRestart, onToggleSim, onViewEmail }) {
  return (
    <div className="border-b px-6 shrink-0" style={{ background: '#fff', borderColor: 'rgba(0,22,96,0.08)', height: 56, display: 'flex', alignItems: 'center' }}>
      {/* LEFT — GreenLyne primary */}
      <div style={{ flex: 1 }}>
        <img src="/greenlyne-logo.svg" alt="GreenLyne" style={{ height: 22, width: 'auto', objectFit: 'contain' }} />
      </div>

      {/* RIGHT — two labeled partner blocks */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>

        {/* Block 1 — Project by Westhaven Power */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 20, marginRight: 20, borderRight: '1px solid rgba(0,22,96,0.1)' }}>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, whiteSpace: 'nowrap', lineHeight: 1.3 }}>
            Project by
          </span>
          <img src="/westhaven-icon.png" alt="Westhaven Power" style={{ height: 19, width: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Block 2 — Financing services by Grand Bank */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, whiteSpace: 'nowrap', lineHeight: 1.3, textAlign: 'right' }}>
            Financing services<br/>powered by
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
            <img src="/grand-bank-logo.png" alt="Grand Bank" style={{ height: 16, width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, letterSpacing: '0.01em' }}>NMLS #2611</span>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Step sidebar (7 steps) ────────────────────────────────────────────────────
function StepSidebar({ appState, dispatch }) {
  const currentStep = SIDEBAR_STEPS.find(s => s.states.includes(appState))?.n ?? 1
  const isHidden = appState === S.FUNDED
  if (isHidden) return null
  return (
    <div className="w-56 shrink-0 flex flex-col" style={{ background: '#fff', borderRight: '1px solid rgba(0,22,96,0.08)' }}>
      <div className="px-5 pt-6 pb-4">
        <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(0,22,96,0.35)' }}>Application steps</div>
        <div className="text-[16px] font-bold leading-snug mb-1" style={{ color: '#001660' }}>Application progress</div>
        <div className="text-[13px] leading-relaxed" style={{ color: '#6B7280' }}>Complete the loan process today and get funded in as little as five days.</div>
      </div>
      <nav className="flex flex-col px-3 gap-0.5 flex-1">
        {SIDEBAR_STEPS.map((s, i) => {
          const done   = s.n < currentStep
          const active = s.n === currentStep
          const future = s.n > currentStep
          return (
            <div key={s.n} className="flex flex-col">
              <div
                onClick={() => !active && dispatch({ type: 'JUMP_TO', state: STEP_JUMP[s.n] })}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all"
                style={{ background: active ? 'rgba(37,75,206,0.07)' : 'transparent', cursor: active ? 'default' : 'pointer' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,22,96,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(37,75,206,0.07)' : 'transparent' }}>
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold"
                  style={{ background: done ? '#10B981' : active ? '#254BCE' : 'rgba(0,22,96,0.08)', color: (done || active) ? '#fff' : 'rgba(0,22,96,0.3)' }}>
                  {done
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : s.n}
                </div>
                <div>
                  <div className="text-[14px] leading-snug"
                    style={{ fontWeight: active ? 700 : 500, color: active ? '#001660' : done ? '#6B7280' : 'rgba(0,22,96,0.3)' }}>
                    {s.label}
                  </div>
                </div>
              </div>
              {i < SIDEBAR_STEPS.length - 1 && (
                <div className="ml-6 w-px h-3" style={{ background: done ? '#10B981' : 'rgba(0,22,96,0.08)' }} />
              )}
            </div>
          )
        })}
      </nav>
      <div className="px-4 py-4 mt-auto border-t" style={{ borderColor: 'rgba(0,22,96,0.08)' }}>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIM' })}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-colors"
          style={{ background: 'rgba(37,75,206,0.07)', color: '#254BCE', border: '1px solid rgba(37,75,206,0.15)' }}
          onMouseOver={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.13)')}
          onMouseOut={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.07)')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          Sim Controls
        </button>
      </div>
    </div>
  )
}

// ─── Sim Panel ────────────────────────────────────────────────────────────────
function SimPanel({ sim, appState, dispatch }) {
  const isWaitingAppraisal = appState === S.APPRAISAL_WAIT
  const isWaitingOps       = appState === S.OPS_REVIEW_WAIT
  const isWaitingNotary    = appState === S.NOTARY_SCHEDULED || appState === S.SIGNING_IN_PROGRESS

  return (
    <div className="fixed bottom-5 right-5 z-50 w-72 rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid rgba(37,75,206,0.2)', boxShadow: '0 8px 32px rgba(37,75,206,0.18)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#001660' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
        <span className="text-xs font-bold text-white">Simulation Controls</span>
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>Demo only</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Pre-offer check outcome */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Pre-offer check outcome</div>
          <div className="grid grid-cols-3 gap-1">
            {[{v:'ok',l:'Happy path'},{v:'identity_challenge',l:'ID challenge'},{v:'address_mismatch',l:'Addr mismatch'}].map(o => (
              <button key={o.v} onClick={() => dispatch({ type: 'SET_SIM', key: 'offerCheck', value: o.v })}
                className="py-1.5 text-[11px] font-semibold rounded-lg border transition-all"
                style={{ borderColor: sim.offerCheck === o.v ? '#254BCE' : 'rgba(0,22,96,0.12)',
                  background: sim.offerCheck === o.v ? 'rgba(37,75,206,0.08)' : '#fff',
                  color: sim.offerCheck === o.v ? '#254BCE' : 'rgba(0,22,96,0.5)' }}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* Property check outcome */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Property verification outcome</div>
          <div className="grid grid-cols-3 gap-1">
            {[{v:'ok',l:'Pass'},{v:'bpo',l:'BPO'},{v:'decline',l:'Decline'}].map(o => (
              <button key={o.v} onClick={() => dispatch({ type: 'SET_SIM', key: 'propertyCheck', value: o.v })}
                className="py-1.5 text-[11px] font-semibold rounded-lg border transition-all"
                style={{ borderColor: sim.propertyCheck === o.v ? '#254BCE' : 'rgba(0,22,96,0.12)',
                  background: sim.propertyCheck === o.v ? 'rgba(37,75,206,0.08)' : '#fff',
                  color: sim.propertyCheck === o.v ? '#254BCE' : 'rgba(0,22,96,0.5)' }}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* Appraisal required */}
        <SimToggle label="Require appraisal (BPO path)"
          value={sim.appraisalRequired}
          onChange={v => dispatch({ type: 'SET_SIM', key: 'appraisalRequired', value: v })} />

        {/* OPS review */}
        <SimToggle label="Route through OPS review"
          value={sim.opsReview}
          onChange={v => dispatch({ type: 'SET_SIM', key: 'opsReview', value: v })} />

        {/* Notary method */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Notary method</div>
          <div className="grid grid-cols-2 gap-1">
            {[{v:'enotary',l:'eNotary'},{v:'manual',l:'Manual'}].map(o => (
              <button key={o.v} onClick={() => dispatch({ type: 'SET_SIM', key: 'notaryMethod', value: o.v })}
                className="py-1.5 text-[11px] font-semibold rounded-lg border transition-all"
                style={{ borderColor: sim.notaryMethod === o.v ? '#254BCE' : 'rgba(0,22,96,0.12)',
                  background: sim.notaryMethod === o.v ? 'rgba(37,75,206,0.08)' : '#fff',
                  color: sim.notaryMethod === o.v ? '#254BCE' : 'rgba(0,22,96,0.5)' }}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* Context actions */}
        {(isWaitingAppraisal || isWaitingOps || isWaitingNotary) && (
          <div className="pt-1 border-t border-gray-100">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Advance this state</div>
            {isWaitingAppraisal && (
              <button onClick={() => dispatch({ type: 'ADVANCE_APPRAISAL' })}
                className="w-full py-2 text-[12px] font-bold rounded-xl transition-colors"
                style={{ background: '#254BCE', color: '#fff' }}>
                Mark appraisal complete →
              </button>
            )}
            {isWaitingOps && (
              <button onClick={() => dispatch({ type: 'ADVANCE_OPS' })}
                className="w-full py-2 text-[12px] font-bold rounded-xl transition-colors"
                style={{ background: '#254BCE', color: '#fff' }}>
                Approve application →
              </button>
            )}
            {isWaitingNotary && (
              <button onClick={() => dispatch({ type: appState === S.NOTARY_SCHEDULED ? 'NOTARY_ARRIVED' : 'ADVANCE_NOTARY' })}
                className="w-full py-2 text-[12px] font-bold rounded-xl transition-colors"
                style={{ background: '#254BCE', color: '#fff' }}>
                {appState === S.NOTARY_SCHEDULED ? 'Session starting →' : appState === S.SIGNING_IN_PROGRESS ? 'Signing complete →' : 'Advance state →'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SimToggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-[11px] text-gray-600">{label}</span>
      <button onClick={() => onChange(!value)}
        className="relative shrink-0 w-9 h-5 rounded-full transition-colors"
        style={{ background: value ? '#254BCE' : 'rgba(0,22,96,0.15)' }}>
        <span className="absolute top-0.5 transition-all"
          style={{ left: value ? 'calc(100% - 18px)' : '2px', width: 16, height: 16, background: '#fff', borderRadius: '50%', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </label>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared completed-tile card used in all review screens
// ─────────────────────────────────────────────────────────────────────────────
function ReviewCheckCard({ label, rows, onEdit }) {
  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid rgba(1,97,99,0.25)',
      borderRadius: 14,
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: '#016163',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#001660' }}>
            {label}
          </span>
        </div>
        <button
          onClick={onEdit}
          style={{
            fontSize: 16, fontWeight: 600, color: '#254BCE',
            background: 'rgba(37,75,206,0.06)',
            border: '1px solid rgba(37,75,206,0.15)',
            borderRadius: 20, padding: '5px 16px',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,75,206,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,75,206,0.06)'}
        >
          Edit
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 16, color: '#6B7280', flexShrink: 0 }}>{row.label}</span>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#111827', textAlign: 'right' }}>{row.value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Shared "Review" progress header + heading used across all review screens
function ReviewHeader({ totalSteps, heading, sub }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#001660', letterSpacing: '-0.1px' }}>Review</span>
        <span style={{ fontSize: 16, color: '#9CA3AF' }}>Step {totalSteps} of {totalSteps}</span>
      </div>
      <div style={{ height: 3, background: '#254BCE', borderRadius: 0, marginBottom: 28 }} />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 6px', letterSpacing: '0em' }}>{heading}</h1>
      <p style={{ fontSize: 18, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>{sub}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Review screen — shown after all Basic Info sub-steps complete
// ─────────────────────────────────────────────────────────────────────────────
function BasicInfoReview({ step1, onEdit, onContinue }) {
  const sections = [
    {
      index: 0,
      label: 'Your info',
      rows: [
        { label: 'Name',          value: `${step1.firstName} ${step1.lastName}` },
        { label: 'Date of birth', value: step1.dob || '—' },
      ],
    },
    {
      index: 1,
      label: 'Contact',
      rows: [
        { label: 'Phone', value: step1.phone },
        { label: 'Email', value: step1.email },
      ],
    },
    {
      index: 2,
      label: 'Purpose',
      rows: [
        { label: 'Financing purpose', value: step1.purpose },
      ],
    },
    {
      index: 3,
      label: 'Property Address',
      rows: [
        { label: 'Address', value: [step1.address, step1.city, step1.state, step1.zip].filter(Boolean).join(', ') },
      ],
    },
    {
      index: 4,
      label: 'Property Details',
      rows: [
        { label: 'Property type',  value: step1.propType },
        { label: 'Ownership',      value: step1.ownership },
        { label: 'Est. value',     value: step1.propValue ? `$${Number(step1.propValue).toLocaleString()}` : '—' },
        { label: 'Mortgage bal.',  value: step1.mortgageBalance ? `$${Number(step1.mortgageBalance).toLocaleString()}` : '—' },
      ],
    },
    {
      index: 5,
      label: 'Income & Loan',
      rows: [
        { label: 'Annual income',   value: step1.annualIncome ? `$${Number(step1.annualIncome).toLocaleString()}` : '—' },
        { label: 'Income source',   value: step1.incomeSource || '—' },
        { label: 'Requested loan',  value: step1.loanAmount ? `$${Number(step1.loanAmount).toLocaleString()}` : '—' },
        { label: 'Project cost',    value: step1.projectCost ? `$${Number(step1.projectCost).toLocaleString()}` : '—' },
      ],
    },
  ]

  return (
    <div>
      <ReviewHeader
        totalSteps={6}
        heading="Review your information"
        sub="Everything look right? Edit any section below, then continue."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {sections.map(s => (
          <ReviewCheckCard key={s.index} label={s.label} rows={s.rows} onEdit={() => onEdit(s.index)} />
        ))}
      </div>

      {/* Transition copy — sets expectations before offer screen */}
      <div style={{
        marginBottom: 20, padding: '18px 20px',
        background: 'linear-gradient(135deg, rgba(37,75,206,0.05) 0%, rgba(1,97,99,0.04) 100%)',
        border: '1.5px solid rgba(37,75,206,0.15)', borderRadius: 14,
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#254BCE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#001660', marginBottom: 4 }}>
              We'll now generate your personalized offer
            </div>
            <div style={{ fontSize: 15, color: '#4B5563', lineHeight: 1.6 }}>
              Based on the information you've shared, we'll calculate your approved loan amount and payment options. This takes just a moment — no hard credit pull.
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onContinue}
        style={{
          width: '100%', padding: '15px', borderRadius: 12, border: 'none',
          background: '#001660', color: '#fff',
          fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: '-0.1px',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#00236e'}
        onMouseLeave={e => e.currentTarget.style.background = '#001660'}
      >
        Generate my offer →
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Basic Info (Step 1) — Guided progressive disclosure
// ─────────────────────────────────────────────────────────────────────────────
const BASIC_SECTIONS = [
  { label: 'Personal Info',  screens: [0, 1] },
  { label: 'Property Info',  screens: [2, 3, 4] },
  { label: 'Income & Loan',  screens: [5, 6, 7] },
]

const SCREEN_META = [
  // Section 0 — Personal Info
  { section: 0, heading: "What's your name?",              helper: 'Legal name and date of birth.' },
  { section: 0, heading: 'How can we reach you?',          helper: 'Only used for your application.' },
  // Section 1 — Property Info
  { section: 1, heading: 'Where is the property?',         helper: 'The home used as collateral.' },
  { section: 1, heading: 'Tell us about the property',     helper: 'A few quick details about your home.' },
  { section: 1, heading: 'Property value & mortgage',      helper: 'Estimates are fine — verified later.' },
  // Section 2 — Income & Loan
  { section: 2, heading: "What's your annual income?",     helper: 'Include all sources, pre-tax.' },
  { section: 2, heading: 'How much would you like to borrow?', helper: 'Match it to your solar project.' },
  { section: 2, heading: "What's the primary purpose?",    helper: 'Helps us match you with the right terms.' },
]

// Streamline icon: Real-Estate-Action-House-Wrench
function IconHomeImprovement({ size = 34, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }}>
      <path d="M27 14.333333333333332v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2v-14" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m1 12.333333333333332 13.817333333333332 -10.133333333333333a2 2 0 0 1 2.365333333333333 0l13.817333333333332 10.133333333333333" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m25 2.333333333333333 4 0 0 4" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M18 26.333333333333332v-3.3679999999999994a5.917333333333333 5.917333333333333 0 0 0 3.2586666666666666 -8.466666666666665s-2.7306666666666666 2.7893333333333334 -3.02 3.16a1.8306666666666667 1.8306666666666667 0 0 1 -2.738666666666666 0.17333333333333334h0a1.8306666666666667 1.8306666666666667 0 0 1 0.17333333333333334 -2.737333333333333c0.3706666666666667 -0.29066666666666663 3.16 -3.02 3.16 -3.02a5.8133333333333335 5.8133333333333335 0 0 0 -5.057333333333333 -0.304 5.9719999999999995 5.9719999999999995 0 0 0 0.224 11.2v3.3626666666666662" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
    </svg>
  )
}

// Streamline icon: Monetization-User-Coins
function IconDebtConsolidation({ size = 34, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }}>
      <path d="M4.605333333333333 9.466666666666665a2.966666666666667 2.966666666666667 0 0 0 2.4786666666666664 1.1666666666666665c1.5173333333333332 0 2.749333333333333 -0.9239999999999999 2.749333333333333 -2.064s-1.232 -2.0666666666666664 -2.749333333333333 -2.0666666666666664S4.333333333333333 5.578666666666667 4.333333333333333 4.438666666666666s1.232 -2.0626666666666664 2.7506666666666666 -2.0626666666666664a2.961333333333333 2.961333333333333 0 0 1 2.476 1.1666666666666665" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m7.084 10.628 0 1.3733333333333333" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m7.084 1.0013333333333332 0 1.3746666666666665" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M22.711999999999996 9.458666666666666a2.961333333333333 2.961333333333333 0 0 0 2.477333333333333 1.1666666666666665c1.5186666666666666 0 2.7506666666666666 -0.9239999999999999 2.7506666666666666 -2.0626666666666664s-1.232 -2.0626666666666664 -2.7506666666666666 -2.0626666666666664 -2.749333333333333 -0.9239999999999999 -2.749333333333333 -2.064 1.232 -2.0626666666666664 2.749333333333333 -2.0626666666666664a2.9653333333333336 2.9653333333333336 0 0 1 2.477333333333333 1.1666666666666665" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m25.18933333333333 10.625333333333334 0 1.3746666666666665" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m25.18933333333333 1 0 1.3733333333333333" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m14.072 6 4 0" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M24.09466666666667 31a8.933333333333334 8.933333333333334 0 0 0 -16.046666666666667 0" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M11.333333333333332 15.708a9.142666666666667 9.142666666666667 0 0 0 10.189333333333334 2.048" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M10.572 18.5a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0 -11 0Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
    </svg>
  )
}

// Streamline icon: Project-Home-Shopping
function IconMajorPurchase({ size = 34, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }}>
      <path d="M6 6.709333333333333V16A2 2 0 0 0 8 18h8a2 2 0 0 0 2 -2V6.709333333333333" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M22 10.309333333333333 13.333333333333332 2.513333333333333a2 2 0 0 0 -2.6666666666666665 0L2 10.309333333333333" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m20 8.509333333333332 0 -5.509333333333332" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M1 22h21.27733333333333a2 2 0 0 0 1.9786666666666666 -1.7026666666666666l2.488 -16.594666666666665A2 2 0 0 1 28.72266666666667 2h2.277333333333333" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M3 27.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0 -5 0Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M17 27.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0 -5 0Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
    </svg>
  )
}

// Streamline icon: Wedding-Money-Piggy
function IconEmergencyFunds({ size = 34, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }} fill="none">
      <path stroke={color} strokeLinecap="round" strokeLinejoin="round" d="m24.142666666666663 13.000026666666665 -5.843999999999999 -6.096c-0.5121333333333333 -0.5139066666666666 -0.8501333333333332 -1.1755466666666665 -0.9663999999999999 -1.8917199999999998 -0.11626666666666666 -0.7161733333333333 -0.004933333333333333 -1.45076 0.3184 -2.1002799999999997v0c0.24493333333333334 -0.4900533333333333 0.6029333333333333 -0.9148666666666667 1.0442666666666667 -1.2394399999999999 0.44133333333333336 -0.3245733333333333 0.9535999999999999 -0.5396 1.4944 -0.6273653333333333 0.5408 -0.08776666666666666 1.0946666666666665 -0.045756 1.6159999999999999 0.12256666666666667 0.5213333333333333 0.16831866666666664 0.9953333333333334 0.4581453333333333 1.3826666666666665 0.845572l0.9546666666666666 0.9546666666666666 0.9546666666666666 -0.9546666666666666c0.3873333333333333 -0.38742666666666664 0.8613333333333333 -0.6772533333333333 1.3826666666666665 -0.845572 0.5213333333333333 -0.16832266666666665 1.0752 -0.21033333333333332 1.6159999999999999 -0.12256666666666667 0.5408 0.08776533333333332 1.0530666666666666 0.30279199999999995 1.4944 0.6273653333333333 0.44133333333333336 0.3245733333333333 0.7993333333333333 0.7493866666666666 1.0442666666666667 1.2394399999999999v0c0.32453333333333334 0.6492399999999999 0.43653333333333333 1.3841199999999998 0.32026666666666664 2.100573333333333 -0.11626666666666666 0.7164533333333334 -0.4550666666666666 1.3781733333333333 -0.9682666666666666 1.8914266666666668l-5.843999999999999 6.096Z" strokeWidth={strokeWidth}/>
      <path stroke={color} strokeLinecap="round" strokeLinejoin="round" d="M8.014666666666667 26.938666666666666 7 31" strokeWidth={strokeWidth}/>
      <path stroke={color} strokeLinecap="round" strokeLinejoin="round" d="m21.986666666666665 26.943999999999996 1.0133333333333332 4.055999999999999" strokeWidth={strokeWidth}/>
      <path stroke={color} strokeLinecap="round" strokeLinejoin="round" d="M12.025333333333332 7.354666666666667 9.405333333333333 5.172c-0.13774666666666666 -0.11524000000000001 -0.3040133333333333 -0.19119999999999998 -0.48130666666666666 -0.21989333333333333 -0.17728 -0.02868 -0.35902666666666666 -0.009026666666666665 -0.52608 0.05689333333333333s-0.31323999999999996 0.17566666666666667 -0.42316 0.3176933333333333c-0.10993333333333333 0.14201333333333332 -0.17952 0.3110533333333333 -0.20145333333333332 0.4893066666666666l-0.46799999999999997 3.7479999999999998C5.4924 10.93348 4.150773333333333 12.833386666666666 3.466666666666667 15H1v8h3.3200000000000003c1.0893333333333333 1.8562666666666667 2.65216 3.3899999999999997 4.528653333333333 4.444133333333333 1.87648 1.0542666666666665 3.999293333333333 1.5912 6.151346666666666 1.5558666666666667 6.628 0 12 -4.925333333333333 12 -11 0.00039999999999999996 -0.33399999999999996 -0.016133333333333333 -0.6677333333333333 -0.049333333333333326 -1" strokeWidth={strokeWidth}/>
      <path stroke={color} d="M10 14.5c-0.27614666666666665 0 -0.5 -0.22386666666666666 -0.5 -0.5s0.22385333333333335 -0.5 0.5 -0.5" strokeWidth={strokeWidth}/>
      <path stroke={color} d="M10 14.5c0.27614666666666665 0 0.5 -0.22386666666666666 0.5 -0.5s-0.22385333333333335 -0.5 -0.5 -0.5" strokeWidth={strokeWidth}/>
    </svg>
  )
}

// Streamline icon: Earth-1
function IconOther({ size = 34, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }}>
      <path d="M1 16a15 15 0 1 0 30 0 15 15 0 1 0 -30 0" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m6.666666666666666 27.733333333333334 1.3333333333333333 -6.7333333333333325h1.44a1.9733333333333332 1.9733333333333332 0 0 0 1.5733333333333333 -0.7733333333333332 1.92 1.92 0 0 0 0.36 -1.7066666666666666l-1 -4a1.9866666666666666 1.9866666666666666 0 0 0 -1.9333333333333331 -1.5199999999999998H1.3333333333333333" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M28 7h-5.4399999999999995a1.9866666666666666 1.9866666666666666 0 0 0 -1.9333333333333331 1.5199999999999998l-1 4a1.92 1.92 0 0 0 0.37333333333333335 1.7066666666666666 1.9733333333333332 1.9733333333333332 0 0 0 1.5733333333333333 0.7733333333333332h2.1066666666666665l1.04 6.333333333333333A2 2 0 0 0 26.666666666666664 23h2.6666666666666665" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
    </svg>
  )
}

const PURPOSE_OPTIONS = [
  { value: 'Home improvement',    renderIcon: (c) => <IconHomeImprovement color={c} />,   fallbackEmoji: null, desc: 'Renovations, additions, or upgrades' },
  { value: 'Debt consolidation',  renderIcon: (c) => <IconDebtConsolidation color={c} />, fallbackEmoji: null, desc: 'Combine debts into one payment' },
  { value: 'Major purchase',      renderIcon: (c) => <IconMajorPurchase color={c} />,     fallbackEmoji: null, desc: 'Large one-time expense' },
  { value: 'Emergency funds',     renderIcon: (c) => <IconEmergencyFunds color={c} />,    fallbackEmoji: null, desc: 'Safety net or unexpected costs' },
  { value: 'Other',               renderIcon: (c) => <IconOther color={c} />,             fallbackEmoji: null, desc: 'Something else entirely' },
]

// SubStepProgress removed — replaced by inline progress in new ScreenBasicInfo

// Inline field row helper for proportional layouts
function FieldRow({ children, gap = 12 }) {
  return <div style={{ display: 'flex', gap, alignItems: 'flex-start' }}>{children}</div>
}

// Sized input wrapper
function FieldWrap({ flex, minWidth, maxWidth, children }) {
  return (
    <div style={{ flex: flex ?? '1 1 0', minWidth: minWidth ?? 0, maxWidth: maxWidth ?? 'none' }}>
      {children}
    </div>
  )
}

function NarrowInput({ value, onChange, placeholder, maxWidth = 96, center = false }) {
  return (
    <input
      value={value}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      style={{
        width: maxWidth, maxWidth,
        textAlign: center ? 'center' : 'left',
        border: '1px solid rgba(0,22,96,0.15)',
        borderRadius: 10, padding: '10px 12px',
        fontSize: 18, outline: 'none', background: '#fff', color: '#001660',
        letterSpacing: center ? '0.15em' : 0,
      }}
      onFocus={e => (e.target.style.borderColor = '#254BCE')}
      onBlur={e => (e.target.style.borderColor = 'rgba(0,22,96,0.15)')}
    />
  )
}

// ─── Step 1 helper components ─────────────────────────────────────────────────

function PrefillBadge({ text = 'Pre-filled' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 6 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>{text}</span>
    </div>
  )
}

function DollarInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#9CA3AF', pointerEvents: 'none' }}>$</span>
      <input
        value={value}
        onChange={onChange ? e => onChange(e.target.value.replace(/\D/g, '')) : undefined}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 18, border: '1px solid rgba(0,22,96,0.15)', borderRadius: 12, background: '#fff', color: '#001660', padding: '12px 14px 12px 30px', outline: 'none' }}
        onFocus={e => (e.target.style.borderColor = '#254BCE')}
        onBlur={e => (e.target.style.borderColor = 'rgba(0,22,96,0.15)')}
      />
    </div>
  )
}

// Streamline icon: Outdoors-Shelter-Home
function IconHouse({ size = 35, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }}>
      <path d="M5 15.799999999999999v13.2a2 2 0 0 0 2 2h6V24a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v7h6a2 2 0 0 0 2 -2v-13.2" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m1 19 15 -12 15 12" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m23 12.599999999999998 0 -11.599999999999998" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M23 1h8v6h-8z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
    </svg>
  )
}

// Streamline icon: Building-House
function IconSecondaryHouse({ size = 35, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }}>
      <path d="m19 23 0 8 -8 0" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m15 27 0 4" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m11 23.8 0 7.2 -8 0 0 -6" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m10 25 5 -6 -9 0 -5 6 9 0z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m21 25 -6 -6" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m15.956 9 7.0440000000000005 -8 -9 0 -7.0440000000000005 8 9 0z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m31 9 -8 -8" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m17 7.814666666666666 0 7.185333333333333" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m29 7 0 18 -4 0" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m9 15 0 -6" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m21 10 0 1" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m25 10 0 1" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m21 15 0 1" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m25 15 0 1" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m25 20 0 1" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
    </svg>
  )
}

// Streamline icon: Real-Estate-Action-House-Dollar
function IconInvestment({ size = 35, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }}>
      <path d="M11 26.333333333333332h-4a2 2 0 0 1 -2 -2v-10" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m1 12.333333333333332 11.708 -9.906666666666666a2 2 0 0 1 2.5839999999999996 0l9.705333333333332 8.212" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m21 2.333333333333333 4 0 0 4" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M25 18.333333333333332h-2.7106666666666666a1.7893333333333334 1.7893333333333334 0 0 0 -0.6666666666666666 3.4493333333333336l2.752 1.1013333333333333a1.7893333333333334 1.7893333333333334 0 0 1 -0.6666666666666666 3.4493333333333336H21" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m23 18.333333333333332 0 -1" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m23 27.333333333333332 0 -1" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M15 22.333333333333332a8 8 0 1 0 16 0 8 8 0 1 0 -16 0Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
    </svg>
  )
}

function PropTypeTiles({ value, onChange }) {
  const opts = [
    { value: 'Primary residence',   renderIcon: (c) => <IconHouse color={c} />,          fallbackEmoji: null },
    { value: 'Secondary residence', renderIcon: (c) => <IconSecondaryHouse color={c} />, fallbackEmoji: null },
    { value: 'Investment property', renderIcon: (c) => <IconInvestment color={c} />,     fallbackEmoji: null },
  ]
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {opts.map(opt => {
        const active = value === opt.value
        const iconColor = active ? '#254BCE' : '#001660'
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            padding: '28px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
            background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC',
            border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
          }}>
            <span style={{ fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 35 }}>
              {opt.renderIcon ? opt.renderIcon(iconColor) : opt.fallbackEmoji}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#254BCE' : '#001660', lineHeight: 1.3 }}>{opt.value}</span>
          </button>
        )
      })}
    </div>
  )
}

// Streamline icon: Single-Neutral
function IconSingleOwner({ size = 35, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }}>
      <path d="M12 5a4 4 0 1 0 8 0 4 4 0 1 0 -8 0Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M23 18a7 7 0 0 0 -14 0v3H12l1 10h6l1 -10h3Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
    </svg>
  )
}

// Streamline icon: Multiple-Neutral-1
function IconJointOwner({ size = 35, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }}>
      <path d="M4 5a4 4 0 1 0 8 0 4 4 0 1 0 -8 0Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M15 18a7 7 0 0 0 -14 0v3H4l1 10h6l1 -10h3Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M20 5a4 4 0 1 0 8 0 4 4 0 1 0 -8 0Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M18 21H20l1 10h6l1 -10h3V18a7 7 0 0 0 -13 -3.6" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
    </svg>
  )
}

// Streamline icon: Saving-Bank
function IconTrust({ size = 35, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" height={size} width={size} style={{ display: 'block' }}>
      <path d="m2 31 28 0" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="M30 11h-28l12.918666666666667 -7.682666666666666a2 2 0 0 1 2.1626666666666665 0Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m28 15 0 12 -4 0 0 -12" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m18 15 0 12 -4 0 0 -12" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
      <path d="m8 15 0 12 -4 0 0 -12" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}/>
    </svg>
  )
}

function OwnershipTiles({ value, onChange }) {
  const opts = [
    { value: 'Sole owner',      renderIcon: (c) => <IconSingleOwner color={c} />, fallbackEmoji: null },
    { value: 'Joint ownership', renderIcon: (c) => <IconJointOwner color={c} />,  fallbackEmoji: null },
    { value: 'Trust',           renderIcon: (c) => <IconTrust color={c} />,       fallbackEmoji: null },
  ]
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {opts.map(opt => {
        const active = value === opt.value
        const iconColor = active ? '#254BCE' : '#001660'
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            padding: '28px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
            background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC',
            border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
          }}>
            <span style={{ fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 35 }}>
              {opt.renderIcon ? opt.renderIcon(iconColor) : opt.fallbackEmoji}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#254BCE' : '#001660', lineHeight: 1.3 }}>{opt.value}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main guided ScreenBasicInfo ──────────────────────────────────────────────

function ScreenBasicInfo({ step1, dispatch }) {
  const [screenIdx, setScreenIdx] = useState(0)
  const [animDir,   setAnimDir]   = useState('fwd')
  const set = (field, value) => dispatch({ type: 'SET_STEP1', field, value })

  const meta        = SCREEN_META[screenIdx]
  const sectionIdx  = meta.section
  const section     = BASIC_SECTIONS[sectionIdx]
  const screenInSec = section.screens.indexOf(screenIdx)
  const totalInSec  = section.screens.length
  const isLastScreen = screenIdx === SCREEN_META.length - 1

  // Per-screen "can continue" gate
  const canContinue = (() => {
    switch (screenIdx) {
      case 0: return !!step1.firstName && !!step1.lastName       // DOB optional
      case 1: return !!step1.phone && !!step1.email
      case 2: return !!step1.address && !!step1.city
      case 3: return !!step1.propType && !!step1.ownership
      case 4: return !!step1.propValue && !!step1.mortgageBalance
      case 5: return !!step1.annualIncome && !!step1.incomeSource
      case 6: return !!step1.loanAmount && Number(step1.loanAmount) >= 25000
      case 7: return !!step1.purpose
      default: return false
    }
  })()

  function goNext() {
    if (isLastScreen) { dispatch({ type: 'NEXT' }); return }
    setAnimDir('fwd')
    setScreenIdx(i => i + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    if (screenIdx === 0) { dispatch({ type: 'BACK' }); return }
    setAnimDir('back')
    setScreenIdx(i => i - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <style>{`
        @keyframes slideInFwd  { from { opacity:0; transform:translateX(28px);  } to { opacity:1; transform:none; } }
        @keyframes slideInBack { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:none; } }
        .anim-fwd  { animation: slideInFwd  0.28s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-back { animation: slideInBack 0.28s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* ── Unified progress header ─────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {section.label}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>
            {screenIdx + 1} <span style={{ color: '#CBD5E1' }}>/ {SCREEN_META.length}</span>
          </span>
        </div>

        {/* Segmented bar — one pip per screen, grouped by section */}
        <div style={{ display: 'flex', gap: 4 }}>
          {SCREEN_META.map((m, i) => {
            const done    = i < screenIdx
            const current = i === screenIdx
            const sameSec = m.section === sectionIdx
            return (
              <div key={i} style={{ flex: 1, position: 'relative' }}>
                <div style={{
                  height: current ? 5 : 3,
                  marginTop: current ? 0 : 1,
                  borderRadius: 3,
                  background: done || current
                    ? '#254BCE'
                    : sameSec
                      ? 'rgba(37,75,206,0.18)'
                      : 'rgba(15,23,42,0.08)',
                  transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Animated question area ───────────────────────────────── */}
      <div key={`${screenIdx}-${animDir}`} className={animDir === 'fwd' ? 'anim-fwd' : 'anim-back'} style={{ marginBottom: 36 }}>

        {/* Heading + helper */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
          {meta.heading}
        </h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.55 }}>
          {meta.helper}
        </p>

        {/* ── Screen 0: Name + DOB ────────────────────────────────── */}
        {screenIdx === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FieldRow gap={12}>
              <FieldWrap flex="2 1 0"><Field label="First name"><Input value={step1.firstName} onChange={v => set('firstName', v)} /></Field></FieldWrap>
              <FieldWrap maxWidth={96}><Field label="Mid. initial"><Input value={step1.middleInitial || ''} onChange={v => set('middleInitial', v.slice(0, 1).toUpperCase())} placeholder="A" /></Field></FieldWrap>
              <FieldWrap flex="2 1 0"><Field label="Last name"><Input value={step1.lastName} onChange={v => set('lastName', v)} /></Field></FieldWrap>
            </FieldRow>
            <FieldWrap maxWidth={168}>
              <Field label="Date of birth" helper="optional">
                <Input value={step1.dob} onChange={v => set('dob', v)} placeholder="MM/DD/YYYY" />
              </Field>
            </FieldWrap>
          </div>
        )}

        {/* ── Screen 1: Contact ───────────────────────────────────── */}
        {screenIdx === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ maxWidth: 168 }}>
              <Field label="Phone number">
                <Input value={step1.phone} onChange={v => set('phone', v)} placeholder="(___) ___-____" />
              </Field>
            </div>
            <Field label="Email address">
              <Input value={step1.email} onChange={v => set('email', v)} />
            </Field>
          </div>
        )}

        {/* ── Screen 2: Property Address ──────────────────────────── */}
        {screenIdx === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Street address">
              <Input value={step1.address} onChange={v => set('address', v)} placeholder="123 Main St" />
            </Field>
            <FieldRow gap={10}>
              <FieldWrap flex="2 1 0"><Field label="City"><Input value={step1.city} onChange={v => set('city', v)} /></Field></FieldWrap>
              <FieldWrap maxWidth={76}><Field label="State"><Input value={step1.state} onChange={v => set('state', v.toUpperCase().slice(0, 2))} placeholder="CA" /></Field></FieldWrap>
              <FieldWrap maxWidth={108}><Field label="ZIP"><Input value={step1.zip} onChange={v => set('zip', v.replace(/\D/g, '').slice(0, 5))} /></Field></FieldWrap>
            </FieldRow>
          </div>
        )}

        {/* ── Screen 3: Property Type + Ownership + Home condition ─── */}
        {screenIdx === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Property type</div>
              <PropTypeTiles value={step1.propType} onChange={v => set('propType', v)} />
            </div>
            <div style={{ height: 1, background: 'rgba(0,22,96,0.06)' }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Ownership</div>
              <OwnershipTiles value={step1.ownership} onChange={v => set('ownership', v)} />
            </div>
            <div style={{ height: 1, background: 'rgba(0,22,96,0.06)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'singleFamily', locked: false, title: 'Single-family home', desc: 'The property is a standalone residential home.' },
                { key: 'goodRoof',     locked: false, title: 'Good roof condition', desc: 'The roof is in good condition with no known issues.' },
              ].map(({ key, locked, title, desc }) => {
                const checked = !!step1[key]
                return (
                  <button
                    key={key}
                    onClick={() => !locked && set(key, !checked)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '14px 16px', borderRadius: 14, width: '100%', textAlign: 'left',
                      cursor: locked ? 'default' : 'pointer',
                      background: checked ? 'rgba(37,75,206,0.06)' : '#F8F9FC',
                      border: `1.5px solid ${checked ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                      background: checked ? '#254BCE' : '#fff',
                      border: `2px solid ${checked ? '#254BCE' : 'rgba(0,22,96,0.18)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                      boxShadow: checked ? '0 1px 4px rgba(37,75,206,0.25)' : 'none',
                    }}>
                      {checked && (
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                          <path d="M1.5 5L4.5 8L10.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    {/* Text */}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: checked ? '#254BCE' : '#001660', lineHeight: 1.3 }}>{title}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Screen 4: Property Value + Mortgage + For Sale ──────── */}
        {screenIdx === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <FieldRow gap={12}>
              <FieldWrap flex="1 1 0">
                <Field label="Estimated property value">
                  <DollarInput value={step1.propValue} onChange={v => set('propValue', v)} placeholder="485,000" />
                </Field>
              </FieldWrap>
              <FieldWrap flex="1 1 0">
                <Field label="Current mortgage balance">
                  <DollarInput value={step1.mortgageBalance} onChange={v => set('mortgageBalance', v)} placeholder="190,000" />
                </Field>
              </FieldWrap>
            </FieldRow>
            <div style={{ height: 1, background: 'rgba(0,22,96,0.06)' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#001660', marginBottom: 10 }}>Is this property currently for sale?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => {
                  const active = step1.forSale === opt.value
                  return (
                    <button key={opt.label} onClick={() => set('forSale', opt.value)} style={{
                      flex: 1, padding: '13px 0', borderRadius: 12, cursor: 'pointer',
                      fontSize: 16, fontWeight: 600, transition: 'all 0.15s',
                      background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC',
                      border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                      color: active ? '#254BCE' : '#001660',
                    }}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {step1.forSale && (
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '10px 0 0', lineHeight: 1.5 }}>
                  Properties listed for sale may affect your eligibility. A loan officer will review your application.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Screen 5: Income ────────────────────────────────────── */}
        {screenIdx === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FieldWrap maxWidth={280}>
              <Field label="Annual income (pre-tax)">
                <DollarInput value={step1.annualIncome} onChange={v => set('annualIncome', v)} placeholder="124,000" />
              </Field>
            </FieldWrap>
            <FieldWrap maxWidth={280}>
              <Field label="Primary income source">
                <Select value={step1.incomeSource || ''} onChange={v => set('incomeSource', v)}
                  options={[{ value: '', label: 'Select income source…' }, 'Employment', 'Self-employment', 'Retirement / pension', 'Social Security', 'Rental income', 'Other']} />
              </Field>
            </FieldWrap>
          </div>
        )}

        {/* ── Screen 6: Loan Amount ────────────────────────────────── */}
        {screenIdx === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FieldRow gap={12}>
              <FieldWrap flex="1 1 0">
                <Field label="Requested loan amount">
                  <DollarInput value={step1.loanAmount} onChange={v => set('loanAmount', v)} placeholder="120,000" />
                </Field>
              </FieldWrap>
              <FieldWrap flex="1 1 0">
                <Field label="Estimated project cost" helper="optional">
                  <DollarInput value={step1.projectCost || ''} onChange={v => set('projectCost', v)} placeholder="96,000" />
                </Field>
              </FieldWrap>
            </FieldRow>
            {step1.loanAmount && Number(step1.loanAmount) < 25000 && (
              <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 13, color: '#B91C1C', fontWeight: 500 }}>
                Minimum loan amount is $25,000.
              </div>
            )}
          </div>
        )}

        {/* ── Screen 7: Purpose ────────────────────────────────────── */}
        {screenIdx === 7 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PURPOSE_OPTIONS.map(opt => {
              const active = step1.purpose === opt.value
              const iconColor = active ? '#254BCE' : '#001660'
              return (
                <button key={opt.value} onClick={() => set('purpose', opt.value)} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
                  background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC',
                  border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                }}>
                  <div style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {opt.renderIcon ? opt.renderIcon(iconColor) : opt.fallbackEmoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 600, color: active ? '#254BCE' : '#001660' }}>{opt.value}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: screenIdx === 0 ? 'flex-end' : 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '1px solid rgba(0,22,96,0.06)' }}>
        {screenIdx > 0 && (
          <button onClick={goBack} style={{
            padding: '11px 20px', borderRadius: 10,
            border: '1.5px solid rgba(0,22,96,0.15)', background: 'none',
            fontSize: 16, fontWeight: 600, color: '#001660',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ← Back
          </button>
        )}
        <button onClick={goNext} disabled={!canContinue} style={{
          padding: '13px 28px', borderRadius: 10, border: 'none',
          background: canContinue ? '#254BCE' : 'rgba(0,22,96,0.15)',
          color: '#fff', fontSize: 17, fontWeight: 700,
          cursor: canContinue ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit', letterSpacing: '-0.1px',
          boxShadow: canContinue ? '0 4px 16px rgba(37,75,206,0.28)' : 'none',
          transition: 'all 0.15s',
        }}>
          {isLastScreen ? 'Generate My Offer →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Offer Select (Step 2) — dual-path loan configurator
// ─────────────────────────────────────────────────────────────────────────────
const TERM_OPTIONS = [
  { years: 30, apr: 7.75 },
  { years: 20, apr: 7.35, popular: true },
  { years: 15, apr: 7.35 },
]

function calcTermPayment(principal, aprPct, years) {
  const r = aprPct / 100 / 12
  const n = years * 12
  if (r === 0) return Math.round(principal / n)
  return Math.round(principal * r / (1 - Math.pow(1 + r, -n)))
}

const ELECTRIC_BILL = 1400
const MONTHLY_INCOME = 124000 / 12
const EXISTING_MONTHLY_DEBT = 3200
const DTI_THRESHOLD = 0.45

function calcDTI(payment) {
  return (EXISTING_MONTHLY_DEBT + payment) / MONTHLY_INCOME
}

function payStartLabel(deferMonths) {
  const d = new Date()
  d.setMonth(d.getMonth() + 1 + deferMonths)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const TERM_DESCRIPTORS = {
  30: { desc: 'Smallest payment, most flexibility each month' },
  20: { desc: 'The sweet spot between savings and payoff speed', popular: true },
  15: { desc: 'Build equity quicker, save on interest over time' },
  10: { desc: 'Highest payment, done the soonest' },
}

const RATE_LABELS = ['Standard rate', 'Lower rate', 'Lowest rate']
const RATE_DESCS  = ['No upfront fee', 'Small fee rolled in', 'Larger fee — lowest rate']

// "Help me decide" goal definitions
const GOALS = [
  { id: 'lowest_payment',  emoji: '💸', label: 'Lowest monthly payment',              desc: 'Keep my monthly obligation as small as possible' },
  { id: 'least_interest',  emoji: '📉', label: 'Pay the least interest overall',       desc: 'Minimize total cost over the life of the loan' },
  { id: 'borrow_least',    emoji: '🎯', label: 'Borrow as little as possible',         desc: 'Only take what I need for the project' },
  { id: 'most_cash',       emoji: '💰', label: 'Take out the most cash',               desc: 'Maximize funds available now and later' },
  { id: 'debt_payoff',     emoji: '🔄', label: 'Pay off existing debts with savings',  desc: 'Roll debts into the loan, lower my net payment' },
  { id: 'delay_payments',  emoji: '⏳', label: 'Delay payments as long as possible',  desc: 'Defer payments while solar savings kick in' },
]

const GOAL_CONFIGS = {
  lowest_payment: {
    creditLimit: SEED.defaultCredit, withdrawNow: 45000,
    termYears: 30, tier: 0, deferredMonths: 12,
    why: [
      '30-year term keeps monthly payments as low as they can go.',
      'Payments pushed back 12 months — your solar savings cover costs while you wait.',
      'Drawing only your project cost means you\'re not paying interest on money you don\'t need.',
    ],
  },
  least_interest: {
    creditLimit: 50000, withdrawNow: 45000,
    termYears: 15, tier: 2, deferredMonths: 0,
    why: [
      '15-year payoff dramatically cuts total interest paid over the life of the loan.',
      'Lowest available rate tier applied — every basis point saved adds up.',
      'No deferral means interest starts at a low balance from day one.',
    ],
  },
  borrow_least: {
    creditLimit: 50000, withdrawNow: 45000,
    termYears: 15, tier: 1, deferredMonths: 0,
    why: [
      'Credit line sized to exactly cover your $45K project — nothing extra.',
      '15-year term balances faster payoff with reasonable payments.',
      'Mid-tier rate gives a small payment reduction without a large fee.',
    ],
  },
  most_cash: {
    creditLimit: SEED.maxCredit, withdrawNow: SEED.maxCredit,
    termYears: 30, tier: 0, deferredMonths: 6,
    why: [
      'Maximum approved credit line of $294,821 opened in full.',
      'Full draw now puts all available funds in your account immediately.',
      '30-year term keeps payments manageable on the larger balance.',
    ],
  },
  debt_payoff: {
    creditLimit: 175000, withdrawNow: 100000,
    termYears: 20, tier: 0, deferredMonths: 0,
    why: [
      'Larger draw rolls high-interest debts into one lower-rate loan.',
      'Eliminating credit card minimums frees up cash each month.',
      '20-year term balances payoff speed with cash flow flexibility.',
    ],
  },
  delay_payments: {
    creditLimit: SEED.defaultCredit, withdrawNow: 91800,
    termYears: 30, tier: 0, deferredMonths: 12,
    why: [
      'Payments deferred 12 months — maximum runway before first bill.',
      '30-year term for the lowest eventual monthly amount.',
      'Solar savings offset interest costs from day one while payments are paused.',
    ],
  },
}

// Recovery debts — for soft decline Option C
const RECOVERY_DEBTS = [
  { id: 'cc1', label: 'Chase Sapphire card', balance: 12800, monthly: 180, rate: 24.9 },
  { id: 'cc2', label: 'Capital One card',    balance: 8400,  monthly: 120, rate: 19.9 },
  { id: 'auto', label: 'Honda Accord loan',  balance: 18200, monthly: 385, rate: 6.9  },
  { id: 'pl',  label: 'SoFi personal loan',  balance: 15000, monthly: 298, rate: 11.5 },
]

// ─── Borrowing Power Panel ────────────────────────────────────────────────────
function BorrowingPowerPanel({ step1, maxCredit }) {
  const propValue   = parseFloat((step1.propValue || '0').replace(/[^0-9]/g, '')) || 485000
  const mortgage    = parseFloat((step1.mortgageBalance || '0').replace(/[^0-9]/g, '')) || 190000
  const equity      = propValue - mortgage
  const equityPct   = Math.round((equity / propValue) * 100)
  const usedPct     = Math.round((mortgage / propValue) * 100)
  const maxPct      = Math.round((maxCredit / propValue) * 100)

  return (
    <div style={{
      background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.09)',
      borderRadius: 14, padding: '14px 16px', marginBottom: 20,
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#001660', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
        Your borrowing power
      </div>

      {/* Equity bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ height: 10, borderRadius: 5, background: 'rgba(0,22,96,0.08)', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${usedPct}%`, background: '#001660', borderRadius: '5px 0 0 5px', transition: 'width 0.4s' }} />
          <div style={{ width: `${maxPct}%`, background: '#254BCE', transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: '#001660', display: 'inline-block' }} /> Mortgage
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: '#254BCE', display: 'inline-block' }} /> This loan
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: 'rgba(0,22,96,0.1)', display: 'inline-block' }} /> Free equity
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Home value',        value: formatCurrencyFull(propValue) },
          { label: 'Mortgage balance',  value: formatCurrencyFull(mortgage) },
          { label: 'Available equity',  value: formatCurrencyFull(equity), note: `${equityPct}% of value` },
          { label: 'Max loan eligible', value: formatCurrencyFull(maxCredit), accent: true },
        ].map(r => (
          <div key={r.label}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: r.accent ? '#254BCE' : '#001660', letterSpacing: '0em' }}>{r.value}</div>
            {r.note && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{r.note}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Soft Decline Recovery ────────────────────────────────────────────────────
function RecoveryOption({ id, icon, title, badge, badgeColor, expandedOption, setExpandedOption, children }) {
  const open = expandedOption === id
  return (
    <div style={{ border: `1.5px solid ${open ? '#254BCE' : 'rgba(0,22,96,0.1)'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      <button onClick={() => setExpandedOption(open ? null : id)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', background: open ? 'rgba(37,75,206,0.03)' : '#fff',
        border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#001660' }}>{title}</div>
          {badge && <div style={{ fontSize: 10, fontWeight: 600, color: badgeColor || '#016163', marginTop: 2 }}>{badge}</div>}
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(0,22,96,0.07)' }}>{children}</div>}
    </div>
  )
}

function SoftDeclineRecovery({ payment, withdrawNow, creditLimit, termYears, tier, deferredMonths,
  onApply, onDismiss }) {
  const currentDTI = calcDTI(payment)
  const [spouseIncome, setSpouseIncome] = useState('')
  const [selectedDebts, setSelectedDebts] = useState([])
  const [coBorrowerName, setCoBorrowerName] = useState('')
  const [expandedOption, setExpandedOption] = useState(null)

  // Option A: co-borrower income
  const addedIncome = parseFloat(spouseIncome.replace(/[^0-9]/g, '')) || 0
  const coBorrowerDTI = addedIncome > 0
    ? (EXISTING_MONTHLY_DEBT + payment) / (MONTHLY_INCOME + addedIncome / 12)
    : null

  // Option B: switch primary (fixed improvement for demo)
  const spouseDTI = 0.38

  // Option C: debt payoff
  const rolledBalance     = selectedDebts.reduce((s, id) => s + (RECOVERY_DEBTS.find(d => d.id === id)?.balance ?? 0), 0)
  const savedMonthly      = selectedDebts.reduce((s, id) => s + (RECOVERY_DEBTS.find(d => d.id === id)?.monthly ?? 0), 0)
  const newWithdraw       = withdrawNow + rolledBalance
  const newPayment        = calcTermPayment(newWithdraw, TERM_OPTIONS.find(o => o.years === termYears)?.apr ?? 7.75, termYears)
  const newDebt           = EXISTING_MONTHLY_DEBT - savedMonthly + newPayment
  const debtPayoffDTI     = newDebt / MONTHLY_INCOME
  const toggleDebt = id   => setSelectedDebts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  function dtiColor(dti) {
    if (dti <= 0.36) return '#016163'
    if (dti <= 0.43) return '#D97706'
    return '#DC2626'
  }
  function dtiLabel(dti) {
    if (dti <= 0.36) return 'Strong'
    if (dti <= 0.43) return 'Acceptable'
    return 'Too high'
  }
  function approvePct(dti) {
    if (dti <= 0.36) return 92
    if (dti <= 0.40) return 78
    if (dti <= 0.43) return 60
    return 28
  }

  return (
    <div style={{ marginBottom: 20 }}>

      {/* DTI meter */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current DTI</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#DC2626' }}>{Math.round(currentDTI * 100)}% — {dtiLabel(currentDTI)}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '100%', width: `${Math.min(currentDTI * 100, 100)}%`, background: '#DC2626', borderRadius: 4, transition: 'width 0.4s' }} />
          <div style={{ position: 'absolute', top: 0, left: '45%', width: 2, height: '100%', background: '#9CA3AF' }} title="45% limit" />
        </div>
        <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 4 }}>Target: below 45% · Maximum lender threshold</div>
      </div>

      {/* Three recovery options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Option A — co-borrower */}
        <RecoveryOption id="A" icon="👥" title="Add a co-borrower's income"
          badge={coBorrowerDTI ? `Projected DTI: ${Math.round(coBorrowerDTI*100)}% — ${approvePct(coBorrowerDTI)}% approval likelihood` : 'Adds spouse/partner income to your application'}
          badgeColor={coBorrowerDTI ? dtiColor(coBorrowerDTI) : '#016163'}
          expandedOption={expandedOption} setExpandedOption={setExpandedOption}>
          <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#001660', marginBottom: 5 }}>Co-borrower name</div>
              <input value={coBorrowerName} onChange={e => setCoBorrowerName(e.target.value)}
                placeholder="Full legal name"
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 16, border: '1px solid rgba(0,22,96,0.15)', borderRadius: 9, outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#001660', marginBottom: 5 }}>Annual income</div>
              <input value={spouseIncome} onChange={e => setSpouseIncome(e.target.value)}
                placeholder="$0"
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 16, border: '1px solid rgba(0,22,96,0.15)', borderRadius: 9, outline: 'none', fontFamily: 'inherit' }} />
            </div>
            {coBorrowerDTI && (
              <div style={{ background: coBorrowerDTI <= DTI_THRESHOLD ? 'rgba(1,97,99,0.07)' : '#FFF9ED', border: `1px solid ${coBorrowerDTI <= DTI_THRESHOLD ? 'rgba(1,97,99,0.2)' : 'rgba(234,179,8,0.3)'}`, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: dtiColor(coBorrowerDTI), marginBottom: 3 }}>
                  {Math.round(coBorrowerDTI * 100)}% DTI · {approvePct(coBorrowerDTI)}% approval likelihood
                </div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>
                  {coBorrowerDTI <= DTI_THRESHOLD ? '✓ This would meet lender requirements.' : 'Still above threshold — try a higher income.'}
                </div>
              </div>
            )}
            {coBorrowerDTI && coBorrowerDTI <= DTI_THRESHOLD && (
              <button onClick={onDismiss}
                style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 16, fontWeight: 700, background: '#001660', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Done — return to plan →
              </button>
            )}
          </div>
        </RecoveryOption>

        {/* Option B — switch primary */}
        <RecoveryOption id="B" icon="🔄" title="Switch primary applicant to spouse"
          badge={`Projected DTI: ${Math.round(spouseDTI*100)}% — ${approvePct(spouseDTI)}% approval likelihood`}
          expandedOption={expandedOption} setExpandedOption={setExpandedOption}
          badgeColor={dtiColor(spouseDTI)}>
          <div style={{ paddingTop: 14 }}>
            <div style={{ background: 'rgba(1,97,99,0.06)', border: '1px solid rgba(1,97,99,0.18)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#016163', marginBottom: 4 }}>
                Spouse profile (Maria Rivera)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { l: 'Annual income', v: '$148,000' },
                  { l: 'Monthly debts', v: '$1,840' },
                  { l: 'Credit score', v: '748' },
                  { l: 'Projected DTI', v: '38%', accent: true },
                ].map(r => (
                  <div key={r.l}>
                    <div style={{ fontSize: 9, color: '#9CA3AF' }}>{r.l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: r.accent ? '#016163' : '#001660' }}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.55, marginBottom: 12 }}>
              Running the loan in Maria's name brings DTI well below 40%, significantly improving approval odds and potentially qualifying for a better rate.
            </div>
            <button onClick={() => onApply('switch_primary', {})}
              style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 16, fontWeight: 700, background: '#001660', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Re-run eligibility as Maria →
            </button>
          </div>
        </RecoveryOption>

        {/* Option C — debt payoff */}
        <RecoveryOption id="C" icon="💳" title="Roll existing debts into the loan"
          badge={selectedDebts.length > 0 ? `Projected DTI: ${Math.round(debtPayoffDTI*100)}% — saves $${savedMonthly}/mo in minimums` : 'Select debts to roll in and see the net impact'}
          badgeColor={selectedDebts.length > 0 ? dtiColor(debtPayoffDTI) : '#6B7280'}
          expandedOption={expandedOption} setExpandedOption={setExpandedOption}>
          <div style={{ paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.55, marginBottom: 10 }}>
              Pay off high-interest debts by rolling them into your HELOC at {TERM_OPTIONS.find(o => o.years === termYears)?.apr ?? 7.75}% — then your minimums disappear from your DTI calculation.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {RECOVERY_DEBTS.map(debt => {
                const sel = selectedDebts.includes(debt.id)
                return (
                  <button key={debt.id} onClick={() => toggleDebt(debt.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    border: `1.5px solid ${sel ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                    borderRadius: 10, background: sel ? 'rgba(37,75,206,0.04)' : '#fff',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `2px solid ${sel ? '#254BCE' : 'rgba(0,22,96,0.2)'}`, background: sel ? '#254BCE' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sel && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#001660' }}>{debt.label}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{debt.rate}% APR · ${debt.monthly}/mo minimum</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#001660' }}>{formatCurrencyFull(debt.balance)}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {selectedDebts.length > 0 && (
              <div style={{ background: '#F8F9FC', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Before vs. after</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Current DTI', value: `${Math.round(currentDTI*100)}%`, color: '#DC2626' },
                    { label: 'New DTI', value: `${Math.round(debtPayoffDTI*100)}%`, color: dtiColor(debtPayoffDTI) },
                    { label: 'Total draw', value: formatCurrencyFull(newWithdraw), color: '#001660' },
                    { label: 'Monthly saved', value: `$${savedMonthly}/mo`, color: '#016163' },
                  ].map(r => (
                    <div key={r.label} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: r.color }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDebts.length > 0 && (
              <button onClick={() => onApply('debt_payoff', { selectedDebts, newWithdraw })}
                style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 16, fontWeight: 700, background: debtPayoffDTI <= DTI_THRESHOLD ? '#001660' : 'rgba(0,22,96,0.4)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {debtPayoffDTI <= DTI_THRESHOLD ? 'Apply with debt roll-in →' : `DTI still ${Math.round(debtPayoffDTI*100)}% — select more debts`}
              </button>
            )}
          </div>
        </RecoveryOption>
      </div>
    </div>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
function ScreenOfferSelect({ step2, step1, dispatch }) {
  const maxCredit = SEED.maxCredit

  // Sub-steps: 0 = goals, 1 = configure
  const OFFER_SUB_STEPS = [
    { id: 'goals',     label: 'Your Priorities' },
    { id: 'your-plan', label: 'Your Plan' },
  ]
  const [offerSub,     setOfferSub]     = useState(0)
  const [isLoading,    setIsLoading]    = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [aiInput,      setAiInput]      = useState('')

  // Loan params
  const [creditLimit,    setCreditLimit]    = useState(step2.creditLimit)
  const [withdrawNow,    setWithdrawNow]    = useState(step2.withdrawNow)
  const [tier,           setTier]           = useState(step2.tier)
  const [deferredMonths, setDeferredMonths] = useState(step2.deferredMonths)
  const [autopay,        setAutopay]        = useState(step2.autopay)
  const [termYears,      setTermYears]      = useState(30)
  const [customizeOpen,  setCustomizeOpen]  = useState(false)
  const [showDecline,    setShowDecline]    = useState(false)
  const [rolledDebts,      setRolledDebts]      = useState([])
  const [coBorrowerName,   setCoBorrowerName]   = useState('')
  const [coBorrowerIncome, setCoBorrowerIncome] = useState('')
  const [switchedPrimary,  setSwitchedPrimary]  = useState(false)

  // Accordion stepper for configure screen (offerSub === 1)
  const [loanType,          setLoanType]          = useState('heloc') // 'heloc' | 'heloan'
  const [configSub,         setConfigSub]         = useState(0)
  const [configEditingIndex, setConfigEditingIndex] = useState(null)

  // Collapse the recovery panel whenever the user adjusts any loan parameter
  useEffect(() => { setShowDecline(false) }, [withdrawNow, creditLimit, termYears, tier, deferredMonths])

  const safeWithdraw = Math.min(withdrawNow, creditLimit)
  const loan = useMemo(() => calcLoan({ creditLimit, withdrawNow: safeWithdraw, tier, deferredMonths }), [creditLimit, safeWithdraw, tier, deferredMonths])
  const displayApr = autopay ? (parseFloat(loan.apr) - 0.25).toFixed(2) : loan.apr
  const selectedPayment = calcTermPayment(safeWithdraw, TERM_OPTIONS.find(o => o.years === termYears)?.apr ?? 7.75, termYears)
  const savings = ELECTRIC_BILL - selectedPayment
  const dti = calcDTI(selectedPayment)
  const dtiTooHigh = dti > DTI_THRESHOLD

  // Auto-open customize when DTI goes high so user sees the helpful sections
  useEffect(() => { if (dtiTooHigh) setCustomizeOpen(true) }, [dtiTooHigh])
  const coIncomeParsed = parseFloat(coBorrowerIncome.replace(/[^0-9]/g, '')) || 0
  const coBorrowerDTI = coIncomeParsed > 0 ? (EXISTING_MONTHLY_DEBT + selectedPayment) / (MONTHLY_INCOME + coIncomeParsed / 12) : null
  const spouseDTI = 0.38

  function applyGoalConfig(goalId) {
    const cfg = GOAL_CONFIGS[goalId]
    setCreditLimit(cfg.creditLimit)
    setWithdrawNow(cfg.withdrawNow)
    setTermYears(cfg.termYears)
    setTier(cfg.tier)
    setDeferredMonths(cfg.deferredMonths)
  }

  function triggerLoader(goalId) {
    setSelectedGoal(goalId)
    applyGoalConfig(goalId)
    setIsLoading(true)
    setTimeout(() => { setIsLoading(false); setOfferSub(1) }, 2000)
  }

  function handleAiSubmit() {
    const text = (aiInput || '').toLowerCase().trim()
    if (!text) return
    let goalId = 'lowest_payment'
    if (text.includes('interest') || text.includes('cost') || text.includes('cheap')) goalId = 'least_interest'
    else if ((text.includes('borrow') || text.includes('take')) && (text.includes('little') || text.includes('less') || text.includes('minimum'))) goalId = 'borrow_least'
    else if (text.includes('most') || text.includes('max') || text.includes('all the cash')) goalId = 'most_cash'
    else if (text.includes('debt') || text.includes('consolidat') || text.includes('credit card') || text.includes('card')) goalId = 'debt_payoff'
    else if (text.includes('delay') || text.includes('defer') || text.includes('wait') || text.includes('later') || text.includes('pause')) goalId = 'delay_payments'
    setAiInput('')
    triggerLoader(goalId)
  }

  function handleNext() {
    if (dtiTooHigh && !showDecline) { setShowDecline(true); window.scrollTo(0, 0); return }
    const s2 = { creditLimit, withdrawNow: safeWithdraw, tier, deferredMonths, autopay }
    dispatch({ type: 'NEXT', step2: s2, loan: { ...loan, apr: displayApr } })
  }

  function handleRecoveryApply(type, data) {
    if (type === 'debt_payoff' && data.newWithdraw) {
      setWithdrawNow(data.newWithdraw)
      setCreditLimit(Math.max(data.newWithdraw, creditLimit))
    }
    setShowDecline(false)
    dispatch({ type: 'NEXT', step2: { creditLimit, withdrawNow: safeWithdraw, tier, deferredMonths, autopay }, loan: { ...loan, apr: displayApr } })
  }

  // ── Configure accordion helpers ──────────────────────────────────────────
  const CONFIG_STEPS = [
    { id: 'loan-type', label: 'Loan type' },
    { id: 'amounts',   label: 'Credit line & draw' },
    { id: 'timing',    label: 'Payment timing' },
    { id: 'structure', label: 'How your loan works', auto: true },
  ]
  const configTotal   = CONFIG_STEPS.length
  const configAllDone = configSub >= configTotal
  const configActive  = configEditingIndex !== null ? configEditingIndex : configAllDone ? null : configSub

  function getConfigSummary(i) {
    switch (i) {
      case 0: return loanType === 'heloc' ? 'HELOC — flexible line of credit' : 'Home Equity Loan — fixed monthly payments'
      case 1: return `${formatCurrencyFull(creditLimit)} credit line · Draw ${formatCurrencyFull(safeWithdraw)} at closing`
      case 2: return deferredMonths === 0 ? 'Payments start right away' : `Yes — first payment starts in month ${deferredMonths}`
      case 3: return `First ${termYears > 20 ? 10 : 5} years: interest-only draw period`
      default: return '—'
    }
  }

  function configContinue() {
    if (configEditingIndex !== null) { setConfigEditingIndex(null) }
    else { setConfigSub(c => c + 1) }
  }

  // ── Offer progress bar ────────────────────────────────────────────────────
  function OfferProgress({ current }) {
    const total = OFFER_SUB_STEPS.length
    const label = OFFER_SUB_STEPS[current]?.label ?? ''
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#001660', letterSpacing: '-0.1px' }}>{label}</span>
          <span style={{ fontSize: 16, color: '#9CA3AF' }}>Step {current + 1} of {total}</span>
        </div>
        <div style={{ height: 3, background: '#254BCE', borderRadius: 0 }} />
      </div>
    )
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (isLoading) {
    const goalMeta = selectedGoal ? GOALS.find(g => g.id === selectedGoal) : null
    return (
      <div style={{ minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <style>{`
          @keyframes offerSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes offerFadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
          @keyframes offerCheck { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
        `}</style>
        {/* Spinner */}
        <div style={{ position: 'relative', width: 72, height: 72 }}>
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ animation: 'offerSpin 1.1s linear infinite', position: 'absolute', inset: 0 }}>
            <circle cx="36" cy="36" r="30" stroke="rgba(37,75,206,0.1)" strokeWidth="5"/>
            <path d="M36 6 A30 30 0 0 1 66 36" stroke="#254BCE" strokeWidth="5" strokeLinecap="round"/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M10 2c0 4.5-3.5 8-8 8 4.5 0 8 3.5 8 8 0-4.5 3.5-8 8-8-4.5 0-8-3.5-8-8z" fill="#254BCE"/>
            </svg>
          </div>
        </div>
        {/* Message */}
        <div style={{ textAlign: 'center', animation: 'offerFadeUp 0.4s ease both' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#001660', marginBottom: 6, letterSpacing: '0em' }}>
            Calculating your ideal plan…
          </div>
          {goalMeta && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,75,206,0.06)', border: '1px solid rgba(37,75,206,0.15)', borderRadius: 100, padding: '5px 16px' }}>
              <span style={{ fontSize: 18 }}>{goalMeta.emoji}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#254BCE' }}>{goalMeta.label}</span>
            </div>
          )}
        </div>
        {/* Animated check items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 220 }}>
          {[
            { label: 'Analyzing your priority', delay: '0.3s' },
            { label: 'Optimizing loan structure', delay: '0.7s' },
            { label: 'Calculating best rate', delay: '1.1s' },
          ].map(({ label, delay }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, animation: `offerFadeUp 0.35s ease ${delay} both` }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 16, color: '#374151' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Sub-step 0: Goals ─────────────────────────────────────────────────────
  if (offerSub === 0) return (
    <div>
      <OfferProgress current={0} />

      {/* Heading */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 6px', letterSpacing: '0em' }}>
          What matters most to you?
        </h1>
        <p style={{ fontSize: 17, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
          Tell us in your own words, or pick one below — we'll build your ideal plan in seconds.
        </p>
      </div>

      {/* AI text input — bare */}
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <textarea
          value={aiInput}
          onChange={e => setAiInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSubmit() } }}
          placeholder="e.g. I want the lowest monthly payment, but borrow as little as possible…"
          rows={2}
          style={{
            flex: 1, resize: 'none', border: '1.5px solid rgba(0,22,96,0.12)',
            borderRadius: 12, padding: '10px 14px',
            fontSize: 18, color: '#001660', lineHeight: 1.55,
            background: '#F8F9FC', fontFamily: 'inherit', outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = '#254BCE')}
          onBlur={e => (e.target.style.borderColor = 'rgba(0,22,96,0.12)')}
        />
        <button
          onClick={handleAiSubmit}
          disabled={!aiInput.trim()}
          style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: !aiInput.trim() ? '#E5E7EB' : '#254BCE',
            border: 'none', cursor: !aiInput.trim() ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M13 7.5L2 2l2.5 5.5L2 13l11-5.5z"
              fill={!aiInput.trim() ? '#9CA3AF' : '#fff'}
              stroke={!aiInput.trim() ? '#9CA3AF' : '#fff'}
              strokeWidth="0.5" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* "or choose" divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,22,96,0.07)' }} />
        <span style={{ fontSize: 16, color: '#9CA3AF', fontWeight: 500, whiteSpace: 'nowrap' }}>or choose your priority</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,22,96,0.07)' }} />
      </div>

      {/* Goal tiles — 3×2 square grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
        {GOALS.map(g => {
          const active = selectedGoal === g.id
          return (
            <button key={g.id} onClick={() => triggerLoader(g.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              height: 110, padding: '16px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
              background: active ? 'rgba(37,75,206,0.06)' : '#fff',
              border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.12)'}`,
              boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
              transition: 'all 0.15s', outline: 'none',
            }}
              onMouseOver={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(37,75,206,0.3)'; e.currentTarget.style.background = 'rgba(37,75,206,0.02)' } }}
              onMouseOut={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(0,22,96,0.12)'; e.currentTarget.style.background = '#fff' } }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{g.emoji}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: active ? '#254BCE' : '#001660', lineHeight: 1.3, marginBottom: 2 }}>{g.label}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 }}>{g.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Back */}
      <div style={{ paddingTop: 12, borderTop: '1px solid rgba(0,22,96,0.07)' }}>
        <button onClick={() => dispatch({ type: 'BACK' })} style={{ padding: '10px 20px', fontSize: 18, fontWeight: 600, borderRadius: 10, border: '1.5px solid rgba(0,22,96,0.15)', background: 'none', color: '#001660', cursor: 'pointer' }}>
          ← Back
        </button>
      </div>
    </div>
  )

  // ── Sub-step 1: Configure ─────────────────────────────────────────────────
  const goalMeta = selectedGoal ? GOALS.find(g => g.id === selectedGoal) : null
  const goalCfg  = selectedGoal ? GOAL_CONFIGS[selectedGoal] : null

  return (
    <div>
      {/* DTI Recovery Modal */}
      {showDecline && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <div onClick={() => setShowDecline(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,10,40,0.45)', backdropFilter: 'blur(3px)' }} />
          {/* Drawer panel */}
          <div style={{ position: 'relative', width: 480, maxWidth: '95vw', height: '100vh', background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,22,96,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#991B1B', marginBottom: 2 }}>Fix high DTI</div>
                <div style={{ fontSize: 16, color: '#9CA3AF' }}>Choose an option to improve your approval odds</div>
              </div>
              <button onClick={() => setShowDecline(false)} style={{ background: 'rgba(0,22,96,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: '7px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <SoftDeclineRecovery
                payment={selectedPayment} withdrawNow={safeWithdraw}
                creditLimit={creditLimit} termYears={termYears} tier={tier} deferredMonths={deferredMonths}
                onApply={(type, data) => { handleRecoveryApply(type, data); setShowDecline(false) }}
                onDismiss={() => setShowDecline(false)}
              />
            </div>
          </div>
        </div>
      )}
      {/* Step eyebrow */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          Step 2 of 7
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '0em', lineHeight: 1.2 }}>
          Build your loan
        </h1>
        <p style={{ fontSize: 18, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
          Answer each question — your plan summary updates live on the right.
        </p>
      </div>

      {/* Accordion tiles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {CONFIG_STEPS.map((step, index) => {
          if (index > configSub && configEditingIndex !== index) return null
          const isDone   = (index < configSub || configAllDone) && configEditingIndex !== index
          const isActive = index === configActive

          if (isDone) return (
            <div key={step.id + '-done'} style={{
              background: '#fff', border: '1.5px solid rgba(1,97,99,0.25)',
              borderRadius: 14, padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              animation: 'tileSlideIn 0.32s cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: '#016163', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: '#001660', lineHeight: 1.4 }}>
                {getConfigSummary(index)}
              </span>
              {!step.auto && (
                <button onClick={() => setConfigEditingIndex(index)} style={{
                  fontSize: 16, fontWeight: 600, color: '#254BCE',
                  background: 'rgba(37,75,206,0.06)', border: '1px solid rgba(37,75,206,0.15)',
                  borderRadius: 20, padding: '5px 16px', cursor: 'pointer', fontFamily: 'inherit',
                }}>Edit</button>
              )}
            </div>
          )

          if (isActive) return (
            <div key={step.id + '-active'} style={{
              background: '#fff', border: '2px solid rgba(37,75,206,0.3)',
              borderRadius: 14, padding: '20px',
              boxShadow: '0 4px 20px rgba(37,75,206,0.1)',
              animation: 'tileSlideIn 0.32s cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: '#016163', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                  {index + 1}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#001660' }}>{step.label}</div>
              </div>

              {/* Step 0 — Loan type */}
              {index === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { value: 'heloc',  label: 'HELOC', sub: 'Flexible line of credit — draw when you need it, pay interest only on what you use.' },
                    { value: 'heloan', label: 'Home Equity Loan', sub: 'Fixed lump sum — one draw, fixed monthly payments, predictable schedule.' },
                  ].map(opt => {
                    const active = loanType === opt.value
                    return (
                      <button key={opt.value} onClick={() => setLoanType(opt.value)} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px',
                        background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC',
                        border: `2px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                        borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                      }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2, border: `2px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.2)'}`, background: active ? '#254BCE' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: active ? '#254BCE' : '#001660', marginBottom: 3 }}>{opt.label}</div>
                          <div style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.5 }}>{opt.sub}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step 1 — Credit line & draw + term */}
              {index === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <div style={{ fontSize: 17, fontWeight: 600, color: '#001660' }}>Total credit line</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#001660', letterSpacing: '0em' }}>{formatCurrencyFull(creditLimit)}</div>
                    </div>
                    <div style={{ fontSize: 16, color: '#6B7280', marginBottom: 10 }}>Your maximum approved amount. You only pay interest on what you draw.</div>
                    <RangeSlider value={creditLimit} min={SEED.minCredit} max={maxCredit} step={5000} onChange={v => { setCreditLimit(v); if (withdrawNow > v) setWithdrawNow(v) }} formatLabel={v => formatCurrencyFull(v)} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <div style={{ fontSize: 17, fontWeight: 600, color: '#254BCE' }}>Amount to draw at closing</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#254BCE', letterSpacing: '0em' }}>{formatCurrencyFull(safeWithdraw)}</div>
                    </div>
                    <div style={{ fontSize: 16, color: '#6B7280', marginBottom: 10 }}>{formatCurrencyFull(creditLimit - safeWithdraw)} stays in your line — draw it later, no rush.</div>
                    <RangeSlider value={safeWithdraw} min={0} max={creditLimit} step={5000} onChange={v => setWithdrawNow(v)} formatLabel={v => formatCurrencyFull(v)} />
                    <CreditBar withdrawNow={safeWithdraw} creditLimit={creditLimit} />
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: '#001660', marginBottom: 10 }}>Loan term</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {TERM_OPTIONS.map(opt => {
                        const active  = termYears === opt.years
                        const payment = calcTermPayment(safeWithdraw, opt.apr, opt.years)
                        const meta    = TERM_DESCRIPTORS[opt.years] ?? {}
                        return (
                          <button key={opt.years} onClick={() => setTermYears(opt.years)} style={{
                            padding: '12px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                            border: `2px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.12)'}`,
                            background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC', transition: 'all 0.15s',
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: active ? '#254BCE' : '#9CA3AF', marginBottom: 4 }}>{opt.years}-yr · {opt.apr}%</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: active ? '#254BCE' : '#001660', letterSpacing: '0em' }}>{formatCurrencyFull(payment)}<span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>/mo</span></div>
                            {meta.popular && <div style={{ fontSize: 10, color: '#254BCE', fontWeight: 700, marginTop: 4 }}>Most popular</div>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Payment timing */}
              {index === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 17, color: '#6B7280', marginBottom: 4 }}>Delay your first payment while solar savings kick in from day one.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {DEFERRED_OPTIONS.map(opt => {
                      const active = deferredMonths === opt.months
                      return (
                        <button key={opt.months} onClick={() => setDeferredMonths(opt.months)} style={{
                          padding: '14px 4px', borderRadius: 10, textAlign: 'center',
                          border: `2px solid ${active ? '#016163' : 'rgba(0,22,96,0.12)'}`,
                          background: active ? 'rgba(1,97,99,0.06)' : '#F8F9FC',
                          color: active ? '#016163' : '#374151',
                          fontSize: 17, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                          {opt.months === 0 ? 'Right away' : `${opt.months} mo`}
                        </button>
                      )
                    })}
                  </div>
                  {deferredMonths > 0 && <div style={{ fontSize: 16, color: '#016163', fontWeight: 600 }}>First payment due: {payStartLabel(deferredMonths)}</div>}
                  {dtiTooHigh && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#FFF5F5', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10 }}>
                      <span>⚠️</span>
                      <div style={{ flex: 1, fontSize: 16, color: '#991B1B' }}>
                        <strong>High DTI ({Math.round(dti * 100)}%)</strong> — consider deferring payments or reducing the draw amount.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Informational */}
              {index === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 18, color: '#374151', lineHeight: 1.65, margin: 0 }}>
                    For the first {termYears > 20 ? 10 : 5} years, you'll make lower monthly payments that cover interest only. Your loan balance stays about the same during this time.
                  </p>
                  <p style={{ fontSize: 17, color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>
                    After this period, your regular payments begin and you start paying down your loan.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(0,22,96,0.04)', border: '1px solid rgba(0,22,96,0.1)', borderRadius: 100, padding: '6px 14px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>This is part of how your loan works — not a choice you make</span>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={configContinue} style={{
                  padding: '11px 24px', borderRadius: 10, border: 'none',
                  background: '#254BCE', color: '#fff',
                  fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {configEditingIndex !== null ? 'Save →' : index === configTotal - 1 ? 'Done →' : 'Continue →'}
                </button>
              </div>
            </div>
          )

          return null
        })}
      </div>

      {/* Trust badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {['🔒 No obligation', '📋 No hard credit pull yet', '⏱️ Takes 5 minutes'].map(t => (
          <div key={t} style={{ background: '#fff', border: '1px solid rgba(0,22,96,0.1)', borderRadius: 100, padding: '5px 12px', fontSize: 16, fontWeight: 600, color: '#6B7280' }}>{t}</div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 24 }}>
        Estimates are illustrative only. Final terms subject to full underwriting and appraisal. Not a commitment to lend.
      </div>

      {/* Bottom nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(0,22,96,0.07)' }}>
        <button onClick={() => setOfferSub(0)} style={{ padding: '11px 20px', fontSize: 17, fontWeight: 600, borderRadius: 10, border: '1.5px solid rgba(0,22,96,0.15)', background: 'none', color: '#001660', cursor: 'pointer' }}>
          ← Back
        </button>
        {configAllDone && configEditingIndex === null && (
          <button onClick={handleNext} style={{
            padding: '13px 28px', fontSize: 18, fontWeight: 800, borderRadius: 10,
            background: dtiTooHigh ? '#991B1B' : '#001660',
            border: 'none', color: '#fff', cursor: 'pointer', letterSpacing: '-0.1px',
          }}>
            {dtiTooHigh ? '⚠️ Continue anyway →' : 'Confirm your plan →'}
          </button>
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value, sub, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <div>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent ? '#254BCE' : '#001660', flexShrink: 0 }}>{value}</div>
    </div>
  )
}

function TermRow({ label, value, sub, accent, large }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className={large ? 'text-[12px] text-gray-500' : 'text-[11px] text-gray-500'}>{label}</div>
        {sub && <div className={large ? 'text-[11px] text-gray-400 mt-0.5' : 'text-[10px] text-gray-400 mt-0.5'}>{sub}</div>}
      </div>
      <div className={large ? 'text-[17px] font-bold shrink-0' : 'text-[16px] font-bold shrink-0'} style={{ color: accent ? '#254BCE' : '#001660' }}>{value}</div>
    </div>
  )
}

// ─── Persistent offer sidebar (shown on all screens except offer-select & funded)
function OfferSidebar({ loan, step2 }) {
  const tierIdx  = step2?.tier ?? 0
  const tierData = FEE_TIERS[tierIdx]
  const raw = loan ?? calcLoan({
    creditLimit:    step2?.creditLimit    ?? SEED.defaultCredit,
    withdrawNow:    step2?.withdrawNow    ?? SEED.defaultWithdraw,
    tier:           tierIdx,
    deferredMonths: step2?.deferredMonths ?? 0,
  })

  const autopay    = step2?.autopay ?? true
  const apr        = autopay ? (parseFloat(raw.apr) - 0.25).toFixed(2) : raw.apr
  const deferMo    = raw.deferredMonths ?? 0
  const ioYrs      = loan?.ioYears ?? 0
  const redPct     = loan?.redPct ?? 0
  const redMonths  = loan?.redMonths ?? 0
  const productType = loan?.productType ?? 'heloc'

  // Compute accrued interest for deferred period
  const rate       = tierData.rate
  const origFee    = raw.originationFee ?? 0
  const enhPrinc   = raw.withdrawNow + origFee
  const accrued    = deferMo > 0 ? Math.round(enhPrinc * (rate / 100 / 12) * deferMo) : 0
  const newPrinc   = enhPrinc + accrued

  // Hero balance: show what borrower will actually start paying off
  const heroAmount = accrued > 0 ? newPrinc : raw.withdrawNow

  // Build narrative timeline
  const timeline = []
  let seq = 0
  function tLabel(duration) {
    const prefix = seq === 0 ? 'First' : seq === 1 ? 'Next' : seq === 2 ? 'Then' : 'After that'
    seq++
    return duration ? `${prefix} ${duration}` : prefix
  }

  if (deferMo > 0) {
    timeline.push({
      label: tLabel(`${deferMo} months`),
      payment: 0,
      note: 'No payments due',
      sub: `+${formatCurrencyFull(accrued)} added to your balance`,
    })
  }
  if (ioYrs > 0) {
    timeline.push({
      label: tLabel(`${ioYrs} year${ioYrs !== 1 ? 's' : ''}`),
      payment: raw.drawPayment,
      note: 'You only pay interest — balance stays the same',
    })
  }
  if (redPct > 0 && redMonths > 0) {
    const redPayment = Math.round(raw.repayPayment * (1 - redPct / 100))
    timeline.push({
      label: tLabel(`${redMonths} months`),
      payment: redPayment,
      note: `${redPct}% less than the full payment — stepping up to ${formatCurrencyFull(raw.repayPayment)}/mo after`,
    })
  }

  const specialMo = ioYrs * 12 + redMonths
  const remainMo  = 240 - specialMo
  const remainYr  = Math.round(remainMo / 12)
  timeline.push({
    label: seq === 0 ? `For ${remainYr} years` : tLabel(),
    payment: raw.repayPayment,
    note: 'Full monthly payments until paid off',
    final: true,
  })

  const hasSpecial = deferMo > 0 || ioYrs > 0 || redPct > 0
  const narrative = hasSpecial
    ? 'Your payments start low, then gradually increase.'
    : 'Same payment every month for the life of the loan.'

  const dotColors = ['#016163', '#254BCE', '#1e3fa8', '#001660']

  return (
    <div style={{ width: 252, flexShrink: 0, position: 'sticky', top: 32, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,22,96,0.12)', border: '1px solid rgba(0,22,96,0.1)', background: '#fff' }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ padding: '18px 20px 16px', background: 'linear-gradient(135deg, #001660 0%, #0d2380 100%)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)', marginBottom: 10, fontFamily: "'SharpSans', sans-serif" }}>Your Loan Plan</div>

        {accrued > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {/* Row 1 — You receive (PRIMARY) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>You receive</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '0em' }}>{formatCurrencyFull(raw.withdrawNow)}</span>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
            {/* Row 2 — Added amount (SECONDARY) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.45)', lineHeight: 1.45, flex: 1 }}>To let you skip payments for the first 6 months, this is added to your loan and will be held in escrow</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24', flexShrink: 0 }}>+{formatCurrencyFull(accrued)}</span>
            </div>
            {/* Row 3 — Total loan (LABELED) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 5, borderTop: '1px dashed rgba(255,255,255,0.15)' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>Total starting loan</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: '0em' }}>{formatCurrencyFull(heroAmount)}</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
              {productType === 'heloan' ? 'HELOAN' : 'HELOC'} · {apr}% APR
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '0em', marginBottom: 2 }}>{formatCurrencyFull(raw.withdrawNow)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>{productType === 'heloan' ? 'HELOAN' : 'HELOC'} · {apr}% APR</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
              {productType === 'heloc'
                ? `${formatCurrencyFull(raw.creditLimit)} credit line · ${formatCurrencyFull(raw.withdrawNow)} drawn`
                : 'Fixed rate · full amount at closing'}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Narrative ────────────────────────────────────────────── */}
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#374151', lineHeight: 1.55 }}>{narrative}</p>

        {/* ── Timeline ─────────────────────────────────────────────── */}
        <div style={{ position: 'relative', paddingLeft: 2 }}>
          <div style={{ position: 'absolute', left: 7, top: 10, bottom: 10, width: 2, background: 'linear-gradient(to bottom, #93DDBA, #254BCE, #001660)', borderRadius: 2, opacity: 0.35 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {timeline.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 13, paddingBottom: i < timeline.length - 1 ? 18 : 0 }}>
                <div style={{ width: 15, height: 15, borderRadius: '50%', flexShrink: 0, marginTop: 2, background: dotColors[Math.min(i, dotColors.length - 1)], boxShadow: `0 0 0 3px rgba(37,75,206,0.1)`, position: 'relative', zIndex: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{step.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
                    <span style={{ fontSize: step.payment === 0 ? 22 : 19, fontWeight: 900, color: step.final ? '#001660' : dotColors[Math.min(i, dotColors.length - 1)], letterSpacing: '0em', lineHeight: 1 }}>
                      {step.payment === 0 ? '$0' : step.payment != null ? formatCurrencyFull(step.payment) : '—'}
                    </span>
                    {step.payment !== 0 && step.payment != null && (
                      <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>/mo</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{step.note}</div>
                  {step.sub && (
                    <div style={{ marginTop: 4, fontSize: 10, fontWeight: 600, color: '#92400e', background: 'rgba(234,179,8,0.07)', borderRadius: 6, padding: '3px 7px', display: 'inline-block' }}>{step.sub}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Key facts ────────────────────────────────────────────── */}
        <div style={{ paddingTop: 12, borderTop: '1px solid rgba(0,22,96,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Amount borrowed',  value: formatCurrencyFull(raw.withdrawNow) },
            { label: 'Interest rate',    value: `${rate}% ${productType === 'heloan' ? 'fixed' : 'variable'}` },
            { label: 'APR',              value: `${apr}%` },
            { label: 'Fee (rolled in)',  value: formatCurrencyFull(origFee) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#001660' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div style={{ paddingTop: 10, borderTop: '1px solid rgba(0,22,96,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 10, color: '#9CA3AF' }}>Financing by <span style={{ fontWeight: 700, color: '#374151' }}>Grand Bank</span></div>
          <div style={{ fontSize: 10, color: '#B0B7C3' }}>NMLS #2611</div>
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: More Info (Step 3) — 2-card consolidated layout
// ─────────────────────────────────────────────────────────────────────────────

function HmdaAccordion({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const answered = !!value && value !== ''
  return (
    <div style={{ borderRadius: 12, border: `1.5px solid ${answered ? 'rgba(1,97,99,0.25)' : 'rgba(0,22,96,0.1)'}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 16px', background: answered ? 'rgba(1,97,99,0.04)' : '#F8F9FC',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#001660' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {answered
            ? <span style={{ fontSize: 12, fontWeight: 600, color: '#016163', background: 'rgba(1,97,99,0.1)', padding: '2px 10px', borderRadius: 20 }}>{value}</span>
            : <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,22,96,0.35)', background: 'rgba(0,22,96,0.06)', padding: '2px 10px', borderRadius: 20 }}>Not answered</span>
          }
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
            <path d="M2 4L6 8L10 4" stroke="rgba(0,22,96,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      {/* Options */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(0,22,96,0.07)', background: '#fff' }}>
          {options.map(opt => {
            const selected = value === opt
            return (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 16px', border: 'none', cursor: 'pointer',
                  background: selected ? 'rgba(37,75,206,0.05)' : '#fff',
                  fontFamily: 'inherit', textAlign: 'left',
                  borderBottom: '1px solid rgba(0,22,96,0.04)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F8F9FC' }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = '#fff' }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${selected ? '#254BCE' : 'rgba(0,22,96,0.2)'}`,
                  background: selected ? '#254BCE' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: selected ? 600 : 400, color: selected ? '#254BCE' : '#374151' }}>{opt}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ScreenMoreInfo({ step3, dispatch }) {
  const [disclosureOpen, setDisclosureOpen] = useState(false)
  const set = (field, value) => dispatch({ type: 'SET_STEP3', field, value })

  function skipAllHmda() {
    set('ethnicity', 'I prefer not to answer')
    set('race',      'I prefer not to answer')
    set('sex',       'I prefer not to answer')
  }

  const canSubmit = (step3.ssn || '').replace(/\D/g, '').length >= 9
    && !!step3.marital
    && !!step3.propOccupancy
    && !!step3.employmentStatus
    && !!step3.disclosuresAccepted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          Step 3 of 7 · Provide More Info
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Almost done — just a few final details
        </h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
          Your offer is locked in — we need this to submit.
        </p>
      </div>

      {/* ── Card 1: A little more about you ── */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,22,96,0.08)', borderRadius: 18, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,22,96,0.05)' }}>
        {/* Card header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,22,96,0.06)' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Tell us more about you and your Property</div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* SSN trust anchor */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(1,97,99,0.05)', border: '1px solid rgba(1,97,99,0.15)',
            borderRadius: 10, padding: '10px 14px',
          }}>
            <svg width="15" height="18" viewBox="0 0 15 18" fill="none" style={{ flexShrink: 0 }}>
              <path d="M7.5 1L1.5 3.5V8C1.5 12 3.8 15.7 7.5 17C11.2 15.7 13.5 12 13.5 8V3.5L7.5 1Z"
                stroke="#016163" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(1,97,99,0.1)"/>
              <path d="M5 9L7 11L10.5 7" stroke="#016163" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 12, color: '#014f51', fontWeight: 600 }}>
              Bank-level encryption · No hard credit pull yet · Never shared without your consent
            </span>
          </div>

          {/* SSN */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#001660', marginBottom: 6 }}>
              Social Security Number
            </label>
            <input
              type="text"
              value={step3.ssn || ''}
              placeholder="XXX-XX-XXXX"
              maxLength={11}
              onChange={e => {
                const d = e.target.value.replace(/\D/g, '').slice(0, 9)
                const f = d.length <= 3 ? d : d.length <= 5 ? `${d.slice(0,3)}-${d.slice(3)}` : `${d.slice(0,3)}-${d.slice(3,5)}-${d.slice(5)}`
                set('ssn', f)
              }}
              style={{
                width: 168, padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid rgba(0,22,96,0.15)', fontSize: 17, fontWeight: 600,
                letterSpacing: '0.12em', fontFamily: 'monospace', color: '#001660',
                background: '#fff', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#254BCE'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,22,96,0.15)'}
            />
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6, lineHeight: 1.5 }}>
              We'll only use this to verify your identity and check eligibility. We won't run a hard credit pull until you've completed identity verification — later in this flow.
            </div>
          </div>

          {/* Marital status */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#001660', marginBottom: 6 }}>Marital status</label>
            <div style={{ maxWidth: 280 }}>
              <Select value={step3.marital} onChange={v => set('marital', v)}
                options={[{ value: '', label: 'Select…' }, 'Single','Married','Separated','Divorced','Widowed']} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#001660', marginBottom: 6 }}>Who owns the property?</label>
            <div style={{ maxWidth: 280 }}>
              <Select value={step3.propOccupancy} onChange={v => set('propOccupancy', v)}
                options={['Primary residence','Secondary residence','Investment property']} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#001660', marginBottom: 6 }}>Primary income type</label>
            <div style={{ maxWidth: 280 }}>
              <Select value={step3.employmentStatus} onChange={v => set('employmentStatus', v)}
                options={['Full-time employed','Part-time employed','Self-employed','Retired','Not employed']} />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(0,22,96,0.06)', margin: '2px 0' }} />

          {/* Authorization block */}
          <div>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px', lineHeight: 1.7 }}>
              By submitting, you authorize GreenLyne to verify your identity, run a soft credit check, and share your application with our lending partners.
              A hard credit pull only happens later — and only with your explicit approval.
            </p>

            {/* Disclosure checkbox */}
            <button
              onClick={() => set('disclosuresAccepted', !step3.disclosuresAccepted)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, width: '100%', textAlign: 'left', cursor: 'pointer',
                background: step3.disclosuresAccepted ? 'rgba(37,75,206,0.05)' : '#F8F9FC',
                border: `1.5px solid ${step3.disclosuresAccepted ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                background: step3.disclosuresAccepted ? '#254BCE' : '#fff',
                border: `2px solid ${step3.disclosuresAccepted ? '#254BCE' : 'rgba(0,22,96,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              }}>
                {step3.disclosuresAccepted && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1.5 4.5L4 7L9.5 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: step3.disclosuresAccepted ? '#254BCE' : '#374151' }}>
                I've read and agree to the{' '}
                <span
                  onClick={e => { e.stopPropagation(); setDisclosureOpen(true) }}
                  style={{ color: '#254BCE', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                >application disclosures</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Card 2: Government monitoring ── */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,22,96,0.08)', borderRadius: 18, overflow: 'hidden', marginBottom: 24, boxShadow: '0 1px 8px rgba(0,22,96,0.05)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,22,96,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em', lineHeight: 1.2 }}>A couple of questions we're required to ask</div>
          <button
            onClick={skipAllHmda}
            style={{ fontSize: 12, fontWeight: 600, color: '#254BCE', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', padding: '2px 0', fontFamily: 'inherit', flexShrink: 0 }}
          >
            Skip all →
          </button>
        </div>

        <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <HmdaAccordion
            label="Ethnicity"
            value={step3.ethnicity}
            onChange={v => set('ethnicity', v)}
            options={['I prefer not to answer','Hispanic or Latino','Not Hispanic or Latino']}
          />
          <HmdaAccordion
            label="Race"
            value={step3.race}
            onChange={v => set('race', v)}
            options={['I prefer not to answer','American Indian or Alaska Native','Asian','Black or African American','Native Hawaiian or Other Pacific Islander','White','Two or more races']}
          />
          <HmdaAccordion
            label="Sex"
            value={step3.sex}
            onChange={v => set('sex', v)}
            options={['I prefer not to answer','Male','Female']}
          />
        </div>
      </div>

      {/* ── Single CTA ── */}
      <button
        onClick={() => dispatch({ type: 'NEXT' })}
        disabled={!canSubmit}
        style={{
          display: 'block', marginLeft: 'auto', marginBottom: 12,
          padding: '11px 22px', borderRadius: 11, border: 'none',
          background: canSubmit ? '#001660' : 'rgba(0,22,96,0.1)',
          color: canSubmit ? '#fff' : 'rgba(0,22,96,0.3)',
          fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default',
          fontFamily: 'inherit', letterSpacing: '-0.1px', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (canSubmit) e.currentTarget.style.background = '#00236e' }}
        onMouseLeave={e => { if (canSubmit) e.currentTarget.style.background = '#001660' }}
      >
        Submit my application →
      </button>

      {/* Reassurance line */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 20 }}>
        {['🔒 256-bit AES encryption', 'Soft pull only', 'No obligation to proceed'].map(t => (
          <span key={t} style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>{t}</span>
        ))}
      </div>

      {/* Back link */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => dispatch({ type: 'BACK' })}
          style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,22,96,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ← Back to offer
        </button>
      </div>

      {/* ── Disclosure bottom sheet ── */}
      {disclosureOpen && (
        <div
          onClick={() => setDisclosureOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '20px 20px 0 0',
              maxWidth: 620, width: '100%', maxHeight: '78vh', overflow: 'auto',
              padding: '28px 28px 40px',
              animation: 'slideInFwd 0.3s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#001660' }}>Application Disclosures</div>
              <button onClick={() => setDisclosureOpen(false)} style={{ background: 'rgba(0,22,96,0.06)', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: 18, fontFamily: 'inherit' }}>×</button>
            </div>
            {[
              { title: 'Privacy Policy', body: 'GreenLyne collects and uses your personal information solely to process your loan application and verify your identity. Your data is protected under our Privacy Policy and applicable state and federal regulations.' },
              { title: 'Fair Lending Notice', body: 'We are committed to fair lending practices. We do not discriminate based on race, color, religion, national origin, sex, marital status, age, familial status, or any other protected class under applicable law.' },
              { title: 'Regulation B — Government Monitoring', body: 'Federal law requires us to ask about race, sex, and ethnicity for home loan applications. You are not required to provide this information, but if you do not, we are required to note it based on visual observation or surname.' },
              { title: 'Soft Credit Pull Authorization', body: 'By submitting, you authorize GreenLyne to verify your identity, run a soft credit check, and share your application with our lending partners. A hard credit pull only happens later — and only with your explicit approval.' },
              { title: 'Electronic Communication Consent', body: 'You agree to receive loan-related communications from GreenLyne electronically, including emails and SMS messages. Standard message and data rates may apply.' },
            ].map(({ title, body }) => (
              <div key={title} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid rgba(0,22,96,0.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#001660', marginBottom: 5 }}>{title}</div>
                <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.7 }}>{body}</p>
              </div>
            ))}
            <button
              onClick={() => { set('disclosuresAccepted', true); setDisclosureOpen(false) }}
              style={{ width: '100%', marginTop: 6, padding: '14px', borderRadius: 12, border: 'none', background: '#254BCE', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Accept &amp; Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Link Income (Step 3b) — Plaid-style mock
// ─────────────────────────────────────────────────────────────────────────────
function PlaidLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      {/* Plaid grid icon */}
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" fill="#111"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5" fill="#111"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5" fill="#111"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5" fill="#111"/>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#111', letterSpacing: '0.04em' }}>PLAID</span>
    </div>
  )
}

function ScreenLinkIncome({ dispatch }) {
  // phases: intro → select → connecting → income → review
  const [phase, setPhase]             = useState('intro')
  const [selectedBank, setSelectedBank] = useState(null)
  const [bankSearch, setBankSearch]   = useState('')
  const [progress, setProgress]       = useState(0)
  const [connectStep, setConnectStep] = useState(0)
  const [selectedSources, setSelectedSources] = useState(['salary', 'bonus'])

  const CONNECT_STEPS = [
    'Establishing secure connection...',
    'Verifying credentials...',
    'Reading transactions...',
    'Identifying income sources...',
  ]

  const INCOME_SOURCES = [
    { id: 'salary',    name: 'HORIZON_TECH_DIRECT_DEP',  type: 'Recurring',  date: 'May 15, 2025', amount: '$8,666.67', annual: '$104,000' },
    { id: 'bonus',     name: 'HORIZON_TECH_BONUS_PPD',   type: 'One time',   date: 'Jan 3, 2025',  amount: '$6,250.00', annual: '$6,250' },
    { id: 'freelance', name: 'STRIPE_TRANSFER_PPD',       type: 'Recurring',  date: 'Apr 28, 2025', amount: '$1,200.00', annual: '$14,400' },
  ]

  const banks = [
    { id: 'bofa',   name: 'Bank of America', url: 'www.bankofamerica.com', color: '#E31837' },
    { id: 'chase',  name: 'Chase',           url: 'www.chase.com',         color: '#117ACA' },
    { id: 'wells',  name: 'Wells Fargo',     url: 'www.wellsfargo.com',    color: '#CC0000' },
    { id: 'citi',   name: 'Citibank',        url: 'www.citi.com',          color: '#003F83' },
    { id: 'usbank', name: 'US Bank',         url: 'www.usbank.com',        color: '#00274D' },
    { id: 'schwab', name: 'Charles Schwab',  url: 'www.schwab.com',        color: '#00A0DF' },
    { id: 'td',     name: 'TD Bank',         url: 'www.td.com',            color: '#00B140' },
    { id: 'other',  name: 'Other bank',      url: 'Search all banks',      color: '#6B7280' },
  ]

  const filteredBanks = banks.filter(b =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  )

  function handleConnect(bank) {
    setSelectedBank(bank)
    setPhase('connecting')
    setProgress(0)
    setConnectStep(0)
    let i = 0
    const pcts = [22, 48, 74, 100]
    const interval = setInterval(() => {
      if (i < pcts.length) { setProgress(pcts[i]); setConnectStep(i); i++ }
      else { clearInterval(interval); setTimeout(() => setPhase('income'), 500) }
    }, 750)
  }

  function toggleSource(id) {
    setSelectedSources(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectedSourceData = INCOME_SOURCES.filter(s => selectedSources.includes(s.id))
  const total12mo = selectedSourceData.reduce((sum, s) => {
    const n = parseInt(s.annual.replace(/[^0-9]/g, ''))
    return sum + n
  }, 0)

  // ── Shared Plaid modal shell ──
  const PlaidShell = ({ children, step }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          Step 4 of 7 · Link Account to Verify Income Sources
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Link your account to verify income
        </h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
          Powered by Plaid · Secure · Read-only access
        </p>
      </div>

      {/* Plaid card */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        {/* Plaid top bar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <PlaidLogo />
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 5 }}>
            {['intro','select','connecting','income','review'].map((s, i) => (
              <div key={s} style={{ width: 6, height: 6, borderRadius: '50%', background: s === step ? '#111' : 'rgba(0,0,0,0.15)', transition: 'background 0.2s' }} />
            ))}
          </div>
        </div>
        {children}
      </div>
    </div>
  )

  // ── Phase: intro ──────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <PlaidShell step="intro">
      <div style={{ padding: '32px 28px 28px', textAlign: 'center' }}>
        {/* App + Plaid logos */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#001660', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff' }}>G</div>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10h12M10 4l6 6-6 6" stroke="rgba(0,0,0,0.25)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="2" width="8" height="8" rx="1.5" fill="white"/>
              <rect x="12" y="2" width="8" height="8" rx="1.5" fill="white"/>
              <rect x="2" y="12" width="8" height="8" rx="1.5" fill="white"/>
              <rect x="12" y="12" width="8" height="8" rx="1.5" fill="white"/>
            </svg>
          </div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 6, lineHeight: 1.3 }}>
          GreenLyne uses Plaid to connect your accounts
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
          To verify your income, we'll securely link your bank using Plaid.
        </div>

        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          {[
            { icon: '⚡', title: 'Connect effortlessly', body: "Plaid lets you securely connect your financial accounts in seconds" },
            { icon: '🔒', title: 'Private',              body: "Plaid doesn't sell personal info, and will only use it with your permission" },
          ].map(({ icon, title, body }) => (
            <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, marginTop: 1 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 16, lineHeight: 1.6 }}>
          By selecting "Continue" you agree to the{' '}
          <span style={{ color: '#111', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Plaid End User Privacy Policy</span>
        </p>

        <button
          onClick={() => setPhase('select')}
          style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Continue
        </button>
      </div>
    </PlaidShell>
  )

  // ── Phase: select ─────────────────────────────────────────────────────────
  if (phase === 'select') return (
    <PlaidShell step="select">
      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111', marginBottom: 14 }}>Select your bank</div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="6" cy="6" r="4.5" stroke="#9CA3AF" strokeWidth="1.5"/>
            <path d="M10 10L12.5 12.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={bankSearch}
            onChange={e => setBankSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.15)', fontSize: 14, color: '#111',
              background: '#F8F9FC', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = '#111'}
            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.15)'}
          />
        </div>

        {/* Bank list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 280, overflowY: 'auto', marginBottom: 10 }}>
          {filteredBanks.map(b => (
            <button
              key={b.id}
              onClick={() => handleConnect(b)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, border: 'none',
                background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8F9FC'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff' }}>
                {b.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{b.name}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{b.url}</div>
              </div>
            </button>
          ))}
          {filteredBanks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', fontSize: 13, color: '#9CA3AF' }}>No banks found</div>
          )}
        </div>

        <button
          onClick={() => dispatch({ type: 'NEXT' })}
          style={{ width: '100%', padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9CA3AF', fontFamily: 'inherit', marginBottom: 8 }}
        >
          Skip — I'll provide documents manually
        </button>
      </div>
    </PlaidShell>
  )

  // ── Phase: connecting ─────────────────────────────────────────────────────
  if (phase === 'connecting') return (
    <PlaidShell step="connecting">
      <div style={{ padding: '40px 28px', textAlign: 'center' }}>
        {/* Logos with link animation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="1" width="8" height="8" rx="1.5" fill="white"/>
              <rect x="11" y="1" width="8" height="8" rx="1.5" fill="white"/>
              <rect x="1" y="11" width="8" height="8" rx="1.5" fill="white"/>
              <rect x="11" y="11" width="8" height="8" rx="1.5" fill="white"/>
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: progress > i * 33 ? '#111' : 'rgba(0,0,0,0.15)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: selectedBank?.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff' }}>
            {selectedBank?.name[0]}
          </div>
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 4 }}>
          Connecting to {selectedBank?.name}
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 28 }}>
          Authenticating securely · Do not close this window
        </div>

        <div style={{ height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', borderRadius: 99, background: '#111', width: `${progress}%`, transition: 'width 0.7s ease' }} />
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{CONNECT_STEPS[connectStep]}</div>
      </div>
    </PlaidShell>
  )

  // ── Phase: income selection ───────────────────────────────────────────────
  if (phase === 'income') return (
    <PlaidShell step="income">
      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111', marginBottom: 6 }}>Select your income</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6, lineHeight: 1.5 }}>
          Below are transactions from your <strong style={{ color: '#111' }}>{selectedBank?.name}</strong> account that may represent your income from the past year.
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, marginTop: 14 }}>
          Potential sources of income
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 14 }}>
          {INCOME_SOURCES.map(src => {
            const checked = selectedSources.includes(src.id)
            return (
              <button
                key={src.id}
                onClick={() => toggleSource(src.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px', borderRadius: 10, border: `1.5px solid ${checked ? '#111' : 'transparent'}`,
                  background: checked ? 'rgba(0,0,0,0.03)' : '#fff',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                  background: checked ? '#111' : '#fff',
                  border: `2px solid ${checked ? '#111' : 'rgba(0,0,0,0.25)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>{src.name}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{src.type} · {src.date}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', whiteSpace: 'nowrap' }}>{src.amount}</div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setPhase('review')}
          disabled={selectedSources.length === 0}
          style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: selectedSources.length > 0 ? '#111' : 'rgba(0,0,0,0.12)',
            color: selectedSources.length > 0 ? '#fff' : 'rgba(0,0,0,0.3)',
            fontSize: 15, fontWeight: 700, cursor: selectedSources.length > 0 ? 'pointer' : 'default',
            fontFamily: 'inherit', marginBottom: 10,
          }}
        >
          Continue
        </button>
        <button onClick={() => setPhase('select')} style={{ width: '100%', padding: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9CA3AF', fontFamily: 'inherit', marginBottom: 8 }}>
          ← Choose a different bank
        </button>
      </div>
    </PlaidShell>
  )

  // ── Phase: review & share ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          Step 4 of 7 · Link Account to Verify Income Sources
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Link your account to verify income
        </h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>Powered by Plaid · Secure · Read-only access</p>
      </div>

      {/* Success banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(1,97,99,0.05)', border: '1.5px solid rgba(1,97,99,0.22)', borderRadius: 14, padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#016163', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="13" viewBox="0 0 15 13" fill="none"><path d="M1.5 6.5L5.5 10.5L13.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#014f51' }}>Income verified</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{selectedBank?.name} · Checking ····8241</div>
        </div>
      </div>

      {/* Review card */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Review and share with GreenLyne</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Based on the last 365 days of selected income from your {selectedBank?.name} accounts.</div>
          </div>
          <PlaidLogo />
        </div>

        <div style={{ padding: '4px 0' }}>
          {selectedSourceData.map((src, i) => (
            <div key={src.id} style={{ padding: '14px 20px', borderBottom: i < selectedSourceData.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111', fontFamily: 'monospace', marginBottom: 8 }}>{src.name}</div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>Most recent deposit</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{src.amount}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>12-month earnings</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{src.annual}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Total */}
          <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Total 12-month income</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#001660' }}>${total12mo.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <button onClick={() => setPhase('income')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#254BCE', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>
            Review additional income info you'll be sharing
          </button>
        </div>
      </div>

      <button
        onClick={() => dispatch({ type: 'NEXT' })}
        style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: '#001660', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}
        onMouseEnter={e => e.currentTarget.style.background = '#00236e'}
        onMouseLeave={e => e.currentTarget.style.background = '#001660'}
      >
        Allow &amp; Continue to Identity Verification →
      </button>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={() => setPhase('income')} style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,22,96,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Back
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Verify Identity (Step 3c)
// ─────────────────────────────────────────────────────────────────────────────
function ScreenVerifyIdentity({ dispatch }) {
  const [idUploaded, setIdUploaded] = useState(false)
  const [selfieCapture, setSelfieCapture] = useState(false)

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Step 5 of 7</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Verify your identity</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>Required by federal law. Encrypted and never shared.</p>
      </div>

      {/* ID Upload */}
      <Card>
        <CardHeader title="Government-issued ID" sub="Driver's license, passport, or state ID" />
        <CardBody>
          {!idUploaded ? (
            <button onClick={() => setIdUploaded(true)}
              className="w-full border-2 border-dashed rounded-xl py-8 flex flex-col items-center gap-2 transition-all"
              style={{ borderColor: 'rgba(37,75,206,0.25)', background: 'rgba(37,75,206,0.02)' }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.05)')}
              onMouseOut={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.02)')}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              <span className="text-sm font-semibold" style={{ color: '#254BCE' }}>Upload or take a photo</span>
              <span className="text-[10px] text-gray-400">JPG, PNG, or PDF · Max 10MB</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#ECFDF5', border: '1px solid rgba(16,185,129,0.2)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <div>
                <div className="text-sm font-semibold text-emerald-800">ID uploaded</div>
                <div className="text-[10px] text-emerald-600">drivers_license_front.jpg</div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Selfie */}
      <Card>
        <CardHeader title="Selfie check" sub="Match your face to your ID photo" />
        <CardBody>
          {!selfieCapture ? (
            <button onClick={() => setSelfieCapture(true)}
              className="w-full border-2 border-dashed rounded-xl py-8 flex flex-col items-center gap-2 transition-all"
              style={{ borderColor: 'rgba(37,75,206,0.25)', background: 'rgba(37,75,206,0.02)' }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.05)')}
              onMouseOut={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.02)')}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span className="text-sm font-semibold" style={{ color: '#254BCE' }}>Open camera</span>
              <span className="text-[10px] text-gray-400">A short 3-second video capture</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#ECFDF5', border: '1px solid rgba(16,185,129,0.2)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <div>
                <div className="text-sm font-semibold text-emerald-800">Selfie captured</div>
                <div className="text-[10px] text-emerald-600">Identity match: high confidence</div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <NavButtons
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={() => dispatch({ type: 'NEXT' })}
        disabled={!idUploaded || !selfieCapture}
        nextLabel="Continue" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Property Verify Wait — auto-advances after delay
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Screen: Offer Loading (30-45 s pre-offer check)
// ─────────────────────────────────────────────────────────────────────────────
function ScreenOfferLoading({ dispatch, sim }) {
  const [progress, setProgress] = useState(0)
  const [stepIdx,  setStepIdx]  = useState(0)

  const steps = [
    'Retrieving Property Value…',
    'Retrieving Credit Information (soft credit pull)…',
    'Checking Property Title & Ownership…',
    'Optimizing Loan Offer…',
    'Personalizing Max Loan Amount…',
    'Configuring Loan APR…',
    'Configuring Loan Insurance…',
  ]

  useEffect(() => {
    const stagePcts = [10, 25, 42, 58, 72, 85, 95]
    const stageMsec = [400, 1100, 2000, 2900, 3700, 4500, 5300]

    const timers = stageMsec.map((ms, i) => setTimeout(() => {
      setProgress(stagePcts[i])
      setStepIdx(i)
    }, ms))

    const done = setTimeout(() => {
      setProgress(100)
      setTimeout(() => dispatch({ type: 'AUTO_ADVANCE' }), 400)
    }, 6300)

    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [dispatch])

  return (
    <div className="flex-1 flex justify-center" style={{ paddingTop: 48, paddingInline: 32, paddingBottom: 32 }}>
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>

        {/* Animated icon */}
        <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(37,75,206,0.07)', border: '2px solid rgba(37,75,206,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Analyzing your application</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 28px', lineHeight: 1.55 }}>
          This usually takes 30–45 seconds.
        </p>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 99, background: 'rgba(0,22,96,0.08)', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', borderRadius: 99, background: '#254BCE', width: `${progress}%`, transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 28 }}>{steps[stepIdx]}</div>

        {/* Checklist */}
        <div style={{ background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.06)', borderRadius: 16, padding: 16, textAlign: 'left' }}>
          {steps.map((s, i) => {
            const done   = i < stepIdx
            const active = i === stepIdx
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < steps.length - 1 ? '1px solid rgba(0,22,96,0.05)' : 'none' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#10B981' : active ? '#254BCE' : 'rgba(0,22,96,0.08)' }}>
                  {done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <span style={{ fontSize: 13, color: done ? '#6B7280' : active ? '#001660' : 'rgba(0,22,96,0.28)', fontWeight: active ? 600 : 400 }}>{s}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Identity Challenge
// ─────────────────────────────────────────────────────────────────────────────
function ScreenIdentityChallenge({ dispatch }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>

        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Identity verification required</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.55 }}>
          We need a bit more from you to finish verifying.
        </p>

        <div style={{ background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: 20, textAlign: 'left', marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#92400E', marginBottom: 12 }}>What happens next</div>
          {[
            "Upload a government-issued photo ID (driver's license or passport)",
            'Take a quick selfie for facial matching',
            "We'll re-run the check automatically — typically completes in under 2 minutes",
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{i + 1}</span>
              </div>
              <span style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => dispatch({ type: 'BACK' })}
          style={{ fontSize: 14, color: '#6B7280', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}>
          ← Return to application
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Address Mismatch
// ─────────────────────────────────────────────────────────────────────────────
function ScreenAddressMismatch({ dispatch }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>

        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>We couldn't match your address</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.55 }}>
          Review and correct the property address to continue.
        </p>

        <div style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 16, padding: 20, textAlign: 'left', marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#991B1B', marginBottom: 8 }}>Address on file</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#DC2626', marginBottom: 4 }}>4821 Oakbrook Dr</div>
          <div style={{ fontSize: 13, color: '#991B1B' }}>San Jose, CA 95126</div>
        </div>

        <button
          onClick={() => dispatch({ type: 'BACK' })}
          style={{ width: '100%', padding: '13px 24px', borderRadius: 14, background: '#254BCE', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,75,206,0.28)', marginBottom: 12 }}>
          ← Review &amp; correct my address
        </button>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>
          Or contact support if you believe the address is correct.
        </div>
      </div>
    </div>
  )
}

function ScreenPropertyVerifyWait({ dispatch }) {
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('Submitting application…')

  useEffect(() => {
    const stages = [
      { pct: 20, ms: 600,  text: 'Submitting application…' },
      { pct: 45, ms: 1400, text: 'Running automated property check…' },
      { pct: 70, ms: 2200, text: 'Verifying title & equity position…' },
      { pct: 90, ms: 3000, text: 'Cross-referencing public records…' },
      { pct: 100, ms: 3800, text: 'Finalizing assessment…' },
    ]
    const timers = stages.map(s => setTimeout(() => { setProgress(s.pct); setLabel(s.text) }, s.ms))
    const done = setTimeout(() => dispatch({ type: 'AUTO_ADVANCE' }), 4400)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [dispatch])

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(37,75,206,0.08)', border: '2px solid rgba(37,75,206,0.15)' }}>
          <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Verifying your property</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.55 }}>Usually takes a few seconds.</p>
        <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(0,22,96,0.07)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: '#254BCE' }} />
        </div>
        <div className="text-[11px] text-gray-400">{label}</div>
        <div className="mt-6 rounded-2xl p-4 text-left space-y-2" style={{ background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.06)' }}>
          {[
            ['Property address','1482 Sunridge Drive, Sacramento, CA'],
            ['Estimated value','$685,000'],
            ['CLTV','46%'],
          ].map(([l,v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-[11px] text-gray-500">{l}</span>
              <span className="text-[11px] font-semibold" style={{ color: '#001660' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Appraisal Wait
// ─────────────────────────────────────────────────────────────────────────────
function ScreenAppraisalWait() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#001660' }}>Appraisal ordered</h2>
            <div className="text-sm text-amber-600">Awaiting field assessment</div>
          </div>
        </div>
        <Card>
          <CardBody>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Our automated property assessment flagged your home for a desktop appraisal to confirm market value.
                A licensed appraiser will complete this remotely within <strong>2–3 business days</strong>.
              </p>
              <div className="rounded-xl p-4 space-y-3" style={{ background: '#FFF9ED', border: '1px solid rgba(234,179,8,0.2)' }}>
                <div className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Appraisal status</div>
                {[
                  { label: 'Order placed', done: true },
                  { label: 'Appraiser assigned', done: true },
                  { label: 'Desktop review in progress', done: false, active: true },
                  { label: 'Report delivered', done: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: item.done ? '#10B981' : item.active ? '#F59E0B' : 'rgba(0,22,96,0.1)' }}>
                      {item.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      {item.active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-[12px]" style={{ color: item.done ? '#6B7280' : item.active ? '#92400E' : 'rgba(0,22,96,0.3)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-gray-400 leading-relaxed">
                Use the Sim Controls panel to advance this state when ready.
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: OPS Review Wait
// ─────────────────────────────────────────────────────────────────────────────
function ScreenOpsReviewWait() {
  return (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
          Step 6 of 7 · Review in progress
        </div>

        {/* Clock icon */}
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(245,158,11,0.09)', border: '2px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          We're doing a quick manual review
        </h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.55 }}>
          Routine — your rate, terms, and approval aren't affected.
        </p>

        {/* What they're checking */}
        <div style={{ borderRadius: 16, border: '1.5px solid rgba(0,22,96,0.08)', marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: '#F8F9FC', borderBottom: '1px solid rgba(0,22,96,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,22,96,0.4)' }}>What our team is reviewing</div>
          </div>
          <div style={{ padding: '16px 18px', background: '#fff' }}>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }}>
              Our operations team is verifying the ownership and title details on your property. This step fires automatically when our system detects a discrepancy that needs a human to confirm — things like vesting name differences or address formatting.
            </p>
          </div>
        </div>

        {/* Status card */}
        <div style={{ borderRadius: 16, border: '1px solid rgba(0,22,96,0.08)', padding: '4px 18px', marginBottom: 20, background: '#F8F9FC' }}>
          {[
            ['Application ID', 'GL-2026-019234'],
            ['Submitted', 'Today at 2:14 PM'],
            ['Reviewer assigned', 'Pending'],
            ['Estimated resolution', '1–2 business days'],
          ].map(([l, v], i, arr) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,22,96,0.05)' : 'none' }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{l}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#001660' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <button style={{ width: '100%', padding: '14px 24px', borderRadius: 14, background: '#254BCE', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(37,75,206,0.25)', marginBottom: 10 }}>
          Go to my dashboard
        </button>
        <button style={{ width: '100%', padding: '13px 24px', borderRadius: 14, background: '#fff', color: '#001660', fontSize: 14, fontWeight: 600, border: '1.5px solid rgba(0,22,96,0.15)', cursor: 'pointer', fontFamily: 'inherit' }}>
          Call OPS to expedite — (844) 855-0160
        </button>
        <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          You'll receive an email and SMS as soon as you're cleared to continue.<br/>Use Sim Controls to advance this state in the demo.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Final Offer
// ─────────────────────────────────────────────────────────────────────────────
function ScreenFinalOffer({ loan, step2, dispatch }) {
  const tierData = FEE_TIERS[step2.tier ?? 0]
  const displayLoan = loan ?? calcLoan({ creditLimit: SEED.defaultCredit, withdrawNow: SEED.defaultWithdraw, tier: 0, deferredMonths: 0 })
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          Step 6 of 7
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: '#ECFDF5', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#065F46' }}>Conditionally approved</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          One last look before you sign
        </h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
          Review the numbers, then we'll walk you through your documents.
        </p>
      </div>

      {/* Condensed offer tile */}
      <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(37,75,206,0.18)', boxShadow: '0 4px 24px rgba(37,75,206,0.08)' }}>
        <div style={{ padding: '20px 24px', background: '#001660' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Your approved offer</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrencyFull(displayLoan.creditLimit)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Credit limit</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Initial draw</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#60A5FA' }}>{formatCurrencyFull(displayLoan.withdrawNow)}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#fff', borderTop: '1px solid rgba(37,75,206,0.1)' }}>
          {[
            { l: 'Draw payment', v: `${formatCurrencyFull(displayLoan.drawPayment)}/mo`, s: 'Interest only · 10 yr' },
            { l: 'Repay payment', v: `${formatCurrencyFull(displayLoan.repayPayment)}/mo`, s: 'P+I · 20 yr' },
            { l: 'APR', v: `${displayLoan.apr}%`, s: `Rate ${tierData.rate}% · Fee ${tierData.fee}%` },
          ].map((item, i) => (
            <div key={item.l} style={{ padding: '14px 20px', borderLeft: i > 0 ? '1px solid rgba(37,75,206,0.08)' : 'none' }}>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>{item.l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#001660' }}>{item.v}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{item.s}</div>
            </div>
          ))}
        </div>
        {/* Expandable full terms */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(37,75,206,0.06)', background: '#FAFBFF' }}>
          <button
            onClick={() => setShowTerms(!showTerms)}
            style={{ fontSize: 12, color: '#254BCE', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            {showTerms ? 'Hide full loan terms ↑' : 'View full loan terms ↓'}
          </button>
          {showTerms && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginTop: 14 }}>
              {[
                ['Product type', 'HELOC (Variable rate)'],
                ['Draw period', '10 years'],
                ['Repayment period', '20 years'],
                ['Total term', '30 years'],
                ['Origination fee', `${formatCurrencyFull(displayLoan.originationFee)} (rolled in)`],
                ['Cash at closing', '$0'],
                ['Available after draw', formatCurrencyFull(displayLoan.availableAfter)],
                ['Prepayment penalty', 'None'],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#001660' }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* What you'll do next — roadmap */}
      <div style={{ borderRadius: 16, border: '1.5px solid rgba(0,22,96,0.08)', background: '#F8F9FC', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,22,96,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#001660' }}>What you'll do next</div>
        </div>
        {[
          {
            n: 1, title: 'Sign your loan documents',
            desc: '8 documents, done right here. Takes about 8–12 minutes. The Deed of Trust is signed separately with your notary.',
          },
          {
            n: 2, title: 'Schedule a notary appointment',
            desc: "We'll connect you with a local or eNotary to complete the Deed of Trust. Most appointments are available within 48 hours.",
          },
          {
            n: 3, title: 'Property check',
            desc: "In rare cases — typically FEMA-declared disaster areas — we may request a Property Condition Report before releasing funds. We'll let you know if this applies to you.",
          },
        ].map((item, i, arr) => (
          <div key={item.n} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,22,96,0.05)' : 'none', background: '#fff' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#254BCE', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, marginTop: 1 }}>{item.n}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#001660', marginBottom: 3 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Acknowledgment checkbox */}
      <div style={{ borderRadius: 14, padding: '14px 16px', background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.07)' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            <div style={{ width: 18, height: 18, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${agreed ? '#254BCE' : 'rgba(0,22,96,0.2)'}`, background: agreed ? '#254BCE' : '#fff', transition: 'all 0.15s' }}>
              {agreed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
            I have reviewed the terms above and authorize GreenLyne / Owning (NMLS #2611) to proceed to closing. This is not a final binding agreement until all documents are signed.
          </div>
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 32 }}>
        <button
          onClick={() => dispatch({ type: 'DECLINE_OFFER' })}
          style={{ fontSize: 13, color: 'rgba(0,22,96,0.4)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
          Decline this offer
        </button>
        <button
          onClick={() => dispatch({ type: 'ACCEPT' })}
          disabled={!agreed}
          style={{ padding: '14px 26px', borderRadius: 14, background: agreed ? '#254BCE' : 'rgba(0,22,96,0.15)', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: agreed ? 'pointer' : 'not-allowed', boxShadow: agreed ? '0 4px 20px rgba(37,75,206,0.32)' : 'none', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          Accept offer and begin signing →
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Declined
// ─────────────────────────────────────────────────────────────────────────────
function ScreenDeclined({ dispatch }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.15)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>We're unable to approve at this time</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.55 }}>
          Not a reflection of your overall creditworthiness.
        </p>
        <Card className="text-left">
          <CardHeader title="What you can do next" />
          <CardBody>
            <div className="space-y-3">
              {[
                { icon: '📋', title: 'Request an adverse action notice', desc: 'You\'re entitled to a written explanation of the decision.' },
                { icon: '📈', title: 'Reapply in 90 days', desc: 'Improving your equity position or reducing debt may qualify you.' },
                { icon: '💬', title: 'Speak with a loan officer', desc: 'Our team can walk through options specific to your situation.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#001660' }}>{item.title}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <button onClick={() => dispatch({ type: 'RESTART' })}
          className="mt-5 px-8 py-2.5 text-sm font-semibold rounded-xl border transition-colors"
          style={{ borderColor: 'rgba(0,22,96,0.15)', color: '#001660', background: '#fff' }}>
          ← Restart demo
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Sign Documents (Step 6) — 8-doc e-signing flow
// ─────────────────────────────────────────────────────────────────────────────

const SIGN_DOCS = [
  {
    name: 'HELOC Agreement',
    desc: 'The main contract — your credit limit, draw period, and repayment terms.',
    typedSig: true,
    body: `This Home Equity Line of Credit Agreement ("Agreement") is entered into between Alex Rivera ("Borrower") and Owning, LLC (NMLS #2611) ("Lender").\n\nCredit Limit: $131,800.00\nDraw Period: 10 years from date of closing\nRepayment Period: 20 years\nVariable Rate: Indexed to Prime Rate + margin\n\nBorrower agrees to repay all advances made under this line of credit, together with interest accrued thereon, in accordance with the terms set forth herein. During the draw period, minimum monthly payments shall be interest only on the outstanding balance. During the repayment period, payments shall include principal and interest.\n\nThis Agreement shall be governed by the laws of the State of California.`,
  },
  {
    name: 'Promissory Note',
    desc: 'Your personal promise to repay the line of credit.',
    typedSig: true,
    body: `FOR VALUE RECEIVED, Alex Rivera ("Maker") promises to pay to the order of Owning, LLC (NMLS #2611) the principal sum of ONE HUNDRED THIRTY-ONE THOUSAND EIGHT HUNDRED DOLLARS ($131,800.00), or so much thereof as may be advanced under the Home Equity Line of Credit Agreement dated herewith, together with interest on the outstanding principal balance.\n\nPayments shall be due on the first day of each calendar month. This Note is secured by a Deed of Trust on the property located at 1482 Sunridge Drive, Sacramento, CA.\n\nMaker waives presentment, demand, protest, and notice of dishonor.`,
  },
  {
    name: 'Truth in Lending (TILA) Disclosure',
    desc: 'Your total cost of borrowing in plain numbers. Required by federal law.',
    typedSig: false,
    body: `ANNUAL PERCENTAGE RATE: 8.25%\nFINANCE CHARGE: Varies based on draw amount and repayment schedule\nAMOUNT FINANCED: Up to $131,800.00\nTOTAL OF PAYMENTS: Dependent on utilization\n\nThis disclosure is provided pursuant to the Truth in Lending Act (15 U.S.C. §1601 et seq.) and Regulation Z. The figures shown above are estimates based on your current draw amount.\n\nVariable Rate: Your APR may change. Ask us for information about our index and margin.`,
  },
  {
    name: 'Fee Disclosure',
    desc: 'Itemizes origination and closing fees.',
    typedSig: false,
    body: `ITEMIZATION OF AMOUNT FINANCED\n\nOrigination Fee: $1,318.00 (1.0% — rolled into loan)\nAppraisal Fee: Waived\nTitle Search Fee: $0\nRecording Fee: $0\nFlood Determination Fee: $0\n\nTotal Closing Costs: $1,318.00\nCash Required at Closing: $0.00\n\nAll fees listed above are included in your APR calculation. No additional fees are required at closing.`,
  },
  {
    name: 'Compliance Agreement',
    desc: "Confirms you'll cooperate if corrections to the documents are needed after closing.",
    typedSig: false,
    body: `In consideration of Lender making the loan described herein, Borrower agrees to cooperate fully with Lender and to execute, acknowledge, and deliver any additional documents, instruments, or agreements that Lender may reasonably require to correct clerical errors or omissions in the loan documents.\n\nBorrower understands this obligation is standard practice in real estate lending and does not alter the material terms of the loan.`,
  },
  {
    name: 'Right of Rescission Notice',
    desc: 'Your right to cancel within 3 business days of closing. Required by federal law.',
    typedSig: false,
    body: `NOTICE OF RIGHT TO CANCEL\n\nYour Right to Cancel: You are entering into a transaction that will result in a security interest on your home. You have a legal right under federal law to cancel this transaction, without cost, within THREE BUSINESS DAYS from whichever of the following events occurs last:\n\n(1) The date of the transaction, which is the date documents are signed;\n(2) The date you received your Truth in Lending disclosures;\n(3) The date you received this notice of your right to cancel.\n\nTo cancel this transaction, mail or deliver a written notice to Owning, LLC (NMLS #2611) by midnight of the third business day.`,
  },
  {
    name: 'Flood Zone Disclosure',
    desc: 'Confirms whether your property is in a FEMA-designated flood zone.',
    typedSig: false,
    body: `FLOOD ZONE DETERMINATION\n\nProperty Address: 1482 Sunridge Drive, Sacramento, CA 95826\nFEMA Map Number: 06067C0305H\nMap Date: May 18, 2009\n\nFlood Zone Designation: Zone X (Minimal flood hazard)\n\nBased on information obtained from the National Flood Insurance Program, the property securing your loan is NOT located in a Special Flood Hazard Area. Federal law does not require you to purchase flood insurance at this time; however, you may elect to do so.`,
  },
  {
    name: 'Arbitration Agreement',
    desc: 'Agreement to resolve disputes outside of court.',
    typedSig: false,
    body: `AGREEMENT TO ARBITRATE\n\nYou and Lender agree that any dispute, claim, or controversy arising out of or relating to this loan or these documents shall be resolved by binding arbitration administered by JAMS.\n\nYou understand that:\n• You are waiving your right to a jury trial\n• Arbitration decisions are final and binding\n• Class action lawsuits are not permitted under this agreement\n\nYou have the right to opt out of this arbitration agreement within 30 days of signing by sending written notice to Owning, LLC (NMLS #2611). Opting out will not affect your loan terms.`,
  },
]

function ScreenDocsPreparing({ dispatch }) {
  const [signedSet, setSignedSet] = useState(new Set())
  const [modalIdx, setModalIdx]   = useState(null)
  const [viewOnly, setViewOnly]   = useState(false)
  const [typedName, setTypedName] = useState('')

  const allSigned  = signedSet.size === SIGN_DOCS.length
  const modalDoc   = modalIdx !== null ? SIGN_DOCS[modalIdx] : null
  const canSign    = modalDoc?.typedSig ? typedName.trim().length > 3 : true

  function openSign(i) { setModalIdx(i); setViewOnly(false); setTypedName('') }
  function openView(i) { setModalIdx(i); setViewOnly(true) }
  function closeModal() { setModalIdx(null); setTypedName('') }
  function confirmSign() {
    setSignedSet(prev => new Set([...prev, modalIdx]))
    closeModal()
  }

  const signedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      {/* ── Document modal overlay ─────────────────────────────────────────── */}
      {modalIdx !== null && (
        <div
          onClick={closeModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,10,40,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(3px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, maxWidth: 620, width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.28)' }}
          >
            {/* Modal header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(0,22,96,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#001660', marginBottom: 3 }}>{modalDoc.name}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{modalDoc.desc}</div>
              </div>
              <button onClick={closeModal} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,22,96,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 16 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Signed banner (view-only mode) */}
            {viewOnly && (
              <div style={{ padding: '9px 24px', background: '#ECFDF5', borderBottom: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>Signed — {signedDate}</span>
              </div>
            )}

            {/* Document body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.9, color: '#1F2937', whiteSpace: 'pre-wrap' }}>
              {modalDoc.body}
            </div>

            {/* Footer — signing controls */}
            {!viewOnly && (
              <div style={{ padding: '18px 24px', borderTop: '1px solid rgba(0,22,96,0.08)', flexShrink: 0, background: '#FAFBFF' }}>
                {modalDoc.typedSig && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#001660', display: 'block', marginBottom: 8 }}>Type your full legal name to sign</label>
                    <input
                      value={typedName}
                      onChange={e => setTypedName(e.target.value)}
                      placeholder="Alex Rivera"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(0,22,96,0.15)', fontSize: 17, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#001660', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                    />
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 14, lineHeight: 1.6 }}>
                  By clicking "Sign document," I agree to be legally bound by the {modalDoc.name}, dated {signedDate}. This constitutes my electronic signature under the ESIGN Act (15 U.S.C. §7001).
                </div>
                <button
                  onClick={confirmSign}
                  disabled={!canSign}
                  style={{ width: '100%', padding: '13px 24px', borderRadius: 12, background: canSign ? '#254BCE' : 'rgba(0,22,96,0.12)', color: canSign ? '#fff' : 'rgba(0,22,96,0.3)', fontSize: 15, fontWeight: 700, border: 'none', cursor: canSign ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxShadow: canSign ? '0 4px 16px rgba(37,75,206,0.28)' : 'none', transition: 'all 0.15s' }}
                >
                  Sign document →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main page ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Step 6 of 7
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            Sign your documents
          </h1>
          <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
            {allSigned
              ? "All signed — ready to schedule your notary."
              : 'Open each document, read, and sign.'}
          </p>
        </div>

        {/* Document list */}
        <div style={{ borderRadius: 16, border: '1.5px solid rgba(0,22,96,0.08)', overflow: 'hidden', marginBottom: 20 }}>
          {SIGN_DOCS.map((doc, i) => {
            const signed = signedSet.has(i)
            return (
              <div key={doc.name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 18px', borderBottom: i < SIGN_DOCS.length - 1 ? '1px solid rgba(0,22,96,0.06)' : 'none', background: signed ? 'rgba(16,185,129,0.025)' : '#fff', transition: 'background 0.2s' }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: signed ? '#ECFDF5' : 'rgba(37,75,206,0.07)', border: `1.5px solid ${signed ? 'rgba(16,185,129,0.3)' : 'rgba(37,75,206,0.12)'}`, transition: 'all 0.2s' }}>
                  {signed
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <span style={{ fontSize: 11, fontWeight: 700, color: '#254BCE' }}>{i + 1}</span>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: signed ? '#6B7280' : '#001660', marginBottom: 2 }}>{doc.name}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 }}>{doc.desc}</div>
                </div>

                {signed ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <button onClick={() => openView(i)} style={{ fontSize: 12, fontWeight: 600, color: '#254BCE', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                      View
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: '#ECFDF5', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>Signed</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openSign(i)}
                    style={{ padding: '7px 18px', borderRadius: 10, background: '#254BCE', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, boxShadow: '0 2px 8px rgba(37,75,206,0.22)', transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1e3fa8' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#254BCE' }}
                  >
                    Sign
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: '#9CA3AF', marginBottom: 20 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          256-bit encryption · ESIGN Act compliant · Signed copies emailed automatically
        </div>

        <button
          onClick={() => dispatch({ type: 'NEXT' })}
          disabled={!allSigned}
          style={{ width: '100%', padding: '15px 24px', borderRadius: 14, background: allSigned ? '#254BCE' : 'rgba(0,22,96,0.1)', color: allSigned ? '#fff' : 'rgba(0,22,96,0.28)', fontSize: 16, fontWeight: 700, border: 'none', cursor: allSigned ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxShadow: allSigned ? '0 4px 20px rgba(37,75,206,0.3)' : 'none', transition: 'all 0.25s', marginBottom: 10 }}
        >
          {allSigned ? 'Continue to schedule my notary →' : `Sign all ${SIGN_DOCS.length} documents to continue`}
        </button>
        {!allSigned && (
          <button
            onClick={() => setSignedSet(new Set(SIGN_DOCS.map((_, i) => i)))}
            style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'center', marginBottom: 32 }}
          >
            [Demo] Mark all documents signed
          </button>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Schedule Notary Session (Step 7)
// ─────────────────────────────────────────────────────────────────────────────
const NOTARY_DAYS = ['Mon Apr 28', 'Tue Apr 29', 'Wed Apr 30', 'Thu May 1', 'Fri May 2', 'Mon May 5', 'Tue May 6', 'Wed May 7', 'Thu May 8', 'Fri May 9']
const NOTARY_TIMES = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM']
const UNAVAILABLE = new Set(['Mon Apr 28-9:00 AM', 'Mon Apr 28-10:00 AM', 'Tue Apr 29-11:00 AM', 'Tue Apr 29-2:00 PM', 'Wed Apr 30-9:30 AM', 'Fri May 2-1:00 PM'])

function ScreenReadyToSchedule({ dispatch }) {
  const [phase,       setPhase]       = useState('choose') // 'choose' | 'schedule-a' | 'preflight-b'
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedTime,setSelectedTime]= useState(null)
  const [address,     setAddress]     = useState('1482 Sunridge Drive, Sacramento, CA 95826')
  const [checks,      setChecks]      = useState({ id: false, camera: false, quiet: false })
  const allChecked = Object.values(checks).every(Boolean)

  // ── Path selection ────────────────────────────────────────────────────────
  if (phase === 'choose') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Step 7 of 7</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            Notarize the Deed of Trust
          </h1>
          <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
            Pick how you want to meet your notary — both options are free.
          </p>
        </div>

        {[
          {
            path: 'schedule-a',
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ),
            title: 'Schedule an in-person notary',
            desc: 'A notary comes to you — at home, your office, or any location you choose. Available in 1–3 business days.',
            detail: '30–45 min · Requires all signers present',
          },
          {
            path: 'preflight-b',
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            ),
            title: 'Start an eNotary session now',
            desc: 'Complete over a secure video call from anywhere. Available today during business hours (Mon–Fri, 8 AM–8 PM PT).',
            detail: '20–30 min · Just you and a camera',
          },
        ].map(opt => (
          <button key={opt.path} onClick={() => setPhase(opt.path)} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 20px', borderRadius: 16, border: '1.5px solid rgba(0,22,96,0.1)', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#254BCE'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,75,206,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,22,96,0.1)'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37,75,206,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {opt.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#001660', marginBottom: 4 }}>{opt.title}</div>
              <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, marginBottom: 8 }}>{opt.desc}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{opt.detail}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,22,96,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 4 }}><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>
    )
  }

  // ── Path A: In-person scheduling ──────────────────────────────────────────
  if (phase === 'schedule-a') {
    const canConfirm = selectedDay && selectedTime && address.trim().length > 5
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <button onClick={() => setPhase('choose')} style={{ fontSize: 13, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>← Back</button>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Step 7 of 7 · In-person notary</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Schedule your appointment</h1>
          <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>Pick a day, time, and location.</p>
        </div>

        {/* Day picker */}
        <div style={{ borderRadius: 14, border: '1.5px solid rgba(0,22,96,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#F8F9FC', borderBottom: '1px solid rgba(0,22,96,0.06)', fontSize: 12, fontWeight: 700, color: 'rgba(0,22,96,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select a date</div>
          <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, background: '#fff' }}>
            {NOTARY_DAYS.map(day => {
              const active = selectedDay === day
              return (
                <button key={day} onClick={() => { setSelectedDay(day); setSelectedTime(null) }}
                  style={{ padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.1)'}`, background: active ? '#254BCE' : '#fff', color: active ? '#fff' : '#001660', fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Time picker */}
        {selectedDay && (
          <div style={{ borderRadius: 14, border: '1.5px solid rgba(0,22,96,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#F8F9FC', borderBottom: '1px solid rgba(0,22,96,0.06)', fontSize: 12, fontWeight: 700, color: 'rgba(0,22,96,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select a time</div>
            <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, background: '#fff' }}>
              {NOTARY_TIMES.map(time => {
                const key = `${selectedDay}-${time}`
                const unavail = UNAVAILABLE.has(key)
                const active  = selectedTime === time
                return (
                  <button key={time} disabled={unavail} onClick={() => setSelectedTime(time)}
                    style={{ padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${active ? '#254BCE' : unavail ? 'rgba(0,22,96,0.05)' : 'rgba(0,22,96,0.1)'}`, background: active ? '#254BCE' : unavail ? 'rgba(0,22,96,0.03)' : '#fff', color: active ? '#fff' : unavail ? 'rgba(0,22,96,0.2)' : '#001660', fontSize: 12, fontWeight: active ? 700 : 500, cursor: unavail ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {time}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Location */}
        <div style={{ borderRadius: 14, border: '1.5px solid rgba(0,22,96,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#F8F9FC', borderBottom: '1px solid rgba(0,22,96,0.06)', fontSize: 12, fontWeight: 700, color: 'rgba(0,22,96,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Meeting location</div>
          <div style={{ padding: '14px 16px', background: '#fff' }}>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address, city, state, ZIP"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(0,22,96,0.12)', fontSize: 14, color: '#001660', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Home, office, or anywhere with a flat surface to sign. All signers must be present.</div>
          </div>
        </div>

        {/* Confirmation summary */}
        {canConfirm && (
          <div style={{ borderRadius: 14, padding: '14px 18px', background: 'rgba(37,75,206,0.04)', border: '1.5px solid rgba(37,75,206,0.15)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#254BCE', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Your appointment</div>
            {[
              ['Date & time', `${selectedDay} at ${selectedTime}`],
              ['Location', address],
              ['Duration', '30–45 minutes'],
              ['Who needs to be there', 'All borrowers on the application'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 16 }}>
                <span style={{ fontSize: 12, color: '#6B7280', flexShrink: 0 }}>{l}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#001660', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => dispatch({ type: 'ADVANCE_NOTARY' })} disabled={!canConfirm}
          style={{ width: '100%', padding: '14px 24px', borderRadius: 14, background: canConfirm ? '#254BCE' : 'rgba(0,22,96,0.1)', color: canConfirm ? '#fff' : 'rgba(0,22,96,0.28)', fontSize: 15, fontWeight: 700, border: 'none', cursor: canConfirm ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxShadow: canConfirm ? '0 4px 20px rgba(37,75,206,0.3)' : 'none', transition: 'all 0.2s', marginBottom: 32 }}>
          Confirm appointment →
        </button>
      </div>
    )
  }

  // ── Path B: eNotary pre-flight ────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <button onClick={() => setPhase('choose')} style={{ fontSize: 13, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>← Back</button>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Step 7 of 7 · eNotary</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Before we connect you with a notary</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>20–30 minutes and can't be paused once it starts.</p>
      </div>

      {/* Checklist */}
      <div style={{ borderRadius: 16, border: '1.5px solid rgba(0,22,96,0.08)', overflow: 'hidden' }}>
        {[
          { key: 'id',     label: 'Valid government-issued ID', sub: "Driver's license, passport, or state ID — not expired" },
          { key: 'camera', label: 'Working camera and microphone', sub: 'Test yours now at camera.google.com if unsure' },
          { key: 'quiet',  label: 'Quiet space, good lighting', sub: 'The notary needs to see your face and ID clearly' },
        ].map((item, i, arr) => {
          const checked = checks[item.key]
          return (
            <button key={item.key} onClick={() => setChecks(p => ({ ...p, [item.key]: !checked }))}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px', width: '100%', textAlign: 'left', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,22,96,0.06)' : 'none', background: checked ? 'rgba(16,185,129,0.03)' : '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: checked ? '#254BCE' : '#fff', border: `2px solid ${checked ? '#254BCE' : 'rgba(0,22,96,0.18)'}`, transition: 'all 0.15s' }}>
                {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#001660', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 }}>{item.sub}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Hours + accessibility */}
      <div style={{ borderRadius: 14, padding: '14px 18px', background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.07)', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
        <strong style={{ color: '#001660' }}>Available Mon–Fri, 8 AM–8 PM PT.</strong> Sessions are recorded for compliance. If you need accessibility accommodations, call us before starting: (844) 855-0160.
      </div>

      <button onClick={() => dispatch({ type: 'NOTARY_ARRIVED' })} disabled={!allChecked}
        style={{ width: '100%', padding: '14px 24px', borderRadius: 14, background: allChecked ? '#254BCE' : 'rgba(0,22,96,0.1)', color: allChecked ? '#fff' : 'rgba(0,22,96,0.28)', fontSize: 15, fontWeight: 700, border: 'none', cursor: allChecked ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxShadow: allChecked ? '0 4px 20px rgba(37,75,206,0.3)' : 'none', transition: 'all 0.2s', marginBottom: 32 }}>
        {allChecked ? "I'm ready — start my session →" : 'Confirm all three items above to continue'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Notary Scheduled — appointment confirmed, waiting
// ─────────────────────────────────────────────────────────────────────────────
function ScreenNotaryScheduled({ dispatch }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Step 7 of 7</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: '#ECFDF5', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#065F46' }}>Appointment confirmed</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Your notary is booked</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>We'll remind you 24 hours before. Have your photo ID ready.</p>
      </div>

      {/* Appointment card */}
      <div style={{ borderRadius: 16, border: '1.5px solid rgba(37,75,206,0.15)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px', background: '#001660' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Your appointment</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Tuesday, Apr 29 at 10:00 AM</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Sarah Chen · In-person notary · 30–45 min</div>
        </div>
        <div style={{ padding: '16px 22px', background: '#fff' }}>
          {[
            ['Location', '1482 Sunridge Drive, Sacramento, CA 95826'],
            ['Who needs to be there', 'All borrowers on the application'],
            ['What to bring', 'Government-issued photo ID'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0, width: 140 }}>{l}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#001660' }}>{v}</span>
            </div>
          ))}
          <button style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: '#254BCE', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            + Add to calendar
          </button>
        </div>
      </div>

      {/* What to expect */}
      <div style={{ borderRadius: 14, padding: '14px 18px', background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.07)', fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
        Your notary will verify your ID and witness you sign the Deed of Trust. The session takes 30–45 minutes. Once complete, your documents go to the county recorder — typically within 1–2 business days.
      </div>

      <button onClick={() => dispatch({ type: 'NOTARY_ARRIVED' })}
        style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', marginBottom: 32 }}>
        [Demo] Notary has arrived →
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Signing in Progress — notary session active
// ─────────────────────────────────────────────────────────────────────────────
function ScreenSigningInProgress({ dispatch }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.25)' }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Session in progress</div>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Almost done</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>Sign each page as the notary walks you through the Deed of Trust.</p>
      </div>

      {/* Signing checklist */}
      <div style={{ borderRadius: 16, border: '1.5px solid rgba(0,22,96,0.08)', overflow: 'hidden' }}>
        {[
          { label: 'Identity verified',       done: true,  active: false },
          { label: 'Deed of Trust — Page 1',  done: true,  active: false },
          { label: 'Deed of Trust — Page 2',  done: true,  active: false },
          { label: 'Deed of Trust — Page 3',  done: false, active: true  },
          { label: 'Notary acknowledgment',   done: false, active: false },
        ].map((item, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,22,96,0.06)' : 'none', background: item.active ? 'rgba(37,75,206,0.04)' : '#fff' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.done ? '#ECFDF5' : item.active ? '#254BCE' : 'rgba(0,22,96,0.06)', border: item.done ? '1px solid rgba(16,185,129,0.3)' : 'none' }}>
              {item.done
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : item.active ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} /> : null}
            </div>
            <span style={{ fontSize: 14, fontWeight: item.active ? 700 : 500, color: item.done ? '#9CA3AF' : item.active ? '#001660' : 'rgba(0,22,96,0.3)' }}>{item.label}</span>
            {item.active && <span style={{ fontSize: 11, fontWeight: 700, color: '#254BCE', marginLeft: 'auto' }}>In progress</span>}
          </div>
        ))}
      </div>

      <button onClick={() => dispatch({ type: 'SIGN' })}
        style={{ width: '100%', padding: '14px 24px', borderRadius: 14, background: '#001660', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 32 }}>
        Complete signing →
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Loan Closed — rescission window
// ─────────────────────────────────────────────────────────────────────────────
function ScreenLoanClosed({ dispatch }) {
  const rescissionDate = new Date()
  rescissionDate.setDate(rescissionDate.getDate() + 3)
  const rescissionStr = rescissionDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Step 7 of 7</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          You've signed everything
        </h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
          Here's what happens over the next few days.
        </p>
      </div>

      {/* Rescission window */}
      <div style={{ borderRadius: 16, border: '1.5px solid rgba(245,158,11,0.25)', background: 'rgba(255,251,235,0.8)', padding: '18px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#92400E', marginBottom: 10 }}>Your right to cancel</div>
        <p style={{ fontSize: 14, color: '#78350F', lineHeight: 1.65, margin: '0 0 10px' }}>
          Under federal law (TRID), you have <strong>3 business days</strong> to cancel this loan at no cost. Your cancellation window closes on <strong>{rescissionStr}</strong>.
        </p>
        <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
          After that date, your line of credit opens and funds are released. To cancel before then, call us at (844) 855-0160. This window is your protection — not something to worry about unless you want to change your mind.
        </p>
      </div>

      {/* Timeline */}
      <div style={{ borderRadius: 16, border: '1.5px solid rgba(0,22,96,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', background: '#F8F9FC', borderBottom: '1px solid rgba(0,22,96,0.06)', fontSize: 12, fontWeight: 700, color: 'rgba(0,22,96,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>What happens next</div>
        {[
          { day: 'Today',          label: 'Documents sent to county recorder',      done: true  },
          { day: 'Day 1–3',        label: 'Rescission window — you can still cancel', done: false },
          { day: 'Day 4',          label: 'Rescission closes · Funds released',      done: false },
          { day: 'Day 5–7',        label: 'County records the Deed of Trust',        done: false },
          { day: 'Within 3–5 days',label: 'Westhaven contacts you to schedule install',done: false},
        ].map((item, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '13px 18px', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,22,96,0.05)' : 'none', background: '#fff' }}>
            <div style={{ width: 60, flexShrink: 0, fontSize: 11, fontWeight: 700, color: item.done ? '#10B981' : 'rgba(0,22,96,0.35)', paddingTop: 1 }}>{item.day}</div>
            <div style={{ fontSize: 13, color: item.done ? '#374151' : 'rgba(0,22,96,0.55)', fontWeight: item.done ? 600 : 400 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <button onClick={() => dispatch({ type: 'CLOSE_LOAN' })}
        style={{ width: '100%', padding: '14px 24px', borderRadius: 14, background: '#254BCE', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(37,75,206,0.3)', marginBottom: 4 }}>
        View my funded details →
      </button>
      <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 }}>
        We'll email you at alex.rivera@email.com when your line is open and funds are available.
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Funded (Step 7)
// ─────────────────────────────────────────────────────────────────────────────
function ScreenFunded({ loan, step2, dispatch }) {
  const displayLoan = loan ?? calcLoan({ creditLimit: SEED.defaultCredit, withdrawNow: SEED.defaultWithdraw, tier: 0, deferredMonths: 0 })
  const tierData = FEE_TIERS[step2?.tier ?? 0]

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #001660 0%, #0f2a8a 100%)' }}>
      <div className="max-w-lg w-full">
        {/* Celebration header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(16,185,129,0.2)', border: '2px solid rgba(16,185,129,0.4)' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="text-4xl font-bold text-white mb-2">Your solar project is funded.</div>
          <div className="text-lg text-white/60">Westhaven Power will contact you within 3–5 business days to schedule your installation.</div>
        </div>

        {/* Fund amount card */}
        <div className="rounded-3xl overflow-hidden mb-5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="px-6 py-5 text-center border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">Funds disbursed to your account</div>
            <div className="text-5xl font-bold text-white">{formatCurrencyFull(displayLoan.withdrawNow)}</div>
            <div className="text-white/50 text-sm mt-1">Chase Checking ····8241 · Expected today</div>
          </div>
          <div className="grid grid-cols-2 divide-x" style={{ divideColor: 'rgba(255,255,255,0.08)' }}>
            {[
              { l: 'Credit limit', v: formatCurrencyFull(displayLoan.creditLimit) },
              { l: 'Available to draw', v: formatCurrencyFull(displayLoan.availableAfter) },
              { l: 'Monthly payment', v: `${formatCurrencyFull(displayLoan.drawPayment)}/mo` },
              { l: 'APR', v: `${displayLoan.apr}%` },
            ].map(item => (
              <div key={item.l} className="px-5 py-4 text-center">
                <div className="text-[10px] text-white/40 mb-0.5">{item.l}</div>
                <div className="text-sm font-bold text-white">{item.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Next steps */}
        <div className="rounded-3xl p-5 mb-5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-3">What happens next</div>
          <div className="space-y-3">
            {[
              { icon: '🏡', title: 'Westhaven schedules your install', desc: 'Expect a call from your Westhaven Power consultant within 3–5 business days to confirm your installation date.' },
              { icon: '📱', title: 'Access your line', desc: 'Log into your account to draw funds, view statements, and manage payments.' },
              { icon: '💳', title: 'Your first payment', desc: `First draw payment of ${formatCurrencyFull(displayLoan.drawPayment)} is due 30 days after funding.` },
              { icon: '⚙️', title: 'Set up AutoPay', desc: 'Enroll to save 0.25% APR and never miss a payment.' },
              { icon: '📞', title: 'Questions?', desc: 'Your GreenLyne loan specialist is available at (877) 265-0703.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-xl shrink-0">{item.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="text-[11px] text-white/50 mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => dispatch({ type: 'RESTART' })}
            className="px-8 py-3 text-sm font-semibold rounded-xl border transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', background: 'transparent' }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
            ↺ Restart demo
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────────────────────
export default function POSDemo() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const { app, step1, step2, step3, step4, loan, sim, simOpen } = state
  const navigate = useNavigate()

  // Funded screen gets its own full-page layout (no sidebar/brandbar)
  if (app === S.FUNDED) {
    return <ScreenFunded loan={loan} step2={step2} dispatch={dispatch} />
  }

  function renderScreen() {
    switch (app) {
      case S.BASIC_INFO:           return <ScreenBasicInfo step1={step1} dispatch={dispatch} />
      case S.OFFER_LOADING:        return <ScreenOfferLoading dispatch={dispatch} sim={sim} />
      case S.OFFER_SELECT:         return <ScreenOfferSelectNew step2={step2} step1={step1} dispatch={dispatch} savedConfig={state.step2Config} />
      case S.IDENTITY_CHALLENGE:   return <ScreenIdentityChallenge dispatch={dispatch} />
      case S.ADDRESS_MISMATCH:     return <ScreenAddressMismatch dispatch={dispatch} />
      case S.MORE_INFO:            return <ScreenMoreInfo step3={step3} dispatch={dispatch} />
      case S.LINK_INCOME:          return <ScreenLinkIncome dispatch={dispatch} />
      case S.VERIFY_IDENTITY:      return <ScreenVerifyIdentity dispatch={dispatch} />
      case S.PROPERTY_VERIFY_WAIT: return <ScreenPropertyVerifyWait dispatch={dispatch} />
      case S.APPRAISAL_WAIT:       return <ScreenAppraisalWait />
      case S.OPS_REVIEW_WAIT:      return <ScreenOpsReviewWait />
      case S.FINAL_OFFER:          return <ScreenFinalOffer loan={loan} step2={step2} dispatch={dispatch} />
      case S.DECLINED:             return <ScreenDeclined dispatch={dispatch} />
      case S.DOCS_PREPARING:      return <ScreenDocsPreparing dispatch={dispatch} />
      case S.READY_TO_SCHEDULE:   return <ScreenReadyToSchedule dispatch={dispatch} />
      case S.NOTARY_SCHEDULED:    return <ScreenNotaryScheduled dispatch={dispatch} />
      case S.SIGNING_IN_PROGRESS: return <ScreenSigningInProgress dispatch={dispatch} />
      case S.LOAN_CLOSED:         return <ScreenLoanClosed dispatch={dispatch} />
      default: return null
    }
  }

  // Screens with full-height flex layout (no inner scroll)
  const flexScreens = new Set([S.OFFER_LOADING, S.IDENTITY_CHALLENGE, S.ADDRESS_MISMATCH, S.PROPERTY_VERIFY_WAIT, S.APPRAISAL_WAIT, S.OPS_REVIEW_WAIT])
  const isFlexScreen = flexScreens.has(app)

  // Loan-plan sidebar is only relevant on Step 2 (OFFER_SELECT), which renders its own panel.
  // On every other step the sidebar would just repeat info the user already confirmed — hide it.
  const showOfferSidebar = false

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#F8F9FC' }}>
      <BrandBar onRestart={() => dispatch({ type: 'RESTART' })} onToggleSim={() => dispatch({ type: 'TOGGLE_SIM' })} onViewEmail={() => navigate('/email')} />
      <div className="flex flex-1 overflow-hidden">
        <StepSidebar appState={app} dispatch={dispatch} />
        <main className={isFlexScreen ? 'flex-1 overflow-hidden flex flex-col' : 'flex-1 overflow-y-auto'}>
          {isFlexScreen ? renderScreen() : (
            <div style={{ maxWidth: 980, width: '100%', margin: '0 auto', padding: '32px 32px 64px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {renderScreen()}
              </div>
              {showOfferSidebar && (
                <div style={{ paddingTop: 116, flexShrink: 0 }}>
                  <OfferSidebar loan={loan} step2={step2} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {simOpen && <SimPanel sim={sim} appState={app} dispatch={dispatch} />}
    </div>
  )
}
