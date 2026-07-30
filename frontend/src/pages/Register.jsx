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
      height: '100vh',
      maxHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-120px',
        width: 380, height: 380, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-120px', left: '-80px',
        width: 350, height: 350, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(15,45,82,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', boxSizing: 'border-box' }}
      >
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '28px 32px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
          boxSizing: 'border-box',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
              }}>
                <FileText size={18} color="#0b1a2b" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  BDA <span style={{ color: 'var(--primary)' }}>Payroll</span>
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                  BDA Technologies Pvt. Ltd.
                </div>
              </div>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 6, lineHeight: 1.2 }}>
              Create Your Account
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, margin: 0 }}>
              Set up your company payroll dashboard in seconds.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Company Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Company Name
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }} />
                <input
                  id="reg-company"
                  type="text"
                  required
                  value={form.companyName}
                  onChange={e => setForm({ ...form, companyName: e.target.value })}
                  placeholder="e.g. BDA Technologies Private Limited"
                  style={{
                    width: '100%', padding: '11px 11px 11px 42px',
                    borderRadius: 10, outline: 'none', fontSize: 13.5,
                    color: 'var(--text)', fontWeight: 500,
                    background: 'var(--bg)', border: '1.5px solid var(--border)',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  className="reg-input"
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }} />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="hr@yourcompany.com"
                  style={{
                    width: '100%', padding: '11px 11px 11px 42px',
                    borderRadius: 10, outline: 'none', fontSize: 13.5,
                    color: 'var(--text)', fontWeight: 500,
                    background: 'var(--bg)', border: '1.5px solid var(--border)',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  className="reg-input"
                />
              </div>
            </div>

            {/* Address */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Company Address
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }} />
                <input
                  id="reg-address"
                  type="text"
                  required
                  value={form.companyAddress}
                  onChange={e => setForm({ ...form, companyAddress: e.target.value })}
                  placeholder="Full registered office address"
                  style={{
                    width: '100%', padding: '11px 11px 11px 42px',
                    borderRadius: 10, outline: 'none', fontSize: 13.5,
                    color: 'var(--text)', fontWeight: 500,
                    background: 'var(--bg)', border: '1.5px solid var(--border)',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  className="reg-input"
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }} />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                  style={{
                    width: '100%', padding: '11px 44px 11px 42px',
                    borderRadius: 10, outline: 'none', fontSize: 13.5,
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
                    position: 'absolute', right: 12, top: '50%',
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
                      transition={{ duration: 0.12 }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </motion.div>
                  </AnimatePresence>
                </button>
              </div>
              {form.password.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <CheckCircle2
                    size={12}
                    color={form.password.length >= 6 ? '#22c55e' : 'var(--text-muted)'}
                  />
                  <span style={{
                    fontSize: 11.5,
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
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: 46, color: 'white',
                border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg, var(--primary) 0%, #1e4080 100%)',
                boxShadow: '0 4px 12px rgba(15,45,82,0.2)',
                opacity: loading ? 0.75 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Creating account…</>
                : <>Create Account <ArrowRight size={16} /></>
              }
            </motion.button>
          </form>

          {/* Sign in link */}
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>
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
          box-shadow: 0 0 0 3px rgba(15,45,82,0.08);
        }
        .reg-input::placeholder { color: var(--text-light); font-weight: 400; }
      `}</style>
    </div>
  )
}
