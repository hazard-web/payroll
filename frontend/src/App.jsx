// PaySlip Pro - Enterprise Statutory Payroll Engine
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import GeneratePayslip from './pages/GeneratePayslip'
import PayslipList from './pages/PayslipList'
import PayslipDetail from './pages/PayslipDetail'
import StaffList from './pages/StaffList'
import StaffDetail from './pages/StaffDetail'
import AuditLogs from './pages/AuditLogs'
import TeamPerformance from './pages/TeamPerformance'
import LeaveRequests from './pages/LeaveRequests'
import StaffSupport from './pages/StaffSupport'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import VerifyEmail from './pages/VerifyEmail'
import VerifyAction from './pages/VerifyAction'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { useStaffPortal } from './context/StaffPortalContext'

// Portal Pages
import PortalLayout from './components/PortalLayout'
import PortalLogin from './pages/portal/PortalLogin'
import PortalChangePassword from './pages/portal/PortalChangePassword'
import PortalForgotPassword from './pages/portal/PortalForgotPassword'
import PortalResetPassword from './pages/portal/PortalResetPassword'
import PortalDashboard from './pages/portal/PortalDashboard'
import PortalProfile from './pages/portal/PortalProfile'
import PortalAttendance from './pages/portal/PortalAttendance'
import PortalSummary from './pages/portal/PortalSummary'
import PortalPayslips from './pages/portal/PortalPayslips'

// ─────────────────────────────────────────────
// Guard for Corporate Portal
// ─────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ─────────────────────────────────────────────
// Guard for Staff Portal protected pages
// Does NOT block the public /portal/login page
// Enforces a non-skippable profile-completion flow.
// ─────────────────────────────────────────────
function PortalProtectedRoute({ children }) {
  const { staffUser, loading } = useStaffPortal()
  const location = useLocation()
  if (loading) return null
  if (!staffUser) return <Navigate to="/portal/login" replace />
  if (staffUser.mustChangePassword && location.pathname !== '/portal/change-password') {
    return <Navigate to="/portal/change-password" replace />
  }
  // Mandatory profile completion: route to /portal/profile if incomplete
  if (
    staffUser.profileCompleted === false &&
    location.pathname !== '/portal/profile'
  ) {
    return <Navigate to="/portal/profile" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      {/* ════════════════════════════════════════════
          STAFF PORTAL — Public (no auth required)
          These MUST be top-level, not nested under /
          ════════════════════════════════════════════ */}
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/forgot-password" element={<PortalForgotPassword />} />
      <Route path="/portal/reset-password" element={<PortalResetPassword />} />
      <Route path="/portal/change-password" element={<PortalProtectedRoute><PortalChangePassword /></PortalProtectedRoute>} />

      {/* ════════════════════════════════════════════
          STAFF PORTAL — Protected (staff auth required)
          ════════════════════════════════════════════ */}
      <Route path="/portal" element={<PortalProtectedRoute><PortalLayout /></PortalProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PortalDashboard />} />
        <Route path="profile" element={<PortalProfile />} />
        <Route path="attendance" element={<PortalAttendance />} />
        <Route path="summary" element={<PortalSummary />} />
        <Route path="payslips" element={<PortalPayslips />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* ════════════════════════════════════════════
          CORPORATE PORTAL — Public
          ════════════════════════════════════════════ */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify" element={<VerifyAction />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ════════════════════════════════════════════
          CORPORATE PORTAL — Protected
          Catch-all inside here redirects to / (dashboard)
          NOT to /login, so it can't steal /portal/* paths
          ════════════════════════════════════════════ */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="generate" element={<GeneratePayslip />} />
        <Route path="payslips" element={<PayslipList />} />
        <Route path="payslips/:id" element={<PayslipDetail />} />
        <Route path="staff" element={<StaffList />} />
        <Route path="staff/:id" element={<StaffDetail />} />
        <Route path="performance" element={<TeamPerformance />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="leave-requests" element={<LeaveRequests />} />
        <Route path="staff-support" element={<StaffSupport />} />
        <Route path="profile" element={<Profile />} />
        {/* Only catch genuinely unknown corporate paths, not /portal/* */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
