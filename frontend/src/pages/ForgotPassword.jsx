import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, ArrowLeft, FileSpreadsheet, ShieldCheck, KeyRound, ExternalLink, Inbox } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { motion } from 'framer-motion'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [devResetLink, setDevResetLink] = useState(null)
  const [devEmailPreview, setDevEmailPreview] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setSent(true)
      // In dev mode (or when SMTP is not configured), the backend returns
      // a usable reset link in the response so users can still recover.
      if (res?.data?.devResetLink) {
        setDevResetLink(res.data.devResetLink)
        toast.success('SMTP not configured — use the dev link below to reset your password.', { duration: 5000 })
      } else if (res?.data?.devEmailPreview) {
        // Ethereal was used — the email was "sent" to a test inbox, can be viewed at this URL
        setDevEmailPreview(res.data.devEmailPreview)
        toast.success('Reset link dispatched (Ethereal test SMTP).', { duration: 5000 })
      } else {
        toast.success('Reset link dispatched — check your inbox.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Something went wrong. Please try again.')
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
              Recover <span style={{ color: 'var(--primary)' }}>Access.</span>
            </h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 48, fontWeight: 500 }}>
              Enter your registered email and we'll send you a secure password reset link.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', maxWidth: 260 }}>
              <ShieldCheck size={28} color="var(--primary)" style={{ marginBottom: 12 }} />
              <div style={{ color: 'white', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secure Reset</div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                Link expires in 1 hour for your security.
              </p>
            </div>
          </motion.div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
          Professional Statutory Artifacts &copy; {new Date().getFullYear()} PaySlip Pro Enterprise
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
          {!sent ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <h2 style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 12 }}>Password Recovery</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 500 }}>
                  We'll email you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 32 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Registered Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                      type="email"
                      id="forgot-email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="hr@acme.com"
                      style={{
                        width: '100%', padding: '16px 16px 16px 50px', background: 'var(--bg)',
                        border: '2px solid var(--border)', borderRadius: 12, outline: 'none',
                        fontSize: 15, color: 'var(--text)', transition: 'all 0.2s', fontWeight: 600,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
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
                  }}
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : 'Send Reset Link'}
                </motion.button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), #f59e0b)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 32px',
                boxShadow: '0 10px 30px rgba(245,158,11,0.3)',
              }}>
                <Mail size={36} color="var(--navy-dark)" strokeWidth={2.5} />
              </div>
              <h2 style={{ fontSize: 28, color: 'var(--primary)', marginBottom: 16 }}>Check Your Inbox</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
                If <strong style={{ color: 'var(--primary)' }}>{email}</strong> is registered, you will receive a password reset link shortly.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: (devResetLink || devEmailPreview) ? 20 : 40 }}>
                The link expires in <strong>1 hour</strong>. Check your spam folder if you don't see it.
              </p>

              {devEmailPreview && !devResetLink && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(88,131,59, 0.08), rgba(15, 23, 42, 0.04))',
                    border: '2px dashed rgba(88,131,59, 0.5)',
                    borderRadius: 14, padding: 20, marginBottom: 24, textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: '#58833b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Inbox size={18} color="#fff" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#58833b' }}>
                        Test email preview (Ethereal)
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                        Real SMTP not configured — view the captured test email
                      </div>
                    </div>
                  </div>
                  <a
                    href={devEmailPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', padding: '14px 18px',
                      background: '#58833b', color: 'white',
                      borderRadius: 10, textDecoration: 'none',
                      fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
                    }}
                  >
                    View Test Email <ExternalLink size={16} strokeWidth={2.5} />
                  </a>
                </motion.div>
              )}

              {devResetLink && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.04))',
                    border: '2px dashed rgba(245, 158, 11, 0.5)',
                    borderRadius: 14,
                    padding: 20,
                    marginBottom: 28,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
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

              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'none', fontSize: 15 }}>
                ← Back to Login
              </Link>
            </motion.div>
          )}

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              <ArrowLeft size={16} /> Back to Login
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
