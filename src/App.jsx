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
import CreateAccount from './pages/CreateAccount'
import EmailPreview from './pages/EmailPreview'
import OfferLanding from './pages/OfferLanding'
import PreQualified from './pages/PreQualified'
import HELOCApp from './pages/HELOCApp'
import QualificationFlow from './pages/QualificationFlow'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Demo flow — shared black nav */}
      <Route element={<DemoLayout />}>
        <Route path="/email" element={<EmailPreview />} />
        <Route path="/offer" element={<OfferLanding />} />
        <Route path="/pre-qualified" element={<PreQualified />} />
        <Route path="/qualification" element={<QualificationFlow />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/pos-demo" element={<POSDemo />} />
        <Route path="/heloc-app" element={<HELOCApp />} />
      </Route>

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
