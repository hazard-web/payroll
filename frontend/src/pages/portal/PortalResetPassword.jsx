import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Lock, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion } from 'framer-motion'

export default function PortalResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) return toast.error('Invalid reset link')
    if (password !== confirmPassword) return toast.error('Passwords do not match')

    setLoading(true)
    try {
      await api.post('/portal/reset-password', { token, password })
      setSuccess(true)
      toast.success('Password reset complete.')
    } catch (err) {
      toast.error(err.message || 'Reset failed')
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
          <h2 style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 12 }}>New Credentials</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 500 }}>
            {success ? 'Security update verified.' : 'Set a new secure password for your portal access.'}
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="password" required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '16px 16px 16px 50px', background: 'var(--bg)',
                    border: '2px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15,
                    color: 'var(--text)', transition: 'all 0.2s', fontWeight: 600
                  }}
                  className="btn-hover"
                />
              </div>
            </div>

            <div style={{ marginBottom: 40 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="password" required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '16px 16px 16px 50px', background: 'var(--bg)',
                    border: '2px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15,
                    color: 'var(--text)', transition: 'all 0.2s', fontWeight: 600
                  }}
                  className="btn-hover"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit" disabled={loading}
              style={{
                width: '100%', height: 60, background: 'var(--primary)', color: 'white',
                border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 15px 30px -10px rgba(15,23,42,0.4)', transition: 'all 0.3s'
              }}
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : <>Reset Password <CheckCircle2 size={20} /></>}
            </motion.button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '24px', background: 'var(--bg)', borderRadius: 12, color: 'var(--text-muted)', marginBottom: 32, fontSize: 14, lineHeight: 1.6 }}>
              Your password has been successfully updated. You can now use your new credentials to log in.
            </div>
            <Link to="/portal/login" style={{ display: 'block', padding: '16px', background: 'var(--primary)', color: 'white', borderRadius: 12, fontWeight: 800, textDecoration: 'none' }}>
              Return to Login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}
