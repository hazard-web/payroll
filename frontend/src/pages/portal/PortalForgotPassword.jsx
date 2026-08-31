import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Loader2, Send, KeyRound, ExternalLink } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion } from 'framer-motion'

export default function PortalForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [devResetLink, setDevResetLink] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/portal/forgot-password', { email })
      setSent(true)
      if (res?.data?.devResetLink) {
        setDevResetLink(res.data.devResetLink)
        toast.success('SMTP not configured - use the dev link below to reset.', { duration: 5000 })
      } else {
        toast.success('Reset link sent successfully.')
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
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
          <h2 style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 12 }}>Access Recovery</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 500 }}>
            {sent ? 'Check your inbox for instructions.' : 'Enter your email to reset your portal password.'}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 40 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team Member Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="employee@company.com"
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
              {loading ? <Loader2 size={24} className="animate-spin" /> : <>Send Reset Link <Send size={20} /></>}
            </motion.button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '24px', background: 'var(--bg)', borderRadius: 12, color: 'var(--text-muted)', marginBottom: devResetLink ? 20 : 32, fontSize: 14, lineHeight: 1.6 }}>
              We've sent a secure reset link to <strong>{email}</strong>. Please follow the instructions to regain access.
            </div>

            {devResetLink && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.04))',
                  border: '2px dashed rgba(245, 158, 11, 0.5)',
                  borderRadius: 14, padding: 20, marginBottom: 24, textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <KeyRound size={18} color="var(--navy-dark)" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>
                      SMTP not configured
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      Use this link to reset your password now
                    </div>
                  </div>
                </div>
                <a
                  href={devResetLink}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '14px 18px',
                    background: 'var(--primary)', color: 'var(--navy-dark)',
                    borderRadius: 10, textDecoration: 'none',
                    fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
                    boxShadow: '0 10px 20px -8px rgba(245, 158, 11, 0.5)',
                  }}
                >
                  Reset Password Now <ExternalLink size={16} strokeWidth={2.5} />
                </a>
                <div style={{
                  marginTop: 10, fontSize: 11, color: 'var(--text-muted)',
                  wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.4,
                }}>
                  {devResetLink}
                </div>
              </motion.div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/portal/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 800, textDecoration: 'none', fontSize: 14 }}>
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
