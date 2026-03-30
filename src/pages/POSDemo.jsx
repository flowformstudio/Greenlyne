/**
 * Greenlyne POS Flow Demo — State-Machine HELOC Application
 * 16 application states across 7 phases
 */

import { useState, useMemo, useReducer, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { calcLoan, FEE_TIERS, DEFERRED_OPTIONS, formatCurrencyFull } from '../lib/loanCalc'

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
  { n: 1, label: 'Confirm Details',   states: [S.BASIC_INFO] },
  { n: 2, label: 'Loan Options',      states: [S.OFFER_SELECT] },
  { n: 3, label: 'Verify & Confirm',  states: [S.MORE_INFO, S.LINK_INCOME, S.VERIFY_IDENTITY, S.PROPERTY_VERIFY_WAIT, S.APPRAISAL_WAIT] },
  { n: 4, label: 'Final Offer',       states: [S.OPS_REVIEW_WAIT, S.FINAL_OFFER, S.DECLINED] },
  { n: 5, label: 'Review & Sign',     states: [S.DOCS_PREPARING, S.READY_TO_SCHEDULE] },
  { n: 6, label: 'Closing',           states: [S.NOTARY_SCHEDULED, S.SIGNING_IN_PROGRESS, S.LOAN_CLOSED] },
  { n: 7, label: 'Funded',            states: [S.FUNDED] },
]

const SEED = { projectCost: 45000, maxCredit: 294821, minCredit: 25000, defaultCredit: 161080, defaultWithdraw: 112134 }

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
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    case 'NEXT': {
      const nextMap = {
        [S.BASIC_INFO]:      S.OFFER_SELECT,
        [S.OFFER_SELECT]:    S.MORE_INFO,
        [S.MORE_INFO]:       S.LINK_INCOME,
        [S.LINK_INCOME]:     S.VERIFY_IDENTITY,
        [S.VERIFY_IDENTITY]: S.PROPERTY_VERIFY_WAIT,
        [S.DOCS_PREPARING]:  S.READY_TO_SCHEDULE,
      }
      const next = nextMap[state.app]
      if (!next) return state
      const updates = {}
      if (action.loan)  updates.loan  = action.loan
      if (action.step2) updates.step2 = action.step2
      return { ...state, app: next, ...updates }
    }
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
    case 'SET_STEP1': return { ...state, step1: { ...state.step1, [action.field]: action.value } }
    case 'SET_STEP3': return { ...state, step3: { ...state.step3, [action.field]: action.value } }
    case 'SET_SIM':   return { ...state, sim: { ...state.sim, [action.key]: action.value } }
    case 'TOGGLE_SIM':return { ...state, simOpen: !state.simOpen }
    case 'RESTART':   return { ...initialState }
    default: return state
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n)  { return '$' + Math.round(n).toLocaleString() }

// ─── UI Primitives ─────────────────────────────────────────────────────────────
function Field({ label, helper, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: '#001660' }}>
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
      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
      style={{ border: '1px solid rgba(0,22,96,0.15)', background: readOnly ? '#F8F9FC' : '#fff', color: readOnly ? 'rgba(0,22,96,0.5)' : '#001660' }}
      onFocus={e => !readOnly && (e.target.style.borderColor = '#254BCE')}
      onBlur={e => (e.target.style.borderColor = 'rgba(0,22,96,0.15)')}
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none appearance-none"
        style={{ border: '1px solid rgba(0,22,96,0.15)', background: '#fff', color: '#001660', paddingRight: '2rem', cursor: 'pointer' }}>
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
function CardBody({ children }) { return <div className="px-7 py-6">{children}</div> }
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
    <div className="flex items-center gap-3 pt-2 pb-8">
      {showBack && (
        <button onClick={onBack} className="px-5 py-2.5 text-sm font-semibold rounded-xl border transition-colors"
          style={{ borderColor: 'rgba(0,22,96,0.15)', color: '#001660', background: '#fff' }}
          onMouseOver={e => (e.currentTarget.style.background = '#F8F9FC')}
          onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
          ← Back
        </button>
      )}
      <button className="px-5 py-2.5 text-sm font-medium rounded-xl border transition-colors"
        style={{ borderColor: 'rgba(0,22,96,0.15)', color: 'rgba(0,22,96,0.55)', background: '#fff' }}
        onMouseOver={e => (e.currentTarget.style.background = '#F8F9FC')}
        onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
        Save for later
      </button>
      <button onClick={onNext} disabled={disabled}
        className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        style={{ background: disabled ? 'rgba(0,22,96,0.2)' : '#254BCE', color: '#fff',
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
    <div className="border-b px-6 py-3 flex items-center gap-4 shrink-0" style={{ background: '#fff', borderColor: 'rgba(0,22,96,0.08)' }}>
      <div className="flex items-center gap-2.5 flex-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#001660' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: '#001660' }}>Westhaven Power</div>
          <div className="text-[10px] text-gray-400">Solar Installation · {fmt(SEED.projectCost)} · Westhaven Power</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,22,96,0.04)' }}>
        <span className="text-[11px] font-medium" style={{ color: 'rgba(0,22,96,0.5)' }}>
          Financing by <strong style={{ color: '#001660' }}>OWNING</strong> · Powered by <strong style={{ color: '#254BCE' }}>GreenLyne</strong>
        </span>
      </div>
      <button onClick={onToggleSim}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
        style={{ background: 'rgba(37,75,206,0.08)', color: '#254BCE', border: '1px solid rgba(37,75,206,0.2)' }}
        onMouseOver={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.14)')}
        onMouseOut={e => (e.currentTarget.style.background = 'rgba(37,75,206,0.08)')}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
        Sim Controls
      </button>
      <button className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Need help?
      </button>
      <button onClick={onViewEmail} className="text-[11px] font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
        style={{ color: 'rgba(0,22,96,0.5)' }}
        onMouseOver={e => (e.currentTarget.style.background = '#F8F9FC')}
        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        View email
      </button>
      <button onClick={onRestart} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
        Restart demo
      </button>
    </div>
  )
}

// Jump targets — first state in each step group
const STEP_JUMP = {
  1: S.BASIC_INFO,
  2: S.OFFER_SELECT,
  3: S.MORE_INFO,
  4: S.FINAL_OFFER,
  5: S.DOCS_PREPARING,
  6: S.SIGNING_IN_PROGRESS,
  7: S.FUNDED,
}

// ─── Step sidebar (7 steps) ────────────────────────────────────────────────────
function StepSidebar({ appState, dispatch }) {
  const currentStep = SIDEBAR_STEPS.find(s => s.states.includes(appState))?.n ?? 1
  const isHidden = appState === S.FUNDED
  if (isHidden) return null
  return (
    <div className="w-56 shrink-0 flex flex-col" style={{ background: '#fff', borderRight: '1px solid rgba(0,22,96,0.08)' }}>
      <div className="px-5 pt-6 pb-4">
        <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(0,22,96,0.35)' }}>Application steps</div>
      </div>
      <nav className="flex flex-col px-3 gap-0.5 flex-1">
        {SIDEBAR_STEPS.map((s, i) => {
          const done   = s.n < currentStep
          const active = s.n === currentStep
          const future = s.n > currentStep
          return (
            <div key={s.n} className="flex flex-col">
              <button
                onClick={() => dispatch({ type: 'JUMP_TO', state: STEP_JUMP[s.n] })}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all"
                style={{ background: active ? 'rgba(37,75,206,0.07)' : 'transparent', cursor: 'pointer' }}
                onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(0,22,96,0.04)' }}
                onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold"
                  style={{ background: done ? '#10B981' : active ? '#254BCE' : 'rgba(0,22,96,0.08)', color: (done || active) ? '#fff' : 'rgba(0,22,96,0.3)' }}>
                  {done
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : s.n}
                </div>
                <div>
                  <div className="text-[13px] leading-snug"
                    style={{ fontWeight: active ? 700 : 500, color: active ? '#001660' : done ? '#6B7280' : 'rgba(0,22,96,0.3)' }}>
                    {s.label}
                  </div>
                  {done   && <div className="text-[11px] text-emerald-600 mt-0.5">Completed</div>}
                  {active && <div className="text-[11px] mt-0.5" style={{ color: '#254BCE' }}>In progress</div>}
                  {future && <div className="text-[11px] text-gray-300 mt-0.5">Upcoming</div>}
                </div>
              </button>
              {i < SIDEBAR_STEPS.length - 1 && (
                <div className="ml-6 w-px h-3" style={{ background: done ? '#10B981' : 'rgba(0,22,96,0.08)' }} />
              )}
            </div>
          )
        })}
      </nav>
      <div className="px-5 py-5 mt-auto">
        <div className="text-[11px] text-gray-400 leading-relaxed">
          Your progress is saved automatically. You can return at any time.
        </div>
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
// Screen: Basic Info (Step 1)
// ─────────────────────────────────────────────────────────────────────────────
function ScreenBasicInfo({ step1, dispatch }) {
  const set = (field, value) => dispatch({ type: 'SET_STEP1', field, value })
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#001660' }}>Confirm your details</h1>
        <p className="text-sm text-gray-500">GreenLyne pre-filled this from your pre-approval. Review and confirm — you're not starting from scratch.</p>
      </div>
      <Card>
        <CardHeader title="Personal information" />
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name"><Input value={step1.firstName} onChange={v => set('firstName', v)} /></Field>
            <Field label="Last name"><Input value={step1.lastName} onChange={v => set('lastName', v)} /></Field>
            <Field label="Date of birth"><Input value={step1.dob} onChange={v => set('dob', v)} placeholder="MM/DD/YYYY" /></Field>
            <Field label="SSN" helper="(last 4 digits)"><Input value={step1.ssn4} onChange={v => set('ssn4', v)} placeholder="_ _ _ _" /></Field>
            <Field label="Phone number"><Input value={step1.phone} onChange={v => set('phone', v)} /></Field>
            <Field label="Email address"><Input value={step1.email} onChange={v => set('email', v)} /></Field>
            <Field label="Marital status">
              <Select value={step1.marital} onChange={v => set('marital', v)}
                options={['Single','Married','Separated','Divorced','Widowed']} />
            </Field>
            <Field label="Financing purpose">
              <Select value={step1.purpose} onChange={v => set('purpose', v)}
                options={['Home improvement','Debt consolidation','Major purchase','Emergency funds','Other']} />
            </Field>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Property information" />
        <CardBody>
          <div className="space-y-4">
            <Field label="Property address"><Input value={step1.address} onChange={v => set('address', v)} /></Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="City"><Input value={step1.city} onChange={v => set('city', v)} /></Field>
              <Field label="State"><Input value={step1.state} onChange={v => set('state', v)} /></Field>
              <Field label="ZIP"><Input value={step1.zip} onChange={v => set('zip', v)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Property type">
                <Select value={step1.propType} onChange={v => set('propType', v)}
                  options={['Primary residence','Secondary residence','Investment property']} />
              </Field>
              <Field label="Ownership type">
                <Select value={step1.ownership} onChange={v => set('ownership', v)}
                  options={['Sole owner','Joint ownership','Trust']} />
              </Field>
              <Field label="Estimated property value">
                <Input value={step1.propValue} onChange={v => set('propValue', v)} placeholder="$0" />
              </Field>
              <Field label="Current mortgage balance">
                <Input value={step1.mortgageBalance} onChange={v => set('mortgageBalance', v)} placeholder="$0" />
              </Field>
            </div>
          </div>
        </CardBody>
      </Card>
      <NavButtons showBack={false} onNext={() => dispatch({ type: 'NEXT' })} nextLabel="Save & Continue" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Offer Select (Step 2) — inline loan configurator
// ─────────────────────────────────────────────────────────────────────────────
function ScreenOfferSelect({ step2, step1, dispatch }) {
  const maxCredit = SEED.maxCredit
  const [creditLimit, setCreditLimit]       = useState(step2.creditLimit)
  const [withdrawNow, setWithdrawNow]       = useState(step2.withdrawNow)
  const [tier, setTier]                     = useState(step2.tier)
  const [deferredMonths, setDeferredMonths] = useState(step2.deferredMonths)
  const [autopay, setAutopay]               = useState(step2.autopay)

  const safeWithdraw = Math.min(withdrawNow, creditLimit)
  const loan = useMemo(() => calcLoan({ creditLimit, withdrawNow: safeWithdraw, tier, deferredMonths }), [creditLimit, safeWithdraw, tier, deferredMonths])
  const displayApr = autopay ? (parseFloat(loan.apr) - 0.25).toFixed(2) : loan.apr

  function handleNext() {
    const s2 = { creditLimit, withdrawNow: safeWithdraw, tier, deferredMonths, autopay }
    dispatch({ type: 'NEXT', step2: s2, loan: { ...loan, apr: displayApr } })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-header */}
      <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(0,22,96,0.07)', background: '#F8F9FC' }}>
        <h1 className="text-xl font-bold" style={{ color: '#001660' }}>Configure your HELOC offer</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          You're approved for up to <strong style={{ color: '#254BCE' }}>{formatCurrencyFull(maxCredit)}</strong>.
          Adjust the terms to fit your project.
        </p>
      </div>

      {/* Two-column body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left — controls */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{ borderRight: '1px solid rgba(0,22,96,0.07)' }}>

          {/* Card 1 — Loan Amount */}
          <Card>
            <CardHeader title="Loan Amount" />
            <CardBody>
              <div className="space-y-5">
                {/* Credit limit */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Credit Limit</div>
                    <div className="text-base font-bold" style={{ color: '#001660' }}>{formatCurrencyFull(creditLimit)}</div>
                  </div>
                  <RangeSlider value={creditLimit} min={SEED.minCredit} max={maxCredit} step={5000}
                    onChange={v => { setCreditLimit(v); if (withdrawNow > v) setWithdrawNow(v) }}
                    formatLabel={v => formatCurrencyFull(v)} />
                </div>

                {/* Withdraw at closing */}
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Withdraw at Closing</div>
                    <div className="text-base font-bold" style={{ color: '#254BCE' }}>{formatCurrencyFull(safeWithdraw)}</div>
                  </div>
                  <div className="text-[10px] text-gray-400 mb-2">Rest stays in your line to draw anytime</div>
                  <RangeSlider value={safeWithdraw} min={0} max={creditLimit} step={5000}
                    onChange={v => setWithdrawNow(v)} formatLabel={v => formatCurrencyFull(v)} />
                  <CreditBar withdrawNow={safeWithdraw} creditLimit={creditLimit} />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Card 2 — Rate & Terms */}
          <Card>
            <CardHeader title="Rate & Terms" />
            <CardBody>
              <div className="space-y-5">
                {/* Rate / fee tier */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Rate & Origination Fee</div>
                  <div className="text-[10px] text-gray-400 mb-2.5">Higher fee = lower rate. Fee rolled into loan — no cash at closing.</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FEE_TIERS.map((t, i) => {
                      const active = tier === i
                      return (
                        <button key={i} onClick={() => setTier(i)}
                          className="rounded-xl p-2.5 text-left transition-all border"
                          style={{ borderColor: active ? '#254BCE' : 'rgba(0,22,96,0.1)', background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC' }}>
                          <div className="text-[10px] text-gray-400 mb-0.5">{t.label}</div>
                          <div className="text-sm font-bold" style={{ color: active ? '#254BCE' : '#001660' }}>{t.rateLabel}</div>
                          <div className="text-[10px] text-gray-400">{t.feeLabel} fee</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Defer first payment */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Defer First Payment</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {DEFERRED_OPTIONS.map(opt => {
                      const active = deferredMonths === opt.months
                      return (
                        <button key={opt.months} onClick={() => setDeferredMonths(opt.months)}
                          className="rounded-xl py-2 px-1 text-center transition-all border"
                          style={{ borderColor: active ? '#254BCE' : 'rgba(0,22,96,0.1)', background: active ? 'rgba(37,75,206,0.06)' : '#F8F9FC' }}>
                          <div className="text-[11px] font-bold leading-tight" style={{ color: active ? '#254BCE' : '#001660' }}>
                            {opt.months === 0 ? 'None' : `${opt.months}mo`}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Autopay */}
                <div className="rounded-xl px-4 py-3" style={{ background: '#F8F9FC', border: '1px solid rgba(0,22,96,0.07)' }}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative shrink-0 mt-0.5">
                      <input type="checkbox" checked={autopay} onChange={e => setAutopay(e.target.checked)} className="sr-only" />
                      <div className="w-4 h-4 rounded flex items-center justify-center border transition-all"
                        style={{ borderColor: autopay ? '#254BCE' : 'rgba(0,22,96,0.2)', background: autopay ? '#254BCE' : '#fff' }}>
                        {autopay && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: '#001660' }}>Save 0.25% APR with AutoPay</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Enroll in automatic payments from your disbursement account</div>
                    </div>
                  </label>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="text-[10px] text-gray-400 leading-relaxed pb-1">
            Estimates are illustrative only. Final terms subject to full underwriting and appraisal. Not a commitment to lend.
          </div>
        </div>

        {/* Right — live terms */}
        <div className="w-[230px] shrink-0 p-3">
          <div className="flex flex-col gap-0 rounded-2xl overflow-hidden h-full" style={{ border: '1px solid rgba(0,22,96,0.1)' }}>
            <div className="px-5 py-4 shrink-0" style={{ background: '#001660' }}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Terms of your offer</div>
              <div className="text-3xl font-bold text-white leading-none">{formatCurrencyFull(safeWithdraw)}</div>
              <div className="text-xs text-white/50 mt-1">Initial draw amount</div>
            </div>
            <div className="flex-1 px-5 py-4 space-y-3.5" style={{ background: '#F8F9FC' }}>
              <TermRow label="Draw period payment" value={`${formatCurrencyFull(loan.drawPayment)}/mo`} sub="Interest only · 10 yr" accent />
              <TermRow label="Repayment payment" value={`${formatCurrencyFull(loan.repayPayment)}/mo`} sub="Principal + interest · 20 yr" />
              <div className="border-t border-gray-100 pt-3 space-y-2.5">
                <TermRow label="APR" value={`${displayApr}%`} />
                <TermRow label="Interest rate" value={`${FEE_TIERS[tier].rate}%`} />
                <TermRow label="Origination fee" value={formatCurrencyFull(loan.originationFee)} sub={`${FEE_TIERS[tier].fee}% · rolled in`} />
                <TermRow label="Credit limit" value={formatCurrencyFull(creditLimit)} />
                <TermRow label="Available after draw" value={formatCurrencyFull(creditLimit - safeWithdraw)} />
              </div>
              {deferredMonths > 0 && (
                <div className="rounded-xl px-3 py-2.5" style={{ background: '#FFF9ED', border: '1px solid rgba(234,179,8,0.25)' }}>
                  <div className="text-[10px] font-semibold text-amber-700 mb-0.5">Deferred {deferredMonths} months</div>
                  <div className="text-[10px] text-amber-600">Interest accrues · first payment deferred</div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 shrink-0 border-t border-gray-100" style={{ background: '#fff' }}>
              <div className="text-[10px] text-gray-400">Cash required at closing: <strong>$0</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-3.5 border-t border-gray-100" style={{ background: '#fff' }}>
        <div className="flex gap-2.5">
          <button onClick={() => dispatch({ type: 'BACK' })}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl border transition-colors"
            style={{ borderColor: 'rgba(0,22,96,0.15)', color: '#001660' }}>
            ← Back
          </button>
          <button onClick={handleNext}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors"
            style={{ background: '#254BCE', color: '#fff' }}
            onMouseOver={e => (e.currentTarget.style.background = '#1e3fa8')}
            onMouseOut={e => (e.currentTarget.style.background = '#254BCE')}>
            Accept Terms & Continue →
          </button>
        </div>
      </div>
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
      <div className={large ? 'text-[14px] font-bold shrink-0' : 'text-[13px] font-bold shrink-0'} style={{ color: accent ? '#254BCE' : '#001660' }}>{value}</div>
    </div>
  )
}

// ─── Persistent offer sidebar (shown on all screens except offer-select & funded)
function OfferSidebar({ loan, step2 }) {
  const tierIdx = step2?.tier ?? 0
  const tierData = FEE_TIERS[tierIdx]
  const displayLoan = loan ?? calcLoan({
    creditLimit:   step2?.creditLimit   ?? SEED.defaultCredit,
    withdrawNow:   step2?.withdrawNow   ?? SEED.defaultWithdraw,
    tier:          tierIdx,
    deferredMonths: step2?.deferredMonths ?? 0,
  })
  const autopay = step2?.autopay ?? true
  const displayApr = autopay ? (parseFloat(displayLoan.apr) - 0.25).toFixed(2) : displayLoan.apr

  return (
    <div className="w-[220px] shrink-0 self-start m-4 rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 4px 24px rgba(0,22,96,0.13)', border: '1px solid rgba(0,22,96,0.1)' }}>
      {/* Dark header */}
      <div className="px-5 py-4" style={{ background: '#001660' }}>
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Terms of your offer</div>
        <div className="text-[28px] font-bold text-white leading-none">{formatCurrencyFull(displayLoan.withdrawNow)}</div>
        <div className="text-xs text-white/50 mt-1">Initial draw amount</div>
      </div>

      {/* Terms body */}
      <div className="px-5 py-5 space-y-4" style={{ background: '#fff' }}>
        <TermRow label="Draw period payment" value={`${formatCurrencyFull(displayLoan.drawPayment)}/mo`} sub="Interest only · 10 yr" accent large />
        <TermRow label="Repayment payment" value={`${formatCurrencyFull(displayLoan.repayPayment)}/mo`} sub="Principal + interest · 20 yr" large />
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <TermRow label="APR" value={`${displayApr}%`} large />
          <TermRow label="Interest rate" value={`${tierData.rate}%`} large />
          <TermRow label="Origination fee" value={formatCurrencyFull(displayLoan.originationFee)} sub={`${tierData.fee}% · rolled in`} large />
          <TermRow label="Credit limit" value={formatCurrencyFull(displayLoan.creditLimit)} large />
          <TermRow label="Available after draw" value={formatCurrencyFull(displayLoan.availableAfter)} large />
        </div>
        {displayLoan.deferredMonths > 0 && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: '#FFF9ED', border: '1px solid rgba(234,179,8,0.25)' }}>
            <div className="text-[11px] font-semibold text-amber-700 mb-0.5">Deferred {displayLoan.deferredMonths} months</div>
            <div className="text-[11px] text-amber-600">Interest accrues · first payment deferred</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100" style={{ background: '#F8F9FC' }}>
        <div className="text-[11px] text-gray-400 leading-relaxed">
          Cash required at closing: <strong>$0</strong> · Origination fee deducted from total
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
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
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
    <div className="max-w-lg mx-auto px-5 py-8">
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
    <div className="max-w-lg mx-auto px-5 py-8 space-y-4">
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
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
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
                <div className="text-[10px] text-gray-400 mb-0.5">{l}</div>
                <div className="text-[13px] font-semibold" style={{ color: '#001660' }}>{v}</div>
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

      <div className="flex gap-3 pb-8">
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
        <button onClick={() => dispatch({ type: 'ACCEPT' })} disabled={!agreed}
          className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all"
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

// Screen: C·2 — Ready to Schedule
// ─────────────────────────────────────────────────────────────────────────────
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

// Screen: C·3 — Notary Scheduled
// ─────────────────────────────────────────────────────────────────────────────
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

// Screen: C·4 — Signing in Progress
// ─────────────────────────────────────────────────────────────────────────────
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

// Screen: C·5 — Loan Closed
// ─────────────────────────────────────────────────────────────────────────────
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
      case S.OFFER_SELECT:         return <ScreenOfferSelect step2={step2} step1={step1} dispatch={dispatch} />
      case S.MORE_INFO:            return <ScreenMoreInfo step3={step3} dispatch={dispatch} />
      case S.LINK_INCOME:          return <ScreenLinkIncome dispatch={dispatch} />
      case S.VERIFY_IDENTITY:      return <ScreenVerifyIdentity dispatch={dispatch} />
      case S.PROPERTY_VERIFY_WAIT: return <ScreenPropertyVerifyWait dispatch={dispatch} />
      case S.APPRAISAL_WAIT:       return <ScreenAppraisalWait />
      case S.OPS_REVIEW_WAIT:      return <ScreenOpsReviewWait />
      case S.FINAL_OFFER:          return <ScreenFinalOffer loan={loan} step2={step2} dispatch={dispatch} />
      case S.DECLINED:             return <ScreenDeclined dispatch={dispatch} />
      case S.DOCS_PREPARING:      return <ScreenDocsPrepairing dispatch={dispatch} />
      case S.READY_TO_SCHEDULE:   return <ScreenReadyToSchedule dispatch={dispatch} />
      case S.NOTARY_SCHEDULED:    return <ScreenNotaryScheduled dispatch={dispatch} />
      case S.SIGNING_IN_PROGRESS: return <ScreenSigningInProgress dispatch={dispatch} />
      case S.LOAN_CLOSED:         return <ScreenLoanClosed dispatch={dispatch} />
      default: return null
    }
  }

  // Screens with full-height flex layout (no inner scroll)
  const flexScreens = new Set([S.OFFER_SELECT, S.PROPERTY_VERIFY_WAIT, S.APPRAISAL_WAIT, S.OPS_REVIEW_WAIT, S.NOTARY_SCHEDULED])
  const isFlexScreen = flexScreens.has(app)

  // Show the persistent offer sidebar on all screens except OFFER_SELECT (has its own live panel)
  const showOfferSidebar = app !== S.OFFER_SELECT

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#F8F9FC' }}>
      <BrandBar onRestart={() => dispatch({ type: 'RESTART' })} onToggleSim={() => dispatch({ type: 'TOGGLE_SIM' })} onViewEmail={() => navigate('/email')} />
      <div className="flex flex-1 overflow-hidden">
        <StepSidebar appState={app} dispatch={dispatch} />
        <main className={isFlexScreen ? 'flex-1 overflow-hidden flex flex-col' : 'flex-1 overflow-y-auto'}>
          {renderScreen()}
        </main>
        {showOfferSidebar && <OfferSidebar loan={loan} step2={step2} />}
      </div>
      {simOpen && <SimPanel sim={sim} appState={app} dispatch={dispatch} />}
    </div>
  )
}
