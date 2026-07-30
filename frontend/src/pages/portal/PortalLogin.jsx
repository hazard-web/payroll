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
      height: '100vh',
      maxHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* ── LEFT: Branding Sidebar ── */}
      <motion.div
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 100 }}
        className="login-sidebar"
        style={{
          flex: '0 0 42%',
          background: 'linear-gradient(135deg, #0b1f12 0%, #0d4429 100%)',
          padding: '36px 44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          color: 'white',
          overflow: 'hidden',
          boxShadow: '10px 0 30px rgba(0,0,0,0.15)',
          zIndex: 10,
          boxSizing: 'border-box',
        }}
      >
        {/* Decorative background orbs */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(88,196,113,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', left: '-50px',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
            flexShrink: 0,
          }}>
            <Briefcase size={20} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
              BDA <span style={{ color: '#4ade80' }}>Portal</span>
            </div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
              Employee Self-Service
            </div>
          </div>
        </div>

        {/* Hero & Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, margin: '20px 0' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)',
              borderRadius: 20, padding: '4px 12px', marginBottom: 16,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
              <span style={{ fontSize: 10.5, color: '#4ade80', fontWeight: 700, letterSpacing: '0.05em' }}>
                TEAM MEMBER PORTAL
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 2.5vw, 2.4rem)',
              fontWeight: 900, lineHeight: 1.2,
              letterSpacing: '-0.02em',
              marginBottom: 12,
            }}>
              Your Work,<br />
              <span style={{ color: '#4ade80' }}>Your Way.</span>
            </h1>

            <p style={{
              fontSize: 14, color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6, marginBottom: 12, fontWeight: 400,
              maxWidth: 320,
            }}>
              Access your attendance records, payslips, leave requests, and more — all in one secure place.
            </p>
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(74,222,128,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={15} color="#4ade80" />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'white', lineHeight: 1 }}>{title}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontWeight: 500, position: 'relative' }}>
          © {new Date().getFullYear()} BDA Technologies Pvt. Ltd. · All rights reserved
        </div>
      </motion.div>

      {/* ── RIGHT: Login Form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        background: 'var(--bg)',
        height: '100vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        {/* Subtle background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(34,197,94,0.05) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(15,51,32,0.05) 0%, transparent 50%)',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{ width: '100%', maxWidth: 400, position: 'relative', boxSizing: 'border-box' }}
        >
          {/* Card */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '28px 32px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
            boxSizing: 'border-box',
          }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 8, padding: '4px 10px', marginBottom: 12,
              }}>
                <ShieldCheck size={13} color="#22c55e" />
                <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>SECURE LOGIN</span>
              </div>
              <h2 style={{
                fontSize: 24, fontWeight: 800,
                color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 6, lineHeight: 1.2
              }}>
                Team Member Login
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, margin: 0 }}>
                Sign in to access your employee dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 12.5, fontWeight: 700,
                  color: 'var(--text)', marginBottom: 6,
                }}>
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{
                    position: 'absolute', left: 14, top: '50%',
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
                      width: '100%', padding: '12px 12px 12px 42px',
                      borderRadius: 10, outline: 'none', fontSize: 13.5,
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
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                    Password
                  </label>
                  <Link
                    to="/portal/forgot-password"
                    style={{ fontSize: 12.5, color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{
                    position: 'absolute', left: 14, top: '50%',
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
                      width: '100%', padding: '12px 44px 12px 42px',
                      borderRadius: 10, outline: 'none', fontSize: 13.5,
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
                      position: 'absolute', right: 12, top: '50%',
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
                        transition={{ duration: 0.12 }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </motion.div>
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: 46, color: 'white',
                  border: 'none', borderRadius: 10,
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  boxShadow: '0 4px 12px rgba(34,197,94,0.2)',
                  transition: 'opacity 0.2s',
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Signing in…</>
                  : <>Sign In <ArrowRight size={16} /></>
                }
              </motion.button>
            </form>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              margin: '20px 0',
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Admin portal link */}
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                className="btn-hover"
              >
                <ShieldCheck size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Login as Admin
                </span>
              </div>
            </Link>

            {/* Help note */}
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
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
          box-shadow: 0 0 0 3px rgba(34,197,94,0.08);
        }
        .portal-auth-input::placeholder { color: var(--text-light); font-weight: 400; }
      `}</style>
    </div>
  )
}
