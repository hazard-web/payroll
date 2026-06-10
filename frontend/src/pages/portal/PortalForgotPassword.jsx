import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Loader2, Send } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion } from 'framer-motion'

export default function PortalForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/portal/forgot-password', { email })
      setSent(true)
      toast.success('Reset link sent successfully.')
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
            <div style={{ padding: '24px', background: 'var(--bg)', borderRadius: 12, color: 'var(--text-muted)', marginBottom: 32, fontSize: 14, lineHeight: 1.6 }}>
              We've sent a secure reset link to <strong>{email}</strong>. Please follow the instructions to regain access.
            </div>
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
