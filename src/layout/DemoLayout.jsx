import { Outlet } from 'react-router-dom'
import AIChat from '../components/AIChat'
import DemoSwitcher from '../components/DemoSwitcher'
import DemoStepsDropdown from '../components/DemoStepsDropdown'

const STEPS = [
  { label: 'PMPro',            path: '/pipeline', subtitle: 'GreenLyne • Back-office pipeline' },
  { label: 'Email',            path: '/email',    subtitle: 'Westhaven Power • Your Solar Plan' },
  { label: 'Welcome Screen',   path: '/offer',    subtitle: 'GreenLyne • Pre-qualified for a HELOC' },
  { label: 'Application',      path: '/pos-demo', subtitle: 'GreenLyne • Secure Application' },
]

export default function DemoLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Demo nav */}
      <style>{`
        @media (max-width: 768px) {
          /* Each dropdown button shares the bar 50/50 on mobile */
          .demo-nav-bar > div { flex: 1 1 0; min-width: 0; }
          .demo-nav-bar > div > button { width: 100% !important; min-width: 0 !important; }
          /* Popovers: edge-to-edge sheet centered just below the nav bar */
          .demo-dropdown-menu {
            position: fixed !important;
            top: calc(var(--demo-nav-h, 56px) + 6px) !important;
            left: 8px !important; right: 8px !important;
            min-width: 0 !important;
            max-height: calc(100vh - var(--demo-nav-h, 56px) - 24px);
            overflow-y: auto;
          }
        }
      `}</style>
      <div className="demo-nav-bar" style={{
        background: '#0d0d0d',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        flexShrink: 0,
      }}>
        <DemoSwitcher currentLabel="Smart POS" theme="dark" />
        <DemoStepsDropdown steps={STEPS} theme="dark" />
      </div>

      {/* Page content */}
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>

      <AIChat />
    </div>
  )
}
