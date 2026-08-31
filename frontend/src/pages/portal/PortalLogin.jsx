import { useState } from 'react'
import { flushSync } from 'react-dom'
import { useStaffPortal } from '../../context/StaffPortalContext'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { toastWelcomeBack } from '../../components/PosToast'
import api from '../../api'
import AuthShell from '../../components/auth/AuthShell'
import AuthMorphButton from '../../components/auth/AuthMorphButton'
import { AuthLogoLoader, useAuthRedirect } from '../../components/auth/AuthLogoLoader'

export default function PortalLogin() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useStaffPortal()
  const { redirecting, redirectTo, onRedirectClick } = useAuthRedirect()

  const goNext = async (e) => {
    e.preventDefault()
    if (checkingEmail) return
    const nextEmail = email.trim().toLowerCase()
    if (!nextEmail) {
      toast.error('Enter your email address')
      return
    }
    setEmail(nextEmail)
    flushSync(() => setCheckingEmail(true))
    const started = Date.now()
    try {
      await api.post('/portal/check-email', { email: nextEmail })
      const wait = Math.max(0, 900 - (Date.now() - started))
      if (wait) await new Promise((r) => setTimeout(r, wait))
      setStep(2)
    } catch (err) {
      const wait = Math.max(0, 600 - (Date.now() - started))
      if (wait) await new Promise((r) => setTimeout(r, wait))
      toast.error(
        err.response?.data?.message || err.message || 'No account found with this email address',
      )
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading || redirecting) return
    flushSync(() => setLoading(true))
    try {
      const data = await login(email, password)
      toastWelcomeBack()
      if (data.mustChangePassword) {
        redirectTo('/portal/change-password')
      } else {
        redirectTo('/portal/dashboard')
      }
    } catch (err) {
      toast.error(err.message || 'Invalid email or password.')
      setLoading(false)
    }
  }

  return (
    <>
      <AuthLogoLoader show={redirecting} />
      <AuthShell
        title="Sign in"
        subtitle="to access Team Portal"
        headerRight={
          <a href="/login" className="auth-smart" onClick={onRedirectClick('/login')}>
            Admin sign in
          </a>
        }
        footer={
          <>
            Forgot password?{' '}
            <a
              href="/portal/forgot-password"
              className="auth-link"
              onClick={onRedirectClick('/portal/forgot-password')}
            >
              Reset it
            </a>
          </>
        }
      >
        {step === 1 ? (
          <form onSubmit={goNext}>
            <input
              id="portal-email"
              className="auth-input"
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address or mobile number"
              disabled={checkingEmail}
            />
            <div className="auth-next-slot">
              <AuthMorphButton loading={checkingEmail}>Next</AuthMorphButton>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-5 flex items-center justify-between gap-3 rounded border border-[#eef0f3] bg-[#f8f9fb] px-3 py-2.5">
              <span className="truncate text-[14px] font-medium">{email}</span>
              <button type="button" className="auth-change" onClick={() => setStep(1)}>
                Change
              </button>
            </div>
            <div className="auth-field">
              <input
                id="portal-password"
                className="auth-input has-toggle"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="auth-next-slot">
              <AuthMorphButton loading={loading || redirecting}>Sign in</AuthMorphButton>
            </div>
          </form>
        )}
      </AuthShell>
    </>
  )
}
