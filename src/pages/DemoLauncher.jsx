import { useNavigate } from 'react-router-dom'

const C = {
  navy: '#001660', blue: '#254BCE', teal: '#016163',
  green: '#93DDBA', bg: '#F5F1EE', white: '#ffffff', muted: '#94a3b8',
}

export default function DemoLauncher() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, borderRadius: 8, padding: '6px 14px', marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.white, letterSpacing: '-0.01em' }}>GreenLyne Demo</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Choose your demo path</div>
        <div style={{ fontSize: 14, color: C.muted }}>Select how the homeowner will enter the flow</div>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 640 }}>
        {/* QR path */}
        <button
          onClick={() => navigate('/offer?source=qr')}
          style={{ flex: '1 1 280px', background: C.white, border: `2px solid rgba(0,22,96,0.1)`, borderRadius: 16, padding: '28px 24px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,22,96,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,22,96,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>📱</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>QR / On-site demo</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>Homeowner scans a QR code at the rep's location. Mobile view. Rep is auto-notified when homeowner confirms intent.</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, borderRadius: 8, padding: '8px 14px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>Launch QR flow →</span>
          </div>
        </button>

        {/* Email path */}
        <button
          onClick={() => navigate('/offer?source=email')}
          style={{ flex: '1 1 280px', background: C.white, border: `2px solid rgba(0,22,96,0.1)`, borderRadius: 16, padding: '28px 24px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.boxShadow = '0 4px 16px rgba(1,97,99,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,22,96,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>📧</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Email demo flow</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>Homeowner clicks a link in their email. Desktop view. Homeowner chooses to talk now or get a callback.</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.teal, borderRadius: 8, padding: '8px 14px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>Launch email flow →</span>
          </div>
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 48, fontSize: 11, color: C.muted }}>
        Westhaven Solar · GreenLyne financing · OWNING lender
      </div>
    </div>
  )
}
