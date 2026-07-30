import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStaffPortal } from '../../context/StaffPortalContext'
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, Briefcase, Calendar, IndianRupee, Bell, ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const FEATURES = [
  { icon: Calendar, title: 'Attendance Tracking', desc: 'View your daily check-in & check-out logs' },
  { icon: IndianRupee, title: 'Payslip Access', desc: 'Download your monthly salary slips' },
  { icon: Briefcase, title: 'Leave Management', desc: 'Apply for leaves and track approvals' },
  { icon: Bell, title: 'Team Updates', desc: 'Stay updated with company announcements' },
]

export default function PortalLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useStaffPortal()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(email, password)
      toast.success('Welcome back!')
      if (data.mustChangePassword) {
        navigate('/portal/change-password')
      } else {
        navigate('/portal/dashboard')
      }
    } catch (err) {
      toast.error(err.message || 'Invalid email or password.')
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
          background: 'linear-gradient(150deg, #0b1f12 0%, #0f3320 50%, #0d4429 100%)',
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
          background: 'radial-gradient(circle, rgba(88,196,113,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', left: '-60px',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '50%', right: '-40px',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 56, position: 'relative' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(34,197,94,0.45)',
            flexShrink: 0,
          }}>
            <Briefcase size={24} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
              BDA <span style={{ color: '#4ade80' }}>Portal</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
              Employee Self-Service
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
            background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 24,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
            <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, letterSpacing: '0.05em' }}>
              TEAM MEMBER PORTAL
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: 20,
          }}>
            Your Work,<br />
            <span style={{ color: '#4ade80' }}>Your Way.</span>
          </h1>

          <p style={{
            fontSize: 16, color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7, marginBottom: 44, fontWeight: 400,
            maxWidth: 340,
          }}>
            Access your attendance records, payslips, leave requests, and more — all in one secure place.
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
                  background: 'rgba(74,222,128,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color="#4ade80" />
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
        {/* Subtle background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(34,197,94,0.05) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(15,51,32,0.05) 0%, transparent 50%)',
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
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 8, padding: '4px 10px', marginBottom: 16,
              }}>
                <ShieldCheck size={13} color="#22c55e" />
                <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>SECURE LOGIN</span>
              </div>
              <h2 style={{
                fontSize: 28, fontWeight: 800,
                color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2
              }}>
                Team Member Login
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
                Sign in to access your employee dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: 13, fontWeight: 700,
                  color: 'var(--text)', marginBottom: 8,
                }}>
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={17} style={{
                    position: 'absolute', left: 15, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-light)',
                    pointerEvents: 'none',
                  }} />
                  <input
                    id="portal-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="yourname@bdatechnologies.com"
                    style={{
                      width: '100%', padding: '14px 14px 14px 46px',
                      borderRadius: 12, outline: 'none', fontSize: 14,
                      color: 'var(--text)', fontWeight: 500,
                      background: 'var(--bg)',
                      border: '1.5px solid var(--border)',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    className="portal-auth-input"
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
                    to="/portal/forgot-password"
                    style={{ fontSize: 13, color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}
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
                    id="portal-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
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
                    className="portal-auth-input"
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
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
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

            {/* Admin portal link */}
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px 20px', borderRadius: 12,
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg)',
                  cursor: 'pointer',
                }}
                className="btn-hover"
              >
                <ShieldCheck size={16} color="var(--text-muted)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Login as Admin
                </span>
              </div>
            </Link>

            {/* Help note */}
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Having trouble logging in? Contact your{' '}
              <span style={{ color: '#22c55e', fontWeight: 600 }}>HR Administrator</span>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .login-sidebar { display: none !important; }
        }
        .portal-auth-input:focus {
          border-color: #22c55e !important;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.1);
        }
        .portal-auth-input::placeholder { color: var(--text-light); font-weight: 400; }
      `}</style>
    </div>
  )
}
