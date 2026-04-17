import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import AIChat from '../components/AIChat'

const STEPS = [
  { label: 'Email',          path: '/email',          subtitle: 'Westhaven Power • Your Solar Plan' },
  { label: 'Offer',          path: '/offer',          subtitle: 'Westhaven Power • Your Solar Plan' },
  { label: 'Pre-qualified',  path: '/pre-qualified',  subtitle: 'Westhaven Power • Your Solar Plan' },
  { label: 'Create Account', path: '/create-account', subtitle: 'GreenLyne • Secure Application' },
  { label: 'Application 1',  path: '/pos-demo',       subtitle: 'GreenLyne • Secure Application' },
]

export default function DemoLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const activeIndex = STEPS.findIndex(s => s.path === pathname)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Demo nav */}
      <div style={{
        background: '#0d0d0d',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {STEPS.map((step, i) => {
            const isActive = i === activeIndex
            const isDone = i < activeIndex

            return (
              <div key={step.path} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => navigate(step.path)}
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'none',
                    border: 'none',
                    borderRadius: 7,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none' }}
                >
                  {/* Step dot */}
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: isActive ? '#254BCE' : isDone ? '#016163' : 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDone
                      ? <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      : <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? 'white' : 'rgba(255,255,255,0.5)' }}>{i + 1}</span>
                    }
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : isDone ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)',
                      letterSpacing: '-0.1px',
                      fontFamily: "'PostGrotesk', system-ui, sans-serif",
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}>
                      {step.label}
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 500,
                      color: isActive ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.01em',
                      fontFamily: "'PostGrotesk', system-ui, sans-serif",
                    }}>
                      {step.subtitle}
                    </span>
                  </div>
                </button>

                {/* Divider */}
                {i < STEPS.length - 1 && (
                  <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                      <path d="M1 1L4 4.5L1 8" stroke="rgba(255,255,255,0.18)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>

      <AIChat />
    </div>
  )
}
