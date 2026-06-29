import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Lock, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion } from 'framer-motion'

// First-time account setup page for new team members.
// The user arrives here from the onboarding email link:
//   /portal/setup-password?token=<setup-token>
// On success, redirect to the Team Portal login.
export default function PortalSetupPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) return toast.error('Invalid setup link')
    if (password !== confirmPassword) return toast.error('Passwords do not match')

    setLoading(true)
    try {
      try {
        await api.post('/portal/setup-password', { token, password })
      } catch (err) {
        const message = err.response?.data?.message || ''
        const isMissingRoute = err.response?.status === 404 && /route not found/i.test(message)
        if (!isMissingRoute) throw err
        await api.post('/portal/reset-password', { token, password })
      }
      setSuccess(true)
      toast.success('Password set successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 'clamp(20px, 5vw, 60px)', position: 'relative', overflow: 'hidden'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%', maxWidth: 440,
          borderRadius: 12, padding: 'clamp(32px, 5vw, 60px)',
          zIndex: 10
        }}
        className="card"
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 12 }}>Set Up Your Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 500 }}>
            {success
              ? 'Your account is now active.'
              : 'Choose a strong password to activate your Team Portal access.'}
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit}>
            {!token && (
              <div style={{
                marginBottom: 24, padding: 14, background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, color: '#991b1b', fontSize: 14, fontWeight: 600, textAlign: 'center'
              }}>
                This setup link is missing or invalid. Please use the link from your invitation email.
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="password" required disabled={!token}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '16px 16px 16px 50px', background: 'var(--bg)',
                    border: '2px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15,
                    color: 'var(--text)', transition: 'all 0.2s', fontWeight: 600,
                    opacity: !token ? 0.5 : 1
                  }}
                  className="btn-hover"
                />
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--text-light)', lineHeight: 1.5 }}>
                At least 8 characters, with uppercase, lowercase, number, and special character.
              </p>
            </div>

            <div style={{ marginBottom: 40 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="password" required disabled={!token}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '16px 16px 16px 50px', background: 'var(--bg)',
                    border: '2px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15,
                    color: 'var(--text)', transition: 'all 0.2s', fontWeight: 600,
                    opacity: !token ? 0.5 : 1
                  }}
                  className="btn-hover"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit" disabled={loading || !token}
              style={{
                width: '100%', height: 60, background: 'var(--primary)', color: 'white',
                border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 15px 30px -10px rgba(15,23,42,0.4)', transition: 'all 0.3s',
                opacity: (loading || !token) ? 0.6 : 1
              }}
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : <>Activate Account <CheckCircle2 size={20} /></>}
            </motion.button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              padding: '24px', background: '#e5ebdd', border: '1px solid rgba(88,131,59, 0.3)',
              borderRadius: 12, color: '#58833b', marginBottom: 24, fontSize: 14, lineHeight: 1.6, fontWeight: 600
            }}>
              Your password has been set and your account is now active.
              You can sign in to the Team Portal with your email and new password.
            </div>
            <Link to="/portal/login" style={{
              display: 'block', padding: '16px', background: 'var(--primary)', color: 'white',
              borderRadius: 12, fontWeight: 800, textDecoration: 'none', fontSize: 15
            }}>
              Go to Team Portal Login
            </Link>
            <Link to="/portal/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
              color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', fontWeight: 600
            }}>
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}
