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
      <div style={{
        background: '#0d0d0d',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 54,
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
