import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { motion } from 'framer-motion'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token.')
    }
  }, [token])

  const passwordsMatch = form.password === form.confirm
  const passwordValid = form.password.length >= 6

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!passwordValid) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: form.password })
      setSuccess(true)
      toast.success('Password reset successful!')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* LEFT: Sidebar */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        style={{
          flex: '0 0 45%', background: 'var(--navy-dark)', padding: '60px',
          display: 'flex', flexDirection: 'column', position: 'relative',
          color: 'white', borderRight: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '20px 0 50px rgba(0,0,0,0.2)', zIndex: 10,
        }}
        className="login-sidebar"
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 460 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 60 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary) 0%, #f59e0b 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
            }}>
              <FileSpreadsheet size={24} color="var(--navy-dark)" strokeWidth={2.5} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
              PaySlip<span style={{ color: 'var(--primary)' }}>Pro</span>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 4vw, 3rem)', fontWeight: 900, marginBottom: 20, lineHeight: 1, letterSpacing: '-0.04em' }}>
              New <span style={{ color: 'var(--primary)' }}>Password.</span>
            </h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 48, fontWeight: 500 }}>
              Choose a strong password to secure your enterprise payroll dashboard.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'At least 6 characters',
                'Avoid common words',
                'Mix letters & numbers for strength',
              ].map((tip) => (
                <li key={tip} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                  {tip}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
          Professional Statutory Artifacts &copy; {new Date().getFullYear()} Payroll
        </div>
      </motion.div>

      {/* RIGHT: Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(20px, 5vw, 60px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{ width: '100%', maxWidth: 440, borderRadius: 12, padding: 'clamp(32px, 5vw, 60px)' }}
          className="card"
        >
          {success ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 32px', boxShadow: '0 10px 30px rgba(16,185,129,0.3)',
              }}>
                <CheckCircle size={40} color="white" />
              </div>
              <h2 style={{ fontSize: 28, color: 'var(--primary)', marginBottom: 16 }}>Password Updated!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
                Your password has been reset successfully. Redirecting you to login...
              </p>
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'none', fontSize: 15 }}>
                Go to Login →
              </Link>
            </motion.div>
          ) : !token ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 32px', boxShadow: '0 10px 30px rgba(239,68,68,0.3)',
              }}>
                <XCircle size={40} color="white" />
              </div>
              <h2 style={{ fontSize: 28, color: 'var(--primary)', marginBottom: 16 }}>Invalid Link</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
                This reset link is invalid or missing. Please request a new one.
              </p>
              <Link to="/forgot" style={{
                display: 'inline-block', background: 'var(--primary)', color: 'white',
                padding: '14px 28px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 15,
              }}>
                Request New Link
              </Link>
            </motion.div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <h2 style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 12 }}>Set New Password</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 500 }}>
                  Enter and confirm your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* New Password */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      style={{
                        width: '100%', padding: '16px 48px 16px 50px', background: 'var(--bg)',
                        border: `2px solid ${form.password && !passwordValid ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: 12, outline: 'none', fontSize: 15,
                        color: 'var(--text)', transition: 'all 0.2s', fontWeight: 600,
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 0 }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.password && !passwordValid && (
                    <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                      Minimum 6 characters required.
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: 40 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                      id="reset-password-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={form.confirm}
                      onChange={e => setForm({ ...form, confirm: e.target.value })}
                      placeholder="••••••••"
                      style={{
                        width: '100%', padding: '16px 48px 16px 50px', background: 'var(--bg)',
                        border: `2px solid ${form.confirm && !passwordsMatch ? '#ef4444' : form.confirm && passwordsMatch ? '#10b981' : 'var(--border)'}`,
                        borderRadius: 12, outline: 'none', fontSize: 15,
                        color: 'var(--text)', transition: 'all 0.2s', fontWeight: 600,
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 0 }}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.confirm && !passwordsMatch && (
                    <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                      Passwords do not match.
                    </p>
                  )}
                  {form.confirm && passwordsMatch && (
                    <p style={{ color: '#10b981', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                      ✓ Passwords match.
                    </p>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', height: 60, background: 'var(--primary)', color: 'white',
                    border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: '0 15px 30px -10px rgba(15,23,42,0.4)',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : 'Reset Password'}
                </motion.button>
              </form>
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link to="/login" style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              ← Back to Login
            </Link>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .login-sidebar { display: none !important; }
        }
      `}</style>
    </div>
  )
}
