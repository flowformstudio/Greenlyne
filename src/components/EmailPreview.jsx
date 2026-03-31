import { formatCurrencyFull } from '../lib/loanCalc'

export default function EmailPreview({ lead, onContinue, onClose }) {
  const amount = lead?.amount || '$85,000'
  const name = lead?.name?.split(' ')[0] || 'Sarah'
  const apr = lead?.apr || '8.25%'
  const monthly = lead?.monthly || '$520/mo'
  const product = lead?.product || 'HELOC'

  return (
    <div className="flex flex-col h-full">
      {/* Modal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div>
          <div className="text-sm font-semibold" style={{ color: '#001660' }}>Email Preview</div>
          <div className="text-xs text-gray-400 mt-0.5">This is what {lead?.name} will receive</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onContinue}
            className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors"
            style={{ background: '#254BCE', color: '#fff' }}
            onMouseOver={e => e.currentTarget.style.background = '#1e3fa8'}
            onMouseOut={e => e.currentTarget.style.background = '#254BCE'}
          >
            Configure Offer →
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Email client chrome */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-[600px] mx-auto">
          {/* Email metadata bar */}
          <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 px-5 py-3.5">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
              <span className="text-gray-400 font-medium">From:</span>
              <span className="text-gray-700">Greenlyne Financial &lt;offers@greenlyne.com&gt;</span>
              <span className="text-gray-400 font-medium">To:</span>
              <span className="text-gray-700">{lead?.email || 'sarah.johnson@email.com'}</span>
              <span className="text-gray-400 font-medium">Subject:</span>
              <span className="font-semibold text-gray-800">You qualify for {amount} — your personal {product} offer</span>
            </div>
          </div>

          {/* Email body */}
          <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
            {/* Brand header */}
            <div className="px-8 pt-8 pb-6" style={{ background: '#001660' }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#254BCE' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <span className="text-white font-bold text-sm tracking-wide">Greenlyne</span>
              </div>
              <div className="text-white/70 text-sm mb-2">Hi {name},</div>
              <div className="text-white text-xl font-bold leading-snug">
                You've been pre-approved for a<br />
                <span style={{ color: '#60A5FA' }}>{amount} {product}</span>
              </div>
            </div>

            {/* Offer card */}
            <div className="px-8 py-6">
              <div className="rounded-xl border p-5 mb-6" style={{ borderColor: 'rgba(0,22,96,0.1)', background: '#F8F9FC' }}>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Your Offer Details</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Credit Limit</div>
                    <div className="text-2xl font-bold" style={{ color: '#001660' }}>{amount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Starting Rate</div>
                    <div className="text-2xl font-bold" style={{ color: '#001660' }}>{apr}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Est. Monthly</div>
                    <div className="text-lg font-semibold" style={{ color: '#001660' }}>{monthly}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Product</div>
                    <div className="text-lg font-semibold" style={{ color: '#001660' }}>{product}</div>
                  </div>
                </div>
              </div>

              {/* Body copy */}
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Based on your home's current estimated value and your credit profile, you qualify for a home equity line of credit up to <strong>{amount}</strong>. Use it to consolidate debt, fund a renovation, or keep it available for when you need it.
              </p>

              {/* CTA */}
              <div className="text-center mb-6">
                <a
                  href="#"
                  className="inline-block px-8 py-3.5 rounded-xl text-white font-semibold text-sm no-underline"
                  style={{ background: '#254BCE' }}
                  onClick={e => e.preventDefault()}
                >
                  View My Personalized Offer →
                </a>
                <div className="text-xs text-gray-400 mt-2">Offer expires in 30 days · No hard credit pull</div>
              </div>

              {/* Bullets */}
              <div className="border-t border-gray-100 pt-5">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Why Greenlyne?</div>
                <div className="space-y-2">
                  {[
                    'No application fee, no annual fee',
                    'Draw funds anytime during your 10-year draw period',
                    'Interest-only payments during draw period',
                    'Close in as little as 15 business days',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100" style={{ background: '#F8F9FC' }}>
              <div className="text-xs text-gray-400 leading-relaxed">
                This offer was generated based on public property records and estimated credit data. Final terms subject to full underwriting. To unsubscribe, click here. Greenlyne Financial, 123 Main St, Austin TX 78701.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
        <div className="text-xs text-gray-400">Step 1 of 2 — Email Preview</div>
        <button
          onClick={onContinue}
          className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
          style={{ background: '#254BCE', color: '#fff' }}
          onMouseOver={e => e.currentTarget.style.background = '#1e3fa8'}
          onMouseOut={e => e.currentTarget.style.background = '#254BCE'}
        >
          Configure Loan Offer
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  )
}
