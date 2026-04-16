export default function WesthavenHeader({ lender = 'owning' }) {
  return (
    <div style={{
      background: '#ffffff',
      borderBottom: '1px solid rgba(0,22,96,0.08)',
      height: 61,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '0 20px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>

        {/* Left — Westhaven brand */}
        <img
          src="/westhaven-logo-new.avif"
          alt="Westhaven Power"
          style={{ height: 30, width: 'auto', objectFit: 'contain' }}
        />

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
          {lender === 'grand-bank' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 400, color: '#bcc7d5' }}>
                Lending services by
              </span>
              <img
                src="/grand-bank-logo.png"
                alt="Grand Bank"
                style={{ height: 12, width: 'auto', objectFit: 'contain' }}
              />
              <span style={{ fontSize: 10, fontWeight: 400, color: '#bcc7d5' }}>
                NMLS #2611
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 400, color: '#bcc7d5' }}>
                Lending by
              </span>
              <img
                src="/owning-logo.webp"
                alt="Owning"
                style={{ height: 10, width: 'auto', verticalAlign: 'middle', opacity: 0.5 }}
              />
              <span style={{ fontSize: 10, fontWeight: 400, color: '#bcc7d5' }}>
                · NMLS #2611
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
