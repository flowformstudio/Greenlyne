import { useState, useMemo } from 'react'
import { calcLoan, FEE_TIERS, DEFERRED_OPTIONS, formatCurrencyFull } from '../lib/loanCalc'

// ── Slider with gradient fill ─────────────────────────────────────────────────
function RangeSlider({ value, min, max, step = 1000, onChange, formatLabel }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="w-full">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="loan-slider w-full"
        style={{ '--fill-pct': `${pct}%` }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400">{formatLabel(min)}</span>
        <span className="text-[10px] text-gray-400">{formatLabel(max)}</span>
      </div>
    </div>
  )
}

// ── Credit line visual bar ────────────────────────────────────────────────────
function CreditBar({ withdrawNow, creditLimit }) {
  const nowPct = creditLimit > 0 ? Math.round((withdrawNow / creditLimit) * 100) : 0
  const laterPct = 100 - nowPct
  return (
    <div className="mt-3">
      <div className="h-7 rounded-lg overflow-hidden flex" style={{ background: 'rgba(0,22,96,0.07)' }}>
        <div
          className="h-full flex items-center justify-center transition-all duration-200"
          style={{ width: `${nowPct}%`, background: '#254BCE', minWidth: nowPct > 0 ? 4 : 0 }}
        >
          {nowPct > 12 && (
            <span className="text-[10px] font-bold text-white whitespace-nowrap px-1.5">
              {formatCurrencyFull(withdrawNow)}
            </span>
          )}
        </div>
        <div className="h-full flex items-center justify-center" style={{ width: `${laterPct}%` }}>
          {laterPct > 12 && (
            <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap px-1.5">
              +{formatCurrencyFull(creditLimit - withdrawNow)}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-3 mt-1.5">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ background: '#254BCE' }} /><span className="text-[10px] text-gray-400">Withdraw now</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ background: 'rgba(0,22,96,0.12)' }} /><span className="text-[10px] text-gray-400">Available later</span></div>
      </div>
    </div>
  )
}

// ── Terms panel (right column) ────────────────────────────────────────────────
function TermsPanel({ loan, tier, creditLimit }) {
  const tierData = FEE_TIERS[tier]
  const availableAfter = creditLimit - loan.withdrawNow

  return (
    <div className="flex flex-col gap-0 rounded-2xl overflow-hidden h-full" style={{ border: '1px solid rgba(0,22,96,0.1)' }}>
      {/* Header */}
      <div className="px-5 py-4 shrink-0" style={{ background: '#001660' }}>
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Terms of your offer</div>
        <div className="text-3xl font-bold text-white leading-none">{formatCurrencyFull(loan.withdrawNow)}</div>
        <div className="text-xs text-white/50 mt-1">Initial draw amount</div>
      </div>

      {/* Key numbers */}
      <div className="flex-1 px-5 py-4 space-y-3.5" style={{ background: '#F8F9FC' }}>
        <Row label="Draw period payment" value={`${formatCurrencyFull(loan.drawPayment)}/mo`} sub="Interest only · 10 yr" accent />
        <Row label="Repayment payment" value={`${formatCurrencyFull(loan.repayPayment)}/mo`} sub="Principal + interest · 20 yr" />
        <div className="border-t border-gray-100 pt-3 space-y-2.5">
          <Row label="APR" value={`${loan.apr}%`} />
          <Row label="Interest rate" value={`${tierData.rate}%`} />
          <Row label="Origination fee" value={formatCurrencyFull(loan.originationFee)} sub={`${tierData.fee}% of credit limit · rolled in`} />
          <Row label="Credit limit" value={formatCurrencyFull(creditLimit)} />
          <Row label="Available after draw" value={formatCurrencyFull(availableAfter)} sub="Stays in your line" />
        </div>
        {loan.deferredMonths > 0 && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: '#FFF9ED', border: '1px solid rgba(234,179,8,0.25)' }}>
            <div className="text-[10px] font-semibold text-amber-700 mb-0.5">Deferred {loan.deferredMonths} months</div>
            <div className="text-[10px] text-amber-600">Interest accrues · first payment deferred</div>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 shrink-0 border-t border-gray-100" style={{ background: '#fff' }}>
        <div className="text-[10px] text-gray-400 leading-relaxed">
          Cash required at closing: <strong>$0</strong> · Origination fee deducted from total
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, sub, accent }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-[11px] text-gray-500">{label}</div>
        {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
      <div className={`text-[13px] font-bold shrink-0 ${accent ? '' : ''}`} style={{ color: accent ? '#254BCE' : '#001660' }}>
        {value}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LoanConfigurator({ lead, onBack, onClose, onSendOffer }) {
  const maxCredit = parseInt((lead?.amount || '$85,000').replace(/\D/g, '')) || 85000

  const [creditLimit, setCreditLimit] = useState(maxCredit)
  const [withdrawNow, setWithdrawNow] = useState(Math.round(maxCredit * 0.6 / 5000) * 5000)
  const [tier, setTier] = useState(0)
  const [deferredMonths, setDeferredMonths] = useState(0)
  const [autopay, setAutopay] = useState(true)

  const safeWithdraw = Math.min(withdrawNow, creditLimit)

  const loan = useMemo(() =>
    calcLoan({ creditLimit, withdrawNow: safeWithdraw, tier, deferredMonths }),
    [creditLimit, safeWithdraw, tier, deferredMonths]
  )

  // Apply autopay discount to displayed APR
  const displayApr = autopay ? (parseFloat(loan.apr) - 0.25).toFixed(2) : loan.apr

  function fmt(n) { return '$' + n.toLocaleString() }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#001660' }}>Configure Loan Offer</div>
            <div className="text-[11px] text-gray-400">{lead?.name} · {lead?.product || 'HELOC'} · up to {fmt(maxCredit)}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Two-column body */}
      <div className="flex-1 overflow-hidden flex">
        {/* LEFT — controls */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ borderRight: '1px solid rgba(0,22,96,0.07)' }}>

          {/* Credit limit */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Credit Limit</div>
              <div className="text-base font-bold" style={{ color: '#001660' }}>{fmt(creditLimit)}</div>
            </div>
            <RangeSlider value={creditLimit} min={10000} max={maxCredit} step={5000}
              onChange={v => { setCreditLimit(v); if (withdrawNow > v) setWithdrawNow(v) }}
              formatLabel={v => fmt(v)} />
          </div>

          {/* Withdraw now */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Withdraw at Closing</div>
              <div className="text-base font-bold" style={{ color: '#254BCE' }}>{fmt(safeWithdraw)}</div>
            </div>
            <div className="text-[10px] text-gray-400 mb-2">Rest stays in your line to draw anytime</div>
            <RangeSlider value={safeWithdraw} min={0} max={creditLimit} step={5000}
              onChange={v => setWithdrawNow(v)} formatLabel={v => fmt(v)} />
            <CreditBar withdrawNow={safeWithdraw} creditLimit={creditLimit} />
          </div>

          {/* Rate / fee tradeoff */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Rate & Origination Fee</div>
            </div>
            <div className="text-[10px] text-gray-400 mb-2.5">Higher fee = lower rate. Fee rolled into loan — no cash at closing.</div>
            <div className="grid grid-cols-3 gap-1.5">
              {FEE_TIERS.map((t, i) => {
                const active = tier === i
                return (
                  <button key={i} onClick={() => setTier(i)}
                    className="rounded-xl p-2.5 text-left transition-all border"
                    style={{ borderColor: active ? '#254BCE' : 'rgba(0,22,96,0.1)', background: active ? 'rgba(37,75,206,0.06)' : '#fff' }}>
                    <div className="text-[10px] text-gray-400 mb-0.5">{t.label}</div>
                    <div className="text-sm font-bold" style={{ color: active ? '#254BCE' : '#001660' }}>{t.rateLabel}</div>
                    <div className="text-[10px] text-gray-400">{t.feeLabel} fee</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Deferred payments */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Defer First Payment</div>
            <div className="grid grid-cols-4 gap-1.5">
              {DEFERRED_OPTIONS.map(opt => {
                const active = deferredMonths === opt.months
                return (
                  <button key={opt.months} onClick={() => setDeferredMonths(opt.months)}
                    className="rounded-xl py-2 px-1 text-center transition-all border"
                    style={{ borderColor: active ? '#254BCE' : 'rgba(0,22,96,0.1)', background: active ? 'rgba(37,75,206,0.06)' : '#fff' }}>
                    <div className="text-[11px] font-bold leading-tight" style={{ color: active ? '#254BCE' : '#001660' }}>
                      {opt.months === 0 ? 'None' : `${opt.months}mo`}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Autopay discount */}
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

          {/* Disclaimer */}
          <div className="text-[10px] text-gray-400 leading-relaxed pb-1">
            Estimates are illustrative only. Final terms subject to full underwriting and appraisal. Not a commitment to lend.
          </div>
        </div>

        {/* RIGHT — live terms */}
        <div className="w-[220px] shrink-0 p-3">
          <TermsPanel loan={{ ...loan, apr: displayApr, withdrawNow: safeWithdraw }} tier={tier} creditLimit={creditLimit} />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-3.5 border-t border-gray-100 bg-white">
        <div className="flex gap-2.5">
          <button onClick={onBack}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors"
            style={{ borderColor: 'rgba(0,22,96,0.15)', color: '#001660' }}
            onMouseOver={e => e.currentTarget.style.background = '#F8F9FC'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            ← Back
          </button>
          <button onClick={() => onSendOffer && onSendOffer({ ...loan, withdrawNow: safeWithdraw, apr: displayApr })}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors"
            style={{ background: '#254BCE', color: '#fff' }}
            onMouseOver={e => e.currentTarget.style.background = '#1e3fa8'}
            onMouseOut={e => e.currentTarget.style.background = '#254BCE'}>
            Send Configured Offer
          </button>
        </div>
        <div className="text-[10px] text-center text-gray-400 mt-1.5">Step 2 of 2 · Offer Configuration</div>
      </div>
    </div>
  )
}
