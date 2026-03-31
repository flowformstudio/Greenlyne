export default function WesthavenHeader() {
  return (
    <div style={{
      background: '#ffffff',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      padding: '0 24px',
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
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
            style={{ height: 14, width: 'auto', objectFit: 'contain' }}
          />
        </div>
        <div style={{ fontSize: 10, fontWeight: 400, color: '#94A3B8' }}>
          Lending by Owning · NMLS #2611
        </div>
      </div>
    </div>
  )
}
