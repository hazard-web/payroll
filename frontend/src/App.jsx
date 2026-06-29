// PaySlip Pro - Enterprise Statutory Payroll Engine
//
// Route-based code splitting: every page is loaded on demand via
// React.lazy so the initial bundle only ships the public route shells
// + Layout components. Users navigating to /payslips for the first
// time will pull in PayslipList.jsx as its own chunk instead of paying
// for LeaveRequests, TeamPerformance, etc. on first paint.
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import PortalLayout from './components/PortalLayout'
import PageTransition from './components/PageTransition'
import { useAuth } from './context/AuthContext'
import { useStaffPortal } from './context/StaffPortalContext'

// Public / auth pages — keep these eagerly loaded so the entry path
// (login, verify) renders instantly with no spinner.
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import VerifyAction from './pages/VerifyAction'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import PortalLogin from './pages/portal/PortalLogin'
import PortalForgotPassword from './pages/portal/PortalForgotPassword'
import PortalResetPassword from './pages/portal/PortalResetPassword'
import PortalSetupPassword from './pages/portal/PortalSetupPassword'

// Lazy-loaded pages (one chunk per file).
const Dashboard             = lazy(() => import('./pages/Dashboard'))
const GeneratePayslip       = lazy(() => import('./pages/GeneratePayslip'))
const PayslipList           = lazy(() => import('./pages/PayslipList'))
const PayslipDetail         = lazy(() => import('./pages/PayslipDetail'))
const StaffList             = lazy(() => import('./pages/StaffList'))
const StaffDetail           = lazy(() => import('./pages/StaffDetail'))
const AuditLogs             = lazy(() => import('./pages/AuditLogs'))
const TeamPerformance       = lazy(() => import('./pages/TeamPerformance'))
const StaffPerformanceDetail = lazy(() => import('./pages/StaffPerformanceDetail'))
const LeaveRequests         = lazy(() => import('./pages/LeaveRequests'))
const StaffSupport          = lazy(() => import('./pages/StaffSupport'))
const Profile               = lazy(() => import('./pages/Profile'))

const PortalChangePassword  = lazy(() => import('./pages/portal/PortalChangePassword'))
const PortalDashboard       = lazy(() => import('./pages/portal/PortalDashboard'))
const PortalProfile         = lazy(() => import('./pages/portal/PortalProfile'))
const PortalAttendance      = lazy(() => import('./pages/portal/PortalAttendance'))
const PortalSummary         = lazy(() => import('./pages/portal/PortalSummary'))
const PortalPayslips        = lazy(() => import('./pages/portal/PortalPayslips'))

// Lightweight loading fallback — PageTransition's loader matches the
// dashboard's loading state so users don't see a visual jump.
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
    <div className="pa-loader" />
  </div>
)

// ─────────────────────────────────────────────
// Full-screen loader shown while auth is resolving
// ─────────────────────────────────────────────
const FullPageLoader = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg, #f4f6fa)',
    flexDirection: 'column',
    gap: 16,
  }}>
    <div className="pa-loader" />
    <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 500 }}>Loading…</p>
  </div>
)

// ─────────────────────────────────────────────
// Guard for Corporate Portal
// ─────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ─────────────────────────────────────────────
// Guard for Staff Portal protected pages
// ─────────────────────────────────────────────
function PortalProtectedRoute({ children }) {
  const { staffUser, loading } = useStaffPortal()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!staffUser) return <Navigate to="/portal/login" replace />
  if (staffUser.mustChangePassword && location.pathname !== '/portal/change-password') {
    return <Navigate to="/portal/change-password" replace />
  }
  if (
    staffUser.profileCompleted === false &&
    location.pathname !== '/portal/profile'
  ) {
    return <Navigate to="/portal/profile" replace />
  }
  return children
}

// Wrap a lazy page with PageTransition (matches existing UI) + Suspense.
const Lazy = ({ component: Component }) => (
  <Suspense fallback={<PageLoader />}>
    <PageTransition>
      <Component />
    </PageTransition>
  </Suspense>
)

export default function App() {
  return (
    <Routes>
      {/* ════════════════════════════════════════════
          STAFF PORTAL — Public (no auth required)
          ════════════════════════════════════════════ */}
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/forgot-password" element={<PortalForgotPassword />} />
      <Route path="/portal/reset-password" element={<PortalResetPassword />} />
      <Route path="/portal/setup-password" element={<PortalSetupPassword />} />
      <Route
        path="/portal/change-password"
        element={
          <PortalProtectedRoute>
            <Lazy component={PortalChangePassword} />
          </PortalProtectedRoute>
        }
      />

      {/* ════════════════════════════════════════════
          STAFF PORTAL — Protected (staff auth required)
          ════════════════════════════════════════════ */}
      <Route
        path="/portal"
        element={
          <PortalProtectedRoute>
            <PortalLayout />
          </PortalProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Lazy component={PortalDashboard} />} />
        <Route path="profile"   element={<Lazy component={PortalProfile} />} />
        <Route path="attendance" element={<Lazy component={PortalAttendance} />} />
        <Route path="summary"   element={<Lazy component={PortalSummary} />} />
        <Route path="payslips"  element={<Lazy component={PortalPayslips} />} />
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
          ════════════════════════════════════════════ */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Lazy component={Dashboard} />} />
        <Route path="generate"        element={<Lazy component={GeneratePayslip} />} />
        <Route path="payslips"        element={<Lazy component={PayslipList} />} />
        <Route path="payslips/:id"    element={<Lazy component={PayslipDetail} />} />
        <Route path="staff"           element={<Lazy component={StaffList} />} />
        <Route path="staff/:id"       element={<Lazy component={StaffDetail} />} />
        <Route path="performance"     element={<Lazy component={TeamPerformance} />} />
        <Route path="performance/:id"  element={<Lazy component={StaffPerformanceDetail} />} />
        <Route path="audit-logs"      element={<Lazy component={AuditLogs} />} />
        <Route path="leave-requests"  element={<Lazy component={LeaveRequests} />} />
        <Route path="staff-support"   element={<Lazy component={StaffSupport} />} />
        <Route path="profile"         element={<Lazy component={Profile} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
