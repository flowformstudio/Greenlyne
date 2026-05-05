import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AppLayout from './layout/AppLayout'
import DemoLayout from './layout/DemoLayout'
import Pipeline from './pages/Pipeline'
import GeoCampaigns from './pages/GeoCampaigns'
import Settings from './pages/Settings'
import UserManagement from './pages/settings/UserManagement'
import Organizations from './pages/settings/Organizations'
import ChangePassword from './pages/settings/ChangePassword'
import POSDemo from './pages/POSDemo'
import EmailPreview from './pages/EmailPreview'
import OfferLanding from './pages/OfferLanding'
import V2Index from './v2/V2Index'
import OfferLandingV2 from './v2/OfferLandingV2'
import POSDemoV2 from './v2/POSDemoV2'
import { PartnersProvider } from './lib/PartnersContext'
import ManageDemoModal from './components/ManageDemoModal'

export default function App() {
  return (
    <PartnersProvider>
      <ManageDemoModal />
      <AppRoutes />
    </PartnersProvider>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Demo flow — shared black nav */}
      <Route element={<DemoLayout />}>
        <Route path="/email" element={<EmailPreview />} />
        <Route path="/offer" element={<OfferLanding />} />
        <Route path="/pos-demo" element={<POSDemo />} />
      </Route>

      {/* v2 — parallel design-system pass, no shared layout */}
      <Route path="/v2"          element={<V2Index />} />
      <Route path="/v2/offer"    element={<OfferLandingV2 />} />
      <Route path="/v2/pos-demo" element={<POSDemoV2 />} />

      <Route element={<AppLayout />}>
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/geo-campaigns" element={<GeoCampaigns />} />
        <Route path="/settings" element={<Settings />}>
          <Route index element={<Navigate to="/settings/users" replace />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="password" element={<ChangePassword />} />
        </Route>
        <Route path="/dashboard" element={<Navigate to="/pipeline" replace />} />
      </Route>
    </Routes>
  )
}
