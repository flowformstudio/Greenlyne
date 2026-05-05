import { useActivePartners } from '../lib/PartnersContext'

/**
 * Partner header — shows the active merchant on the left and the active
 * lender + GreenLyne credit on the right. Driven by PartnersContext so
 * "Manage Demo" selections cascade automatically.
 *
 * Props are kept for layout reasons; the lender prop is now ignored
 * (active lender comes from context).
 */
export default function WesthavenHeader({ maxWidth = 860, padding = '0 20px' }) {
  const { merchant, lender } = useActivePartners()

  return (
    <div style={{
      background: '#ffffff',
      borderBottom: '1px solid rgba(0,22,96,0.08)',
      height: 72,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        maxWidth,
        margin: '0 auto',
        padding,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>

        {/* Left — active merchant brand */}
        {merchant?.logoUrl ? (
          <img
            src={merchant.logoUrl}
            alt={merchant.name}
            style={{ maxHeight: 40, maxWidth: 200, height: 'auto', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0d0d0d' }}>
            {merchant?.name || ''}
          </span>
        )}

        {/* Right — brand bar (two stacked rows) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>

          {/* Row 1: Financing powered by GreenLyne — prominent navy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#001660' }}>
              Financing powered by
            </span>
            <img
              src="/greenlyne-logo.svg"
              alt="GreenLyne"
              style={{ height: 16, width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* Row 2: Lending services — subtle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 400, color: '#bcc7d5' }}>
              Lending by
            </span>
            {lender?.logoUrl ? (
              <img
                src={lender.logoUrl}
                alt={lender.name}
                style={{ maxHeight: 22, maxWidth: 150, height: 'auto', width: 'auto', objectFit: 'contain', display: 'block', opacity: 0.85 }}
              />
            ) : (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>
                {lender?.name || ''}
              </span>
            )}
            {lender?.nmls && (
              <span style={{ fontSize: 10, fontWeight: 400, color: '#bcc7d5' }}>
                · NMLS #{lender.nmls}
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
