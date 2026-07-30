import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, Users, BarChart3, FileText, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  { icon: Users, title: 'Team Management', desc: 'Manage your entire workforce in one place' },
  { icon: BarChart3, title: 'Payroll Analytics', desc: 'Real-time salary & attendance insights' },
  { icon: FileText, title: 'Payslip Generation', desc: 'Automated, compliant PDF payslips' },
  { icon: Shield, title: 'Secure & Reliable', desc: 'Bank-grade data protection' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const onEmailChange = (e) => setForm((prev) => ({ ...prev, email: e.target.value }))
  const onPasswordChange = (e) => setForm((prev) => ({ ...prev, password: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      }
      const res = await api.post('/auth/login', payload)
      login(res.data.token, res.data.user)
      toast.success('Welcome back!')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>
      {/* ── LEFT: Branding Sidebar ── */}
      <motion.div
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 100 }}
        className="login-sidebar"
        style={{
          flex: '0 0 46%',
          background: 'linear-gradient(150deg, #0b1a2b 0%, #0f2d52 50%, #1a3a6b 100%)',
          padding: '52px 56px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          color: 'white',
          overflow: 'hidden',
          boxShadow: '24px 0 60px rgba(0,0,0,0.3)',
          zIndex: 10,
        }}
      >
        {/* Decorative background orbs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', left: '-60px',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '45%', right: '-40px',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 56, position: 'relative' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(245,158,11,0.45)',
            flexShrink: 0,
          }}>
            <FileText size={24} color="#0b1a2b" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
              BDA <span style={{ color: '#f59e0b' }}>Payroll</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
              BDA Technologies Pvt. Ltd.
            </div>
          </div>
        </div>

        {/* Hero Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          style={{ flex: 1, position: 'relative' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 24,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.05em' }}>
              ADMIN PORTAL
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: 20,
          }}>
            Smart Payroll<br />
            <span style={{ color: '#f59e0b' }}>Made Simple.</span>
          </h1>

          <p style={{
            fontSize: 16, color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7, marginBottom: 44, fontWeight: 400,
            maxWidth: 340,
          }}>
            Manage your team's salaries, attendance, and payslips — all from one powerful dashboard.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(245,158,11,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500, position: 'relative', marginTop: 32 }}>
          © {new Date().getFullYear()} BDA Technologies Private Limited · All rights reserved
        </div>
      </motion.div>

      {/* ── RIGHT: Login Form ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(24px, 5vw, 60px)',
        position: 'relative',
        background: 'var(--bg)',
      }}>
        {/* Subtle background pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(245,158,11,0.06) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(15,45,82,0.06) 0%, transparent 50%)',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          style={{ width: '100%', maxWidth: 420, position: 'relative' }}
        >
          {/* Card */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 'clamp(28px, 5vw, 48px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          }}>
            {/* Header */}
            <div style={{ marginBottom: 36 }}>
              <h2 style={{
                fontSize: 28, fontWeight: 800,
                color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2
              }}>
                Admin Login
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
                Sign in to manage your company's payroll dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: 13, fontWeight: 700,
                  color: 'var(--text)', marginBottom: 8,
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={17} style={{
                    position: 'absolute', left: 15, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-light)',
                    pointerEvents: 'none',
                  }} />
                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={onEmailChange}
                    placeholder="hr@bdatechnologies.com"
                    style={{
                      width: '100%', padding: '14px 14px 14px 46px',
                      borderRadius: 12, outline: 'none', fontSize: 14,
                      color: 'var(--text)', fontWeight: 500,
                      background: 'var(--bg)',
                      border: '1.5px solid var(--border)',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    className="auth-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    Password
                  </label>
                  <Link
                    to="/forgot"
                    style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} style={{
                    position: 'absolute', left: 15, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-light)',
                    pointerEvents: 'none',
                  }} />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={onPasswordChange}
                    placeholder="Enter your password"
                    style={{
                      width: '100%', padding: '14px 48px 14px 46px',
                      borderRadius: 12, outline: 'none', fontSize: 14,
                      color: 'var(--text)', fontWeight: 500,
                      background: 'var(--bg)',
                      border: '1.5px solid var(--border)',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    className="auth-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{
                      position: 'absolute', right: 14, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', padding: 4,
                      color: 'var(--text-light)',
                      display: 'flex', alignItems: 'center',
                      transition: 'color 0.2s',
                    }}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={showPassword ? 'hide' : 'show'}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.15 }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </motion.div>
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: 52, color: 'white',
                  border: 'none', borderRadius: 12,
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, var(--primary) 0%, #1e4080 100%)',
                  boxShadow: '0 8px 24px rgba(15,45,82,0.35)',
                  transition: 'opacity 0.2s',
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading
                  ? <><Loader2 size={20} className="animate-spin" /> Signing in…</>
                  : <>Sign In <ArrowRight size={18} /></>
                }
              </motion.button>
            </form>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: '28px 0',
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Team portal link */}
            <Link
              to="/portal/login"
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px 20px', borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'var(--bg)',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
                className="btn-hover"
              >
                <Users size={16} color="var(--text-muted)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Login as Team Member
                </span>
              </div>
            </Link>

            {/* Register */}
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              New to BDA Payroll?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                Create an account
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .login-sidebar { display: none !important; }
        }
        .auth-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(15,45,82,0.1);
        }
        .auth-input::placeholder { color: var(--text-light); font-weight: 400; }
      `}</style>
    </div>
  )
}
