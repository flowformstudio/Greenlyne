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
  OFFER_SELECT:          'offer_select',
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
  { n: 1, label: 'Basic Info',         states: [S.BASIC_INFO] },
  { n: 2, label: 'Select Your Offer', states: [S.OFFER_SELECT] },
  { n: 3, label: 'Verify & Confirm',  states: [S.MORE_INFO, S.LINK_INCOME, S.VERIFY_IDENTITY, S.PROPERTY_VERIFY_WAIT, S.APPRAISAL_WAIT] },
  { n: 4, label: 'Final Offer',       states: [S.OPS_REVIEW_WAIT, S.FINAL_OFFER, S.DECLINED] },
  { n: 5, label: 'Review & Sign',     states: [S.DOCS_PREPARING, S.READY_TO_SCHEDULE] },
  { n: 6, label: 'Closing',           states: [S.NOTARY_SCHEDULED, S.SIGNING_IN_PROGRESS, S.LOAN_CLOSED] },
  { n: 7, label: 'Funded',            states: [S.FUNDED] },
]

const STEP_JUMP = {
  1: S.BASIC_INFO,
  2: S.OFFER_SELECT,
  3: S.MORE_INFO,
  4: S.FINAL_OFFER,
  5: S.DOCS_PREPARING,
  6: S.NOTARY_SCHEDULED,
  7: S.FUNDED,
}

const SEED = { projectCost: 45000, maxCredit: 294821, minCredit: 25000, defaultCredit: 131800, defaultWithdraw: 91800 }

const SEED_STEP1 = {
  firstName: 'Alex', lastName: 'Rivera',
  dob: '03/14/1982', ssn4: '8241',
  phone: '(408) 555-0183', email: 'alex.rivera@email.com',
  marital: 'Married', purpose: 'Home improvement',
  address: '4821 Oakbrook Dr', city: 'San Jose', state: 'CA', zip: '95126',
  propType: 'Primary residence', ownership: 'Joint ownership',
  propValue: '485000', mortgageBalance: '190000',
}

const SEED_STEP3 = {
  propOccupancy: 'Primary residence', hoa: 'No', floodZone: 'No',
  employmentStatus: 'Full-time employed',
  employer: 'Horizon Tech Solutions', yearsEmployed: '6',
  annualIncome: '124000', monthlyExpenses: '3200',
}

const initialState = {
  app: S.BASIC_INFO,
  step1: { ...SEED_STEP1 },
  step2: { creditLimit: SEED.defaultCredit, withdrawNow: SEED.defaultWithdraw, tier: 0, deferredMonths: 0, autopay: true },
  step3: { ...SEED_STEP3 },
  step4: { bankLinked: false, idVerified: false },
  loan: null,
  sim: { propertyCheck: 'ok', appraisalRequired: false, opsReview: false, notaryMethod: 'enotary' },
  simOpen: false,
  step2Config: null,  // persists configurator choices during session; cleared on restart
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    case 'NEXT': {
      const nextMap = {
        [S.BASIC_INFO]:           S.OFFER_SELECT,
        [S.OFFER_SELECT]:         S.MORE_INFO,
        [S.MORE_INFO]:            S.LINK_INCOME,
        [S.LINK_INCOME]:          S.VERIFY_IDENTITY,
        [S.VERIFY_IDENTITY]:      S.PROPERTY_VERIFY_WAIT,
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
        [S.OFFER_SELECT]:    S.BASIC_INFO,
        [S.MORE_INFO]:       S.OFFER_SELECT,
        [S.LINK_INCOME]:     S.MORE_INFO,
        [S.VERIFY_IDENTITY]: S.LINK_INCOME,
        [S.DOCS_PREPARING]:  S.FINAL_OFFER,
      }
      const prev = backMap[state.app]
      return prev ? { ...state, app: prev } : state
    }
    case 'AUTO_ADVANCE': {
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
      <label className="block font-semibold mb-1" style={{ fontSize: 13, color: '#001660' }}>
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
      style={{ fontSize: 15, border: '1px solid rgba(0,22,96,0.15)', background: readOnly ? '#F8F9FC' : '#fff', color: readOnly ? 'rgba(0,22,96,0.5)' : '#001660' }}
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
        style={{ fontSize: 15, border: '1px solid rgba(0,22,96,0.15)', background: '#fff', color: '#001660', paddingRight: '2rem', cursor: 'pointer' }}>
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
            style={{ fontSize: 15, borderColor: 'rgba(0,22,96,0.15)', color: '#001660', background: '#fff' }}
            onMouseOver={e => (e.currentTarget.style.background = '#F8F9FC')}
            onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
            ← Back
          </button>
        )}
        <button className="px-5 py-2.5 font-medium rounded-xl border transition-colors"
          style={{ fontSize: 15, borderColor: 'rgba(0,22,96,0.15)', color: 'rgba(0,22,96,0.55)', background: '#fff' }}
          onMouseOver={e => (e.currentTarget.style.background = '#F8F9FC')}
          onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
          Save for later
        </button>
      </div>
      <button onClick={onNext} disabled={disabled}
        className="py-2.5 px-6 font-bold rounded-xl transition-all flex items-center gap-2"
        style={{ fontSize: 15, background: disabled ? 'rgba(0,22,96,0.2)' : '#254BCE', color: '#fff',
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
                  {done   && <div className="text-[12px] text-emerald-600 mt-0.5">Completed</div>}
                  {active && <div className="text-[12px] mt-0.5" style={{ color: '#254BCE' }}>In progress</div>}
                  {future && <div className="text-[12px] text-gray-300 mt-0.5">Upcoming</div>}
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
// Screen: Basic Info (Step 1) — 4 focused sub-steps
// ─────────────────────────────────────────────────────────────────────────────
const BASIC_SUB_STEPS = [
  { id: 'identity',  label: 'Identity' },
  { id: 'contact',   label: 'Contact' },
  { id: 'purpose',   label: 'Purpose' },
  { id: 'address',   label: 'Property Address' },
  { id: 'ownership', label: 'Ownership' },
  { id: 'equity',    label: 'Estimated Equity' },
]

const PURPOSE_OPTIONS = [
  { value: 'Home improvement',    icon: '🔨', desc: 'Renovations, additions, or upgrades' },
  { value: 'Debt consolidation',  icon: '🔄', desc: 'Combine debts into one payment' },
  { value: 'Major purchase',      icon: '🛒', desc: 'Large one-time expense' },
  { value: 'Emergency funds',     icon: '🛡️', desc: 'Safety net or unexpected costs' },
  { value: 'Other',               icon: '✦',  desc: 'Something else entirely' },
]

function SubStepProgress({ current }) {
  const total = BASIC_SUB_STEPS.length
  const pct   = Math.round(((current + 1) / total) * 100)
  const label = BASIC_SUB_STEPS[current]?.label ?? ''

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#001660' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>Step {current + 1} of {total}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(0,22,96,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #254BCE 0%, #3B63E8 100%)',
          borderRadius: 99,
          transition: 'width 0.35s ease',
        }} />
      </div>
    </div>
  )
}

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
        fontSize: 15, outline: 'none', background: '#fff', color: '#001660',
        letterSpacing: center ? '0.15em' : 0,
      }}
      onFocus={e => (e.target.style.borderColor = '#254BCE')}
      onBlur={e => (e.target.style.borderColor = 'rgba(0,22,96,0.15)')}
    />
  )
}

function ScreenBasicInfo({ step1, dispatch }) {
  const [sub, setSub] = useState(0)
  const set = (field, value) => dispatch({ type: 'SET_STEP1', field, value })

  const goNext = () => {
    if (sub < BASIC_SUB_STEPS.length - 1) setSub(sub + 1)
    else dispatch({ type: 'NEXT' })
  }
  const goBack = () => {
    if (sub > 0) setSub(sub - 1)
  }

  const SUB_META = [
    { heading: 'Let\'s confirm who you are',            sub: 'Pre-filled from your pre-approval — just verify these look right.' },
    { heading: 'How can we reach you?',                  sub: 'We\'ll only contact you about your application. No spam.' },
    { heading: 'What\'s the primary purpose of this loan?', sub: 'This helps us match you with the right terms.' },
    { heading: 'Where is the property?',                 sub: 'This is the home you\'re financing against.' },
    { heading: 'Who owns this property?',                sub: 'Select the property type and how ownership is held.' },
    { heading: 'What\'s your estimated equity?',         sub: 'We use this to size your credit line.' },
  ]

  const meta = SUB_META[sub]

  return (
    <div>
      <SubStepProgress current={sub} />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#001660', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
          {meta.heading}
        </h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: 0 }}>{meta.sub}</p>
      </div>

      {/* ── Sub-step 1: Identity ── */}
      {sub === 0 && (
        <Card>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Name row — first names are typically shorter than last names */}
              <FieldRow gap={12}>
                <FieldWrap maxWidth={176}>
                  <Field label="First name">
                    <Input value={step1.firstName} onChange={v => set('firstName', v)} />
                  </Field>
                </FieldWrap>
                <FieldWrap maxWidth={216}>
                  <Field label="Last name">
                    <Input value={step1.lastName} onChange={v => set('lastName', v)} />
                  </Field>
                </FieldWrap>
              </FieldRow>

              {/* DOB */}
              <FieldWrap maxWidth={180}>
                <Field label="Date of birth">
                  <Input value={step1.dob} onChange={v => set('dob', v)} placeholder="MM/DD/YYYY" />
                </Field>
              </FieldWrap>

              {/* Marital status */}
              <FieldWrap maxWidth={170}>
                <Field label="Marital status">
                  <Select value={step1.marital} onChange={v => set('marital', v)}
                    options={['Single','Married','Separated','Divorced','Widowed']} />
                </Field>
              </FieldWrap>

              {/* SSN + hint inline */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#001660', marginBottom: 4, display: 'block' }}>
                    SSN <span style={{ fontWeight: 400, color: '#9CA3AF' }}>last 4 digits</span>
                  </label>
                  <NarrowInput
                    value={step1.ssn4}
                    onChange={v => set('ssn4', v.replace(/\D/g, '').slice(0, 4))}
                    placeholder="_ _ _ _"
                    maxWidth={88}
                    center
                  />
                </div>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px',
                  background: 'rgba(37,75,206,0.04)', borderRadius: 10,
                  border: '1px solid rgba(37,75,206,0.08)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <p style={{ fontSize: 13, color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                    Your SSN is used only to verify identity. We use a <strong>soft pull</strong> — no impact to your credit score.
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Sub-step 2: Contact ── */}
      {sub === 1 && (
        <Card>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <FieldRow gap={12}>
                <FieldWrap flex="0 0 210px">
                  <Field label="Phone number">
                    <Input value={step1.phone} onChange={v => set('phone', v)} placeholder="(___) ___-____" />
                  </Field>
                </FieldWrap>
                <FieldWrap flex="0 0 210px">
                  <Field label="Email address">
                    <Input value={step1.email} onChange={v => set('email', v)} />
                  </Field>
                </FieldWrap>
              </FieldRow>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Sub-step 3: Financing Purpose ── */}
      {sub === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PURPOSE_OPTIONS.map(opt => {
            const active = step1.purpose === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => set('purpose', opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 20px',
                  background: active ? 'rgba(37,75,206,0.06)' : '#fff',
                  border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.12)'}`,
                  borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                  boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: active ? 'rgba(37,75,206,0.1)' : 'rgba(0,22,96,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {opt.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: active ? '#254BCE' : '#001660', marginBottom: 3 }}>
                    {opt.value}
                  </div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>{opt.desc}</div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.2)'}`,
                  background: active ? '#254BCE' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Sub-step 4: Property Address ── */}
      {sub === 3 && (
        <Card>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Field label="Street address">
                <Input value={step1.address} onChange={v => set('address', v)} placeholder="123 Main St" />
              </Field>

              <FieldRow gap={10}>
                <FieldWrap maxWidth={220}>
                  <Field label="City">
                    <Input value={step1.city} onChange={v => set('city', v)} />
                  </Field>
                </FieldWrap>
                <FieldWrap maxWidth={80}>
                  <Field label="State">
                    <Input value={step1.state} onChange={v => set('state', v.toUpperCase().slice(0, 2))} placeholder="CA" />
                  </Field>
                </FieldWrap>
                <FieldWrap maxWidth={104}>
                  <Field label="ZIP code">
                    <Input value={step1.zip} onChange={v => set('zip', v.replace(/\D/g, '').slice(0, 5))} placeholder="00000" />
                  </Field>
                </FieldWrap>
              </FieldRow>

              {/* Map pin visual */}
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontSize: 13, color: '#065F46', fontWeight: 500 }}>
                  {step1.address}, {step1.city}, {step1.state} {step1.zip}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Sub-step 5: Ownership ── */}
      {sub === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Property type */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#001660', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Property type</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { value: 'Primary residence',  icon: '🏠', desc: 'Primary home' },
                { value: 'Secondary residence', icon: '🏡', desc: 'Vacation / part-time' },
                { value: 'Investment property', icon: '📈', desc: 'Rental / income' },
              ].map(opt => {
                const active = step1.propType === opt.value
                return (
                  <button key={opt.value} onClick={() => set('propType', opt.value)} style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 8, padding: '16px 10px',
                    background: active ? 'rgba(37,75,206,0.06)' : '#fff',
                    border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.12)'}`,
                    borderRadius: 14, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                    boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                  }}>
                    <span style={{ fontSize: 24 }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: active ? '#254BCE' : '#001660', lineHeight: 1.3 }}>{opt.value}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{opt.desc}</div>
                    </div>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: `2px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.2)'}`,
                      background: active ? '#254BCE' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(0,22,96,0.06)' }} />

          {/* Ownership type */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#001660', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ownership type</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { value: 'Sole owner',      icon: '👤', desc: 'Only owner' },
                { value: 'Joint ownership', icon: '👥', desc: 'With co-owner' },
                { value: 'Trust',           icon: '🏛️', desc: 'Held in trust' },
              ].map(opt => {
                const active = step1.ownership === opt.value
                return (
                  <button key={opt.value} onClick={() => set('ownership', opt.value)} style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 8, padding: '16px 10px',
                    background: active ? 'rgba(37,75,206,0.06)' : '#fff',
                    border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.12)'}`,
                    borderRadius: 14, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                    boxShadow: active ? '0 0 0 3px rgba(37,75,206,0.08)' : 'none',
                  }}>
                    <span style={{ fontSize: 24 }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: active ? '#254BCE' : '#001660', lineHeight: 1.3 }}>{opt.value}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{opt.desc}</div>
                    </div>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: `2px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.2)'}`,
                      background: active ? '#254BCE' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-step 6: Estimated Equity ── */}
      {sub === 5 && (() => {
        const propVal  = Number((step1.propValue || '').replace(/\D/g,''))
        const mortgage = Number((step1.mortgageBalance || '').replace(/\D/g,''))
        const equity   = propVal && mortgage ? propVal - mortgage : null
        const ltv      = propVal && mortgage ? mortgage / propVal : null
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card>
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <FieldRow gap={12}>
                    <FieldWrap flex="0 0 168px">
                      <Field label="Property value" helper="USD">
                        <Input value={step1.propValue} onChange={v => set('propValue', v)} placeholder="$485,000" />
                      </Field>
                    </FieldWrap>
                    <FieldWrap flex="0 0 168px">
                      <Field label="Mortgage balance" helper="USD">
                        <Input value={step1.mortgageBalance} onChange={v => set('mortgageBalance', v)} placeholder="$190,000" />
                      </Field>
                    </FieldWrap>
                  </FieldRow>

                  {equity !== null && equity > 0 && (
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(37,75,206,0.04)', border: '1px solid rgba(37,75,206,0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 3 }}>Estimated equity</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#001660', letterSpacing: '-0.5px' }}>
                            ${equity.toLocaleString()}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 3 }}>Loan-to-value</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: ltv > 0.8 ? '#EF4444' : '#10B981' }}>
                            {Math.round(ltv * 100)}%
                          </div>
                        </div>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,22,96,0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(ltv * 100, 100)}%`, background: ltv > 0.8 ? '#EF4444' : '#254BCE', borderRadius: 3, transition: 'width 0.35s' }} />
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        )
      })()}

      {/* Nav */}
      <NavButtons
        showBack={sub > 0}
        onBack={goBack}
        onNext={goNext}
        nextLabel={sub === BASIC_SUB_STEPS.length - 1 ? 'Save & Continue' : 'Continue'}
      />
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
      <div style={{ fontSize: 13, fontWeight: 800, color: '#001660', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
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
            <div style={{ fontSize: 15, fontWeight: 800, color: r.accent ? '#254BCE' : '#001660', letterSpacing: '-0.3px' }}>{r.value}</div>
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
          <div style={{ fontSize: 13, fontWeight: 700, color: '#001660' }}>{title}</div>
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
          <span style={{ fontSize: 16, fontWeight: 800, color: '#DC2626' }}>{Math.round(currentDTI * 100)}% — {dtiLabel(currentDTI)}</span>
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
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 13, border: '1px solid rgba(0,22,96,0.15)', borderRadius: 9, outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#001660', marginBottom: 5 }}>Annual income</div>
              <input value={spouseIncome} onChange={e => setSpouseIncome(e.target.value)}
                placeholder="$0"
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 13, border: '1px solid rgba(0,22,96,0.15)', borderRadius: 9, outline: 'none', fontFamily: 'inherit' }} />
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
                style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#001660', color: '#fff', border: 'none', cursor: 'pointer' }}>
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
              style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#001660', color: '#fff', border: 'none', cursor: 'pointer' }}>
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
                      <div style={{ fontSize: 16, fontWeight: 800, color: r.color }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDebts.length > 0 && (
              <button onClick={() => onApply('debt_payoff', { selectedDebts, newWithdraw })}
                style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: debtPayoffDTI <= DTI_THRESHOLD ? '#001660' : 'rgba(0,22,96,0.4)', color: '#fff', border: 'none', cursor: 'pointer' }}>
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

  // ── Offer progress bar ────────────────────────────────────────────────────
  function OfferProgress({ current }) {
    const total = OFFER_SUB_STEPS.length
    const label = OFFER_SUB_STEPS[current]?.label ?? ''
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#001660', letterSpacing: '-0.1px' }}>{label}</span>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>Step {current + 1} of {total}</span>
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
          <div style={{ fontSize: 20, fontWeight: 800, color: '#001660', marginBottom: 6, letterSpacing: '-0.3px' }}>
            Calculating your ideal plan…
          </div>
          {goalMeta && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,75,206,0.06)', border: '1px solid rgba(37,75,206,0.15)', borderRadius: 100, padding: '5px 16px' }}>
              <span style={{ fontSize: 16 }}>{goalMeta.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#254BCE' }}>{goalMeta.label}</span>
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
              <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
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
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#001660', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
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
            fontSize: 16, color: '#001660', lineHeight: 1.55,
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
        <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500, whiteSpace: 'nowrap' }}>or choose your priority</span>
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
                <div style={{ fontSize: 15, fontWeight: 700, color: active ? '#254BCE' : '#001660', lineHeight: 1.3, marginBottom: 2 }}>{g.label}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 }}>{g.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Back */}
      <div style={{ paddingTop: 12, borderTop: '1px solid rgba(0,22,96,0.07)' }}>
        <button onClick={() => dispatch({ type: 'BACK' })} style={{ padding: '10px 20px', fontSize: 15, fontWeight: 600, borderRadius: 10, border: '1.5px solid rgba(0,22,96,0.15)', background: 'none', color: '#001660', cursor: 'pointer' }}>
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
                <div style={{ fontSize: 13, color: '#9CA3AF' }}>Choose an option to improve your approval odds</div>
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

      <OfferProgress current={1} />

      {/* Hero */}
      <div style={{ paddingBottom: 24, marginBottom: 24, borderBottom: '1px solid rgba(0,22,96,0.08)' }}>
        {goalMeta ? (
          <>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.6px', lineHeight: 1.15 }}>
              Your plan is ready
            </h1>
            <p style={{ fontSize: 17, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
              We've configured the best setup for your goal. Adjust anything below.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#001660', margin: '0 0 8px', letterSpacing: '-0.6px', lineHeight: 1.15 }}>
              Pick a monthly payment that works for you
            </h1>
            <p style={{ fontSize: 17, color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
              Alex, your home qualifies for solar financing. Choose the plan that fits your budget.
            </p>
          </>
        )}
      </div>

      {/* Plan Info — individual floating tiles */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Plan Info</div>
          {goalMeta && (
            <button onClick={() => setOfferSub(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#254BCE', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
              <span style={{ fontSize: 13 }}>{goalMeta.emoji}</span>
              {goalMeta.label}
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Change goal
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>

          {/* DTI Health */}
          <div style={{ background: dtiTooHigh ? 'linear-gradient(135deg, #991B1B, #7f1d1d)' : 'linear-gradient(135deg, #016163, #014e50)', borderRadius: 12, padding: '14px 16px', boxShadow: dtiTooHigh ? '0 2px 10px rgba(153,27,27,0.25)' : '0 2px 10px rgba(1,97,99,0.2)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>DTI Health</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{Math.round(dti * 100)}%</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 5 }}>{dtiTooHigh ? '⚠️ Above 45% limit' : '✓ Within threshold'}</div>
          </div>

          {/* Cash at closing */}
          <div style={{ background: 'linear-gradient(135deg, #016163, #014e50)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 10px rgba(1,97,99,0.2)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Cash at closing</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>$0</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 5 }}>Fee {formatCurrencyFull(loan.originationFee)} rolled in</div>
          </div>

          {/* Monthly payment */}
          <div style={{ background: '#fff', border: '1px solid rgba(37,75,206,0.15)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,22,96,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>Monthly payment</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#254BCE', letterSpacing: '-0.5px', lineHeight: 1 }}>
              ${selectedPayment.toLocaleString()}<span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>/mo</span>
            </div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 5 }}>{termYears}-yr term</div>
          </div>

          {/* Monthly savings */}
          <div style={{ background: '#fff', border: `1px solid ${savings >= 0 ? 'rgba(1,97,99,0.15)' : 'rgba(0,22,96,0.08)'}`, borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,22,96,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>{savings >= 0 ? 'Monthly savings' : 'Over bill'}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: savings >= 0 ? '#016163' : '#374151', letterSpacing: '-0.5px', lineHeight: 1 }}>
              {savings >= 0 ? `~$${savings.toLocaleString()}` : `$${Math.abs(savings).toLocaleString()}`}
              <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>/mo</span>
            </div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 5 }}>vs. electric bill</div>
          </div>

          {/* First payment */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,22,96,0.08)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,22,96,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>First payment</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#001660', lineHeight: 1.25 }}>
              {deferredMonths > 0 ? payStartLabel(deferredMonths) : payStartLabel(0)}
            </div>
          </div>

          {/* Available today */}
          <div style={{ background: '#fff', border: '1px solid rgba(37,75,206,0.12)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,22,96,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>Available today</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#254BCE', letterSpacing: '-0.5px', lineHeight: 1 }}>{formatCurrencyFull(safeWithdraw)}</div>
          </div>

          {/* APR */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,22,96,0.08)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,22,96,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>APR</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#001660', letterSpacing: '-0.5px', lineHeight: 1 }}>{displayApr}%</div>
          </div>

          {/* Rate */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,22,96,0.08)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,22,96,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>Rate</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#001660', letterSpacing: '-0.5px', lineHeight: 1 }}>{FEE_TIERS[tier].rate}%</div>
          </div>

        </div>

        {/* Plan Health */}
        <div style={{ marginTop: 14, background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.08)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Plan Health</div>
          {!dtiTooHigh && deferredMonths === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(1,97,99,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#016163" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span style={{ fontSize: 13, color: '#016163', fontWeight: 600 }}>Everything looks good — no issues with this plan.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dtiTooHigh && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#FFF5F5', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10 }}>
                  <span style={{ fontSize: 15, lineHeight: 1, marginTop: 1 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', marginBottom: 2 }}>High DTI — {Math.round(dti * 100)}% (above 45% threshold)</div>
                    <div style={{ fontSize: 12, color: '#DC2626', lineHeight: 1.5 }}>This configuration may not qualify. Consider reducing your draw amount or choosing a longer term to lower the payment.</div>
                  </div>
                  <button onClick={() => setShowDecline(true)} style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', background: 'none', border: '1px solid rgba(220,38,38,0.35)', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap', padding: '5px 10px', flexShrink: 0 }}>See options →</button>
                </div>
              )}
              {deferredMonths > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#FFF9ED', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 10 }}>
                  <span style={{ fontSize: 15, lineHeight: 1, marginTop: 1 }}>🕐</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>Payments deferred {deferredMonths} months — first due {payStartLabel(deferredMonths)}</div>
                    <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>Interest accrues during the deferral period and is added to your balance. Your effective loan amount will be higher.</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Plan cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {TERM_OPTIONS.map(opt => {
              const active  = termYears === opt.years
              const payment = calcTermPayment(safeWithdraw, opt.apr, opt.years)
              const saves   = ELECTRIC_BILL - payment
              const meta    = TERM_DESCRIPTORS[opt.years] ?? {}
              const color   = meta.popular ? '#254BCE' : '#016163'
              return (
                <div key={opt.years} style={{ display: 'flex', flexDirection: 'column' }}>
                  {meta.popular && (
                    <div style={{ background: '#254BCE', color: '#fff', fontSize: 11, fontWeight: 800, textAlign: 'center', borderRadius: '8px 8px 0 0', padding: '5px 0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Most popular
                    </div>
                  )}
                  <button onClick={() => setTermYears(opt.years)} style={{
                    flex: 1, position: 'relative', textAlign: 'left', cursor: 'pointer', background: '#fff',
                    border: `2px solid ${active ? color : 'rgba(0,22,96,0.12)'}`,
                    borderTop: active && !meta.popular ? `5px solid ${color}` : meta.popular ? 'none' : `2px solid ${active ? color : 'rgba(0,22,96,0.12)'}`,
                    borderRadius: meta.popular ? '0 0 12px 12px' : 12,
                    padding: '14px 14px 12px',
                    boxShadow: active ? `0 3px 16px ${color}22` : '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.18s cubic-bezier(0.22,1,0.36,1)', outline: 'none',
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', marginBottom: 10, border: `2px solid ${active ? color : 'rgba(0,22,96,0.2)'}`, background: active ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                      {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.6px', lineHeight: 1, color: active ? color : '#001660', marginBottom: 2, transition: 'color 0.15s' }}>
                      {formatCurrencyFull(payment)}<span style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0 }}>/mo</span>
                    </div>
                    <div style={{ fontSize: 16, color: '#9CA3AF', marginBottom: 8 }}>{opt.years}-yr · {opt.apr}% APR</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: saves >= 0 ? '#065f46' : '#9CA3AF', background: saves >= 0 ? 'rgba(1,97,99,0.07)' : 'rgba(0,0,0,0.04)', borderRadius: 5, padding: '3px 7px', marginBottom: 8, display: 'inline-block' }}>
                      {saves >= 0 ? `Save $${saves.toLocaleString()}/mo` : `$${Math.abs(saves).toLocaleString()}/mo over bill`}
                    </div>
                    <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.5 }}>{meta.desc}</div>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Customize accordion */}
          <div style={{ background: '#fff', border: '1.5px solid rgba(0,22,96,0.1)', borderRadius: 14, overflow: 'hidden' }}>
            <button onClick={() => setCustomizeOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(37,75,206,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
                    <circle cx="8" cy="6" r="2.2" fill="#254BCE" stroke="none"/>
                    <circle cx="16" cy="12" r="2.2" fill="#254BCE" stroke="none"/>
                    <circle cx="10" cy="18" r="2.2" fill="#254BCE" stroke="none"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: '#111827' }}>Customize this plan</div>
                  <div style={{ fontSize: 15, color: '#9CA3AF' }}>Adjust draw amount, timing & rate</div>
                </div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
                style={{ transform: customizeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {customizeOpen && (
              <div style={{ padding: '0 22px 24px', borderTop: '1px solid rgba(0,22,96,0.07)' }}>
                <div style={{ marginTop: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Total credit line</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>{formatCurrencyFull(creditLimit)}</div>
                  </div>
                  <div style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 12 }}>Your maximum approved amount. You only pay interest on what you draw.</div>
                  <RangeSlider value={creditLimit} min={SEED.minCredit} max={maxCredit} step={5000}
                    onChange={v => { setCreditLimit(v); if (withdrawNow > v) setWithdrawNow(v) }}
                    formatLabel={v => formatCurrencyFull(v)} />
                </div>
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>How much do you need today?</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#254BCE', letterSpacing: '-0.5px' }}>{formatCurrencyFull(safeWithdraw)}</div>
                  </div>
                  <div style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 12 }}>
                    The rest ({formatCurrencyFull(creditLimit - safeWithdraw)}) stays in your credit line — draw it later, no rush.
                  </div>
                  <RangeSlider value={safeWithdraw} min={0} max={creditLimit} step={5000} onChange={v => setWithdrawNow(v)} formatLabel={v => formatCurrencyFull(v)} />
                  <CreditBar withdrawNow={safeWithdraw} creditLimit={creditLimit} />
                </div>
                <div style={{ height: 1, background: 'rgba(0,22,96,0.07)', margin: '20px 0' }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Start payments later</div>
                  <div style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 12 }}>Delay your first payment while your solar system cuts your bill from day one.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {DEFERRED_OPTIONS.map(opt => {
                      const active = deferredMonths === opt.months
                      return (
                        <button key={opt.months} onClick={() => setDeferredMonths(opt.months)} style={{ padding: '12px 4px', borderRadius: 10, textAlign: 'center', border: `1.5px solid ${active ? '#016163' : 'rgba(0,22,96,0.12)'}`, background: active ? 'rgba(1,97,99,0.06)' : '#F8F9FC', color: active ? '#016163' : '#374151', fontSize: 15, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                          {opt.months === 0 ? 'Right away' : `${opt.months}mo`}
                        </button>
                      )
                    })}
                  </div>
                  {deferredMonths > 0 && <div style={{ fontSize: 15, color: '#016163', marginTop: 9, fontWeight: 600 }}>First payment due: {payStartLabel(deferredMonths)}</div>}
                </div>
                <div style={{ height: 1, background: 'rgba(0,22,96,0.07)', margin: '20px 0' }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Lower your rate</div>
                  <div style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 12 }}>Pay a small upfront fee (rolled into your loan) to get a lower rate — no cash needed at closing.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {FEE_TIERS.map((t, i) => {
                      const active = tier === i
                      return (
                        <button key={i} onClick={() => setTier(i)} style={{ padding: '14px 10px', borderRadius: 11, textAlign: 'left', border: `1.5px solid ${active ? '#254BCE' : 'rgba(0,22,96,0.12)'}`, background: active ? 'rgba(37,75,206,0.05)' : '#F8F9FC', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 3 }}>{RATE_LABELS[i]}</div>
                          <div style={{ fontSize: 19, fontWeight: 800, color: active ? '#254BCE' : '#001660', letterSpacing: '-0.4px' }}>{t.rateLabel}</div>
                          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 3 }}>{RATE_DESCS[i]}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ height: 1, background: 'rgba(0,22,96,0.07)', margin: '20px 0' }} />

                {/* DTI improvement options — highlighted when DTI is high */}
                <div style={{ borderRadius: 14, border: dtiTooHigh ? '2px solid rgba(220,38,38,0.3)' : '1px solid transparent', background: dtiTooHigh ? 'rgba(255,245,245,0.5)' : 'transparent', padding: dtiTooHigh ? '14px' : '0', transition: 'all 0.3s' }}>
                  {dtiTooHigh && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: 'rgba(220,38,38,0.07)', borderRadius: 8 }}>
                      <span style={{ fontSize: 14 }}>⚠️</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>DTI is high — adjust these settings to lower it</span>
                    </div>
                  )}

                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Roll existing debts into the loan</div>
                  <div style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 12 }}>Pay off high-interest debts through your HELOC — removes their minimums from your DTI.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {RECOVERY_DEBTS.map(debt => {
                      const sel = rolledDebts.includes(debt.id)
                      return (
                        <button key={debt.id} onClick={() => {
                          const next = sel ? rolledDebts.filter(x => x !== debt.id) : [...rolledDebts, debt.id]
                          setRolledDebts(next)
                          const addedBalance = next.reduce((s, id) => s + (RECOVERY_DEBTS.find(d => d.id === id)?.balance ?? 0), 0)
                          setCreditLimit(c => Math.max(c, safeWithdraw + addedBalance))
                          setWithdrawNow(safeWithdraw + addedBalance)
                        }} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                          border: `1.5px solid ${sel ? '#254BCE' : 'rgba(0,22,96,0.1)'}`,
                          borderRadius: 11, background: sel ? 'rgba(37,75,206,0.04)' : '#F8F9FC',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        }}>
                          <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `2px solid ${sel ? '#254BCE' : 'rgba(0,22,96,0.2)'}`, background: sel ? '#254BCE' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {sel && <svg width="10" height="8" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#001660' }}>{debt.label}</div>
                            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{debt.rate}% APR · ${debt.monthly}/mo minimum</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: sel ? '#254BCE' : '#001660' }}>{formatCurrencyFull(debt.balance)}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {rolledDebts.length > 0 && (() => {
                    const saved = rolledDebts.reduce((s, id) => s + (RECOVERY_DEBTS.find(d => d.id === id)?.monthly ?? 0), 0)
                    const rolled = rolledDebts.reduce((s, id) => s + (RECOVERY_DEBTS.find(d => d.id === id)?.balance ?? 0), 0)
                    return (
                      <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(37,75,206,0.05)', border: '1px solid rgba(37,75,206,0.12)', borderRadius: 10, display: 'flex', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Added to draw</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#254BCE' }}>{formatCurrencyFull(rolled)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Monthly minimums removed</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#016163' }}>−${saved}/mo</div>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div style={{ height: 1, background: 'rgba(0,22,96,0.07)', margin: '16px 0' }} />

                {/* Co-borrower income */}
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Add a co-borrower</div>
                  <div style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 12 }}>Adding a spouse or partner's income reduces your DTI and improves approval odds.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#001660', marginBottom: 6 }}>Co-borrower name</div>
                      <input value={coBorrowerName} onChange={e => setCoBorrowerName(e.target.value)}
                        placeholder="Full legal name"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', fontSize: 15, border: '1.5px solid rgba(0,22,96,0.15)', borderRadius: 10, outline: 'none', fontFamily: 'inherit', color: '#111827' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#001660', marginBottom: 6 }}>Annual income</div>
                      <input value={coBorrowerIncome} onChange={e => setCoBorrowerIncome(e.target.value)}
                        placeholder="e.g. $80,000"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', fontSize: 15, border: '1.5px solid rgba(0,22,96,0.15)', borderRadius: 10, outline: 'none', fontFamily: 'inherit', color: '#111827' }} />
                    </div>
                    {coBorrowerDTI !== null && (
                      <div style={{ padding: '10px 14px', background: coBorrowerDTI <= DTI_THRESHOLD ? 'rgba(1,97,99,0.07)' : '#FFF9ED', border: `1px solid ${coBorrowerDTI <= DTI_THRESHOLD ? 'rgba(1,97,99,0.2)' : 'rgba(234,179,8,0.3)'}`, borderRadius: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: coBorrowerDTI <= DTI_THRESHOLD ? '#016163' : '#92400e' }}>
                          Projected DTI: {Math.round(coBorrowerDTI * 100)}% {coBorrowerDTI <= DTI_THRESHOLD ? '✓ Qualifies' : '— still above 45%'}
                        </div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                          {coBorrowerDTI <= DTI_THRESHOLD ? 'Adding this co-borrower would meet lender requirements.' : 'Try a higher income amount.'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ height: 1, background: 'rgba(0,22,96,0.07)', margin: '16px 0' }} />

                {/* Switch primary applicant */}
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Switch primary applicant to spouse</div>
                  <div style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 12 }}>Running the loan in your spouse's name uses their income and debts — often a stronger profile.</div>
                  <div style={{ background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.09)', borderRadius: 11, padding: '14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#001660', marginBottom: 10 }}>Maria Rivera — spouse profile</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[{ l: 'Annual income', v: '$148,000' }, { l: 'Monthly debts', v: '$1,840' }, { l: 'Credit score', v: '748' }, { l: 'Projected DTI', v: '38%', good: true }].map(r => (
                        <div key={r.l}>
                          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>{r.l}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: r.good ? '#016163' : '#001660' }}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setSwitchedPrimary(p => !p)} style={{
                    width: '100%', padding: '12px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                    background: switchedPrimary ? '#016163' : '#001660', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.2s'
                  }}>
                    {switchedPrimary ? '✓ Switched to Maria Rivera' : 'Switch to Maria Rivera →'}
                  </button>
                </div>

                </div>{/* end DTI highlight wrapper */}

                <div style={{ height: 1, background: 'rgba(0,22,96,0.07)', margin: '20px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Save 0.25% with AutoPay</div>
                    <div style={{ fontSize: 15, color: '#9CA3AF' }}>Auto-debit from your bank — cancel anytime</div>
                  </div>
                  <div onClick={() => setAutopay(a => !a)} style={{ width: 46, height: 26, borderRadius: 13, cursor: 'pointer', flexShrink: 0, marginLeft: 16, background: autopay ? '#016163' : 'rgba(0,22,96,0.15)', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: 3, left: autopay ? 22 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s cubic-bezier(0.22,1,0.36,1)' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['🔒 No obligation', '📋 No hard credit pull yet', '⏱️ Takes 5 minutes'].map(t => (
              <div key={t} style={{ background: '#fff', border: '1px solid rgba(0,22,96,0.1)', borderRadius: 100, padding: '5px 12px', fontSize: 13, fontWeight: 600, color: '#6B7280' }}>{t}</div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>Estimates are illustrative only. Final terms subject to full underwriting and appraisal. Not a commitment to lend.</div>

          <div style={{ paddingTop: 8, borderTop: '1px solid rgba(0,22,96,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setOfferSub(0)} style={{ padding: '10px 20px', fontSize: 15, fontWeight: 600, borderRadius: 10, border: '1.5px solid rgba(0,22,96,0.15)', background: 'none', color: '#001660', cursor: 'pointer' }}>← Back</button>
              <button onClick={handleNext} style={{ padding: '11px 24px', fontSize: 15, fontWeight: 800, borderRadius: 11, background: dtiTooHigh ? '#991B1B' : '#254BCE', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 3px 14px rgba(37,75,206,0.3)', transition: 'transform 0.15s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseOut={e => e.currentTarget.style.transform = ''}>
                {dtiTooHigh ? '⚠️ Continue anyway' : `Continue with ${formatCurrencyFull(selectedPayment)}/mo →`}
              </button>
            </div>
          </div>
        </div>

        {/* Right — Borrowing Power */}
        <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 24 }}>
          <BorrowingPowerPanel step1={step1} maxCredit={maxCredit} />
        </div>
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
      <div style={{ fontSize: 13, fontWeight: 700, color: accent ? '#254BCE' : '#001660', flexShrink: 0 }}>{value}</div>
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
      note: 'Slightly reduced to ease you in',
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
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)', marginBottom: 5 }}>Your Loan Plan</div>
        {/* Hero amount */}
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: 3 }}>
          {formatCurrencyFull(heroAmount)}
        </div>
        {/* Product + APR on its own line */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>
          {productType === 'heloan' ? 'HELOAN' : 'HELOC'} · {apr}% APR
        </div>
        {/* Math breakdown or subtitle */}
        {accrued > 0 ? (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
            You're borrowing {formatCurrencyFull(raw.withdrawNow)}. Since you're not making payments for the first 6 months, {formatCurrencyFull(accrued)} gets added — so your loan starts at {formatCurrencyFull(heroAmount)}.
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
            {productType === 'heloc'
              ? `${formatCurrencyFull(raw.creditLimit)} credit line · ${formatCurrencyFull(raw.withdrawNow)} drawn`
              : 'Fixed rate · full amount at closing'}
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
                    <span style={{ fontSize: step.payment === 0 ? 22 : 19, fontWeight: 900, color: step.final ? '#001660' : dotColors[Math.min(i, dotColors.length - 1)], letterSpacing: '-0.4px', lineHeight: 1 }}>
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
// Screen: More Info (Step 3a)
// ─────────────────────────────────────────────────────────────────────────────
function ScreenMoreInfo({ step3, dispatch }) {
  const set = (field, value) => dispatch({ type: 'SET_STEP3', field, value })
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Step 3 of 7</div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#001660' }}>Verify your property & income</h1>
        <p className="text-sm text-gray-500">We already know your equity position. These details allow OWNING to confirm your final loan terms.</p>
      </div>

      <Card>
        <CardHeader title="Property details" />
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Property occupancy">
              <Select value={step3.propOccupancy} onChange={v => set('propOccupancy', v)}
                options={['Primary residence','Secondary residence','Investment property']} />
            </Field>
            <Field label="HOA community?">
              <Select value={step3.hoa} onChange={v => set('hoa', v)} options={['No','Yes']} />
            </Field>
            <Field label="In a flood zone?">
              <Select value={step3.floodZone} onChange={v => set('floodZone', v)} options={['No','Yes — Zone A','Yes — Zone V']} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Employment & income" sub="Used for debt-to-income calculation" />
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Employment status">
              <Select value={step3.employmentStatus} onChange={v => set('employmentStatus', v)}
                options={['Full-time employed','Part-time employed','Self-employed','Retired','Not employed']} />
            </Field>
            <Field label="Employer name">
              <Input value={step3.employer} onChange={v => set('employer', v)} />
            </Field>
            <Field label="Years at current employer">
              <Input value={step3.yearsEmployed} onChange={v => set('yearsEmployed', v)} placeholder="0" />
            </Field>
            <Field label="Annual gross income">
              <Input value={step3.annualIncome} onChange={v => set('annualIncome', v)} placeholder="$0" />
            </Field>
            <Field label="Monthly debt obligations" helper="(min payments)">
              <Input value={step3.monthlyExpenses} onChange={v => set('monthlyExpenses', v)} placeholder="$0" />
            </Field>
          </div>
        </CardBody>
      </Card>

      <NavButtons
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={() => dispatch({ type: 'NEXT' })}
        nextLabel="Continue to Income Verification" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Link Income (Step 3b) — Plaid-style mock
// ─────────────────────────────────────────────────────────────────────────────
function ScreenLinkIncome({ dispatch }) {
  const [phase, setPhase] = useState('select') // select | connecting | done
  const [selectedBank, setSelectedBank] = useState(null)
  const [progress, setProgress] = useState(0)

  function handleConnect(bank) {
    setSelectedBank(bank)
    setPhase('connecting')
    setProgress(0)
    const steps = [25, 55, 80, 100]
    let i = 0
    const interval = setInterval(() => {
      if (i < steps.length) { setProgress(steps[i]); i++ }
      else { clearInterval(interval); setTimeout(() => setPhase('done'), 400) }
    }, 600)
  }

  const banks = [
    { id: 'bofa', name: 'Bank of America', color: '#E31837' },
    { id: 'chase', name: 'Chase', color: '#117ACA' },
    { id: 'wells', name: 'Wells Fargo', color: '#CC0000' },
    { id: 'citi', name: 'Citibank', color: '#003F83' },
    { id: 'usbank', name: 'US Bank', color: '#00274D' },
    { id: 'other', name: 'Other institution', color: '#6B7280' },
  ]

  return (
    <div className="">
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Step 3 of 7 — Income Verification</div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#001660' }}>Verify your income</h1>
        <p className="text-sm text-gray-500">OWNING requires income verification to finalize your loan. Securely link your bank — read-only access, takes about 30 seconds.</p>
      </div>

      {phase === 'select' && (
        <Card>
          <CardHeader title="Select your bank" sub="Powered by Plaid · 256-bit encryption" />
          <CardBody>
            <div className="grid grid-cols-2 gap-2">
              {banks.map(b => (
                <button key={b.id} onClick={() => handleConnect(b)}
                  className="flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                  style={{ borderColor: 'rgba(0,22,96,0.1)', background: '#fff' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#F8F9FC')}
                  onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[11px] font-black"
                    style={{ background: b.color }}>{b.name[0]}</div>
                  <span className="text-[12px] font-medium" style={{ color: '#001660' }}>{b.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => dispatch({ type: 'NEXT' })}
              className="w-full mt-3 py-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
              Skip — I'll provide documents manually
            </button>
          </CardBody>
        </Card>
      )}

      {phase === 'connecting' && (
        <Card>
          <CardBody>
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-xl font-black"
                style={{ background: selectedBank?.color }}>{selectedBank?.name[0]}</div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#001660' }}>Connecting to {selectedBank?.name}…</div>
              <div className="text-[11px] text-gray-400 mb-5">Authenticating securely · Do not close this window</div>
              <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(0,22,96,0.07)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: '#254BCE' }} />
              </div>
              <div className="text-[10px] text-gray-400">
                {progress < 40 ? 'Establishing secure connection…' : progress < 75 ? 'Verifying credentials…' : 'Reading account data…'}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {phase === 'done' && (
        <>
          <Card>
            <CardBody>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#ECFDF5' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: '#001660' }}>Account connected</div>
                  <div className="text-[11px] text-gray-400">{selectedBank?.name} · Checking ····8241</div>
                </div>
              </div>
              <div className="rounded-xl p-4 space-y-2.5" style={{ background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.06)' }}>
                {[['Avg. monthly income','$10,334'],['Avg. monthly deposits','$11,020'],['Avg. account balance','$28,450'],['Months of data','14 months']].map(([l,v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-[11px] text-gray-500">{l}</span>
                    <span className="text-[12px] font-bold" style={{ color: '#001660' }}>{v}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
          <div className="mt-4">
            <NavButtons onBack={() => dispatch({ type: 'BACK' })} onNext={() => dispatch({ type: 'NEXT' })} nextLabel="Continue to Identity Verification" />
          </div>
        </>
      )}
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
        <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Step 3 of 7 — Identity Verification</div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#001660' }}>Verify your identity</h1>
        <p className="text-sm text-gray-500">Required by federal law. Your information is encrypted and never shared.</p>
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
        nextLabel="Submit Application" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Property Verify Wait — auto-advances after delay
// ─────────────────────────────────────────────────────────────────────────────
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
        <h2 className="text-xl font-bold mb-2" style={{ color: '#001660' }}>Verifying your property</h2>
        <p className="text-sm text-gray-500 mb-6">This automated check usually completes in a few seconds.</p>
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
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,75,206,0.08)', border: '1px solid rgba(37,75,206,0.15)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#001660' }}>Under operations review</h2>
            <div className="text-sm" style={{ color: '#254BCE' }}>Estimated: 1–2 business days</div>
          </div>
        </div>
        <Card>
          <CardBody>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Your application has been flagged for a brief manual review by our operations team. This is a standard step for certain loan profiles.
              </p>
              <div className="rounded-xl p-4 space-y-2" style={{ background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.06)' }}>
                {[
                  ['Application ID','GL-2026-019234'],
                  ['Submitted','Today at 2:14 PM'],
                  ['Reviewer assigned','Pending'],
                  ['Expected completion','1–2 business days'],
                ].map(([l,v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-[11px] text-gray-500">{l}</span>
                    <span className="text-[11px] font-semibold" style={{ color: '#001660' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-gray-400">We'll notify you by email and SMS when the review is complete. Your GreenLyne specialist is available at (877) 265-0703 to check status.</div>
              <div className="text-[10px] text-gray-400">Use the Sim Controls panel to advance this state.</div>
            </div>
          </CardBody>
        </Card>
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

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3" style={{ background: '#ECFDF5', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold text-emerald-700">Conditionally approved</span>
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#001660' }}>Your pre-configured offer is confirmed</h1>
        <p className="text-sm text-gray-500">GreenLyne built this loan specifically for your solar project at 1482 Sunridge Drive. Review and accept to proceed to closing.</p>
      </div>

      {/* Hero offer card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(37,75,206,0.2)', boxShadow: '0 4px 24px rgba(37,75,206,0.1)' }}>
        <div className="px-6 py-5" style={{ background: '#001660' }}>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-1">Credit limit approved</div>
              <div className="text-4xl font-bold text-white">{formatCurrencyFull(displayLoan.creditLimit)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-white/50 mb-1">Initial draw</div>
              <div className="text-2xl font-bold" style={{ color: '#60A5FA' }}>{formatCurrencyFull(displayLoan.withdrawNow)}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x" style={{ background: '#fff', borderTop: '1px solid rgba(37,75,206,0.1)', divideColor: 'rgba(37,75,206,0.1)' }}>
          {[
            { l: 'Draw Payment', v: `${formatCurrencyFull(displayLoan.drawPayment)}/mo`, s: 'Interest only · 10 yr' },
            { l: 'Repay Payment', v: `${formatCurrencyFull(displayLoan.repayPayment)}/mo`, s: 'P+I · 20 yr' },
            { l: 'APR', v: `${displayLoan.apr}%`, s: `Rate ${tierData.rate}% · Fee ${tierData.fee}%` },
          ].map(item => (
            <div key={item.l} className="px-5 py-4">
              <div className="text-[10px] text-gray-400 mb-0.5">{item.l}</div>
              <div className="text-base font-bold" style={{ color: '#001660' }}>{item.v}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{item.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional terms */}
      <Card>
        <CardHeader title="Full loan terms" />
        <CardBody>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Product type', 'HELOC (Variable rate)'],
              ['Draw period', '10 years'],
              ['Repayment period', '20 years'],
              ['Total term', '30 years'],
              ['Origination fee', `${formatCurrencyFull(displayLoan.originationFee)} (rolled in)`],
              ['Cash at closing', '$0'],
              ['Available after draw', formatCurrencyFull(displayLoan.availableAfter)],
              ['Prepayment penalty', 'None'],
            ].map(([l,v]) => (
              <div key={l}>
                <div className="text-[12px] text-gray-400 mb-1">{l}</div>
                <div className="text-[17px] font-semibold" style={{ color: '#001660' }}>{v}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Acknowledgment */}
      <div className="rounded-2xl p-4" style={{ background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.07)' }}>
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative shrink-0 mt-0.5">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" />
            <div className="w-4 h-4 rounded flex items-center justify-center border transition-all"
              style={{ borderColor: agreed ? '#254BCE' : 'rgba(0,22,96,0.2)', background: agreed ? '#254BCE' : '#fff' }}>
              {agreed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
          </div>
          <div className="text-[11px] text-gray-600 leading-relaxed">
            I have reviewed and understand the loan terms. I authorize Figure Lending to proceed with the closing process. This is not a final binding agreement until documents are signed.
          </div>
        </label>
      </div>

      <div className="flex items-center justify-between pb-8">
        <div className="flex gap-3">
          <button onClick={() => dispatch({ type: 'BACK' })}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl border transition-colors"
            style={{ borderColor: 'rgba(0,22,96,0.15)', color: '#001660', background: '#fff' }}>
            ← Back
          </button>
          <button onClick={() => dispatch({ type: 'DECLINE_OFFER' })}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl border transition-colors"
            style={{ borderColor: 'rgba(0,22,96,0.15)', color: 'rgba(0,22,96,0.5)', background: '#fff' }}>
            Decline offer
          </button>
        </div>
        <button onClick={() => dispatch({ type: 'ACCEPT' })} disabled={!agreed}
          className="py-2.5 px-6 text-sm font-bold rounded-xl transition-all"
          style={{ background: agreed ? '#254BCE' : 'rgba(0,22,96,0.2)', color: '#fff',
            boxShadow: agreed ? '0 4px 16px rgba(37,75,206,0.3)' : 'none', cursor: agreed ? 'pointer' : 'not-allowed' }}>
          Accept Offer & Proceed to Closing →
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
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#001660' }}>We're unable to approve at this time</h2>
        <p className="text-sm text-gray-500 mb-6">
          Based on our assessment, we couldn't approve your HELOC application today. This is not a reflection of your overall creditworthiness.
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
// Screen: C·1 — Docs Preparing
// ─────────────────────────────────────────────────────────────────────────────
function ScreenDocsPreparing({ dispatch }) {
  return (
    <div className="">
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
      <button onClick={() => dispatch({ type: 'NEXT' })}
        className="text-xs text-gray-400 underline block text-center w-full mt-4"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        [Demo] Documents ready →
      </button>
    </div>
  )
}

// Screen: C·2 — Ready to Schedule
// ─────────────────────────────────────────────────────────────────────────────
function ScreenReadyToSchedule({ dispatch }) {
  return (
    <div className="space-y-4">
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

// Screen: C·3 — Notary Scheduled
// ─────────────────────────────────────────────────────────────────────────────
function ScreenNotaryScheduled({ dispatch }) {
  return (
    <div className="space-y-4" style={{ padding: '32px 32px 64px', maxWidth: 680 }}>
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

// Screen: C·4 — Signing in Progress
// ─────────────────────────────────────────────────────────────────────────────
function ScreenSigningInProgress({ dispatch }) {
  return (
    <div className="space-y-4">
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

// Screen: C·5 — Loan Closed
// ─────────────────────────────────────────────────────────────────────────────
function ScreenLoanClosed({ dispatch }) {
  return (
    <div className="space-y-4">
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
      case S.OFFER_SELECT:         return <ScreenOfferSelectNew step2={step2} step1={step1} dispatch={dispatch} savedConfig={state.step2Config} />
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
  const flexScreens = new Set([S.PROPERTY_VERIFY_WAIT, S.APPRAISAL_WAIT, S.OPS_REVIEW_WAIT, S.NOTARY_SCHEDULED])
  const isFlexScreen = flexScreens.has(app)

  // Show the persistent offer sidebar on all screens except OFFER_SELECT (has its own live panel)
  const showOfferSidebar = app !== S.OFFER_SELECT && app !== S.BASIC_INFO

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
              {showOfferSidebar && <OfferSidebar loan={loan} step2={step2} />}
            </div>
          )}
        </main>
      </div>
      {simOpen && <SimPanel sim={sim} appState={app} dispatch={dispatch} />}
    </div>
  )
}
