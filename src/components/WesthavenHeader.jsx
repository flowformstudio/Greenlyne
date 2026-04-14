export default function WesthavenHeader() {
  return (
    <div style={{
      background: '#ffffff',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      height: 60,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* Inner constrained to match content column */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/westhaven-logo-new.avif"
            alt="Westhaven Power"
            style={{ height: 30, width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* Right — powered-by stack */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}>Financing powered by</span>
            <img
              src="/greenlyne-logo.svg"
              alt="GreenLyne"
              style={{ height: 15, width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 400, color: '#94A3B8' }}>
            Lending by
            <img src="/owning-logo.webp" alt="Owning" style={{ height: 10, verticalAlign: 'middle', display: 'inline', opacity: 0.55 }} />
            · NMLS #2611
          </div>
        </div>
      </div>
    </div>
  )
}
