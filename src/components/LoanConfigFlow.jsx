import { useState } from 'react'
import EmailPreview from './EmailPreview'
import LoanConfigurator from './LoanConfigurator'

export default function LoanConfigFlow({ lead, onClose }) {
  const [step, setStep] = useState(0) // 0 = email preview, 1 = configurator

  function handleSendOffer(loan) {
    // In a real app, this would send the configured offer
    alert(`Offer sent!\nCredit limit: $${loan.creditLimit.toLocaleString()}\nWithdraw now: $${loan.withdrawNow.toLocaleString()}\nDraw payment: $${loan.drawPayment}/mo`)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />

      {/* Modal panel */}
      <div
        className="fixed top-4 right-4 bottom-4 z-50 flex flex-col bg-white shadow-2xl"
        style={{ width: 640, borderRadius: 16, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {step === 0 && (
          <EmailPreview
            lead={lead}
            onContinue={() => setStep(1)}
            onClose={onClose}
          />
        )}
        {step === 1 && (
          <LoanConfigurator
            lead={lead}
            onBack={() => setStep(0)}
            onClose={onClose}
            onSendOffer={handleSendOffer}
          />
        )}
      </div>
    </>
  )
}
