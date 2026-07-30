import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Building2, MapPin, Loader2, ArrowRight, Eye, EyeOff, FileText, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { motion, AnimatePresence } from 'framer-motion'

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    email: '', password: '', companyName: '', companyAddress: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('Account created! Check your email to verify.')
      navigate('/verify-email')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 'clamp(20px, 5vw, 60px)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '-150px', right: '-150px',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-150px', left: '-100px',
        width: 450, height: 450, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(15,45,82,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 480, position: 'relative' }}
      >
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 'clamp(28px, 5vw, 48px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13,
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(245,158,11,0.4)',
              }}>
                <FileText size={22} color="#0b1a2b" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  BDA <span style={{ color: 'var(--primary)' }}>Payroll</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                  BDA Technologies Pvt. Ltd.
                </div>
              </div>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 8 }}>
              Create Your Account
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
              Set up your company payroll dashboard in seconds.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Company Name */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Company Name
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={17} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }} />
                <input
                  id="reg-company"
                  type="text"
                  required
                  value={form.companyName}
                  onChange={e => setForm({ ...form, companyName: e.target.value })}
                  placeholder="e.g. BDA Technologies Private Limited"
                  style={{
                    width: '100%', padding: '13px 13px 13px 46px',
                    borderRadius: 12, outline: 'none', fontSize: 14,
                    color: 'var(--text)', fontWeight: 500,
                    background: 'var(--bg)', border: '1.5px solid var(--border)',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  className="reg-input"
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={17} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }} />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="hr@yourcompany.com"
                  style={{
                    width: '100%', padding: '13px 13px 13px 46px',
                    borderRadius: 12, outline: 'none', fontSize: 14,
                    color: 'var(--text)', fontWeight: 500,
                    background: 'var(--bg)', border: '1.5px solid var(--border)',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  className="reg-input"
                />
              </div>
            </div>

            {/* Address */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Company Address
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={17} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }} />
                <input
                  id="reg-address"
                  type="text"
                  required
                  value={form.companyAddress}
                  onChange={e => setForm({ ...form, companyAddress: e.target.value })}
                  placeholder="Full registered office address"
                  style={{
                    width: '100%', padding: '13px 13px 13px 46px',
                    borderRadius: 12, outline: 'none', fontSize: 14,
                    color: 'var(--text)', fontWeight: 500,
                    background: 'var(--bg)', border: '1.5px solid var(--border)',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  className="reg-input"
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }} />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                  style={{
                    width: '100%', padding: '13px 48px 13px 46px',
                    borderRadius: 12, outline: 'none', fontSize: 14,
                    color: 'var(--text)', fontWeight: 500,
                    background: 'var(--bg)', border: '1.5px solid var(--border)',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  className="reg-input"
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
              {form.password.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <CheckCircle2
                    size={13}
                    color={form.password.length >= 6 ? '#22c55e' : 'var(--text-muted)'}
                  />
                  <span style={{
                    fontSize: 12,
                    color: form.password.length >= 6 ? '#22c55e' : 'var(--text-muted)',
                    fontWeight: 600,
                  }}>
                    {form.password.length >= 6 ? 'Strong enough' : `${6 - form.password.length} more characters needed`}
                  </span>
                </div>
              )}
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
                opacity: loading ? 0.75 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {loading
                ? <><Loader2 size={20} className="animate-spin" /> Creating account…</>
                : <>Create Account <ArrowRight size={18} /></>
              }
            </motion.button>
          </form>

          {/* Sign in link */}
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>

      <style>{`
        .reg-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(15,45,82,0.1);
        }
        .reg-input::placeholder { color: var(--text-light); font-weight: 400; }
      `}</style>
    </div>
  )
}
