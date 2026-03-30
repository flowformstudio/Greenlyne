import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AppLayout from './layout/AppLayout'
import Pipeline from './pages/Pipeline'
import GeoCampaigns from './pages/GeoCampaigns'
import Settings from './pages/Settings'
import UserManagement from './pages/settings/UserManagement'
import Organizations from './pages/settings/Organizations'
import ChangePassword from './pages/settings/ChangePassword'
import POSDemo from './pages/POSDemo'
import EmailPreview from './pages/EmailPreview'
import OfferLanding from './pages/OfferLanding'
import PreQualified from './pages/PreQualified'
import DemoLauncher from './pages/DemoLauncher'
import SmartPOS from './pages/SmartPOS'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/demo" element={<DemoLauncher />} />
      <Route path="/offer" element={<SmartPOS />} />
      <Route path="/financing" element={<OfferLanding />} />
      <Route path="/pos-demo" element={<POSDemo />} />
      <Route path="/email" element={<EmailPreview />} />
      <Route path="/pre-qualified" element={<PreQualified />} />
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
