import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, ArrowRight, FileSpreadsheet, ShieldCheck, AlertCircle } from 'lucide-react'
import api from '../api'
import { motion } from 'framer-motion'

export default function VerifyAction() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [status, setStatus] = useState('loading') // loading, success, error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fallbackToken = new URLSearchParams(window.location.search).get('token') || 
                          (window.location.hash.includes('?') ? new URLSearchParams(window.location.hash.split('?')[1]).get('token') : null);
    const token = searchParams.get('token') || fallbackToken;
    
    if (!token) {
      setStatus('error')
      setMessage('No verification token detected in the link sequence.')
      return
    }

    const verifyToken = async () => {
      try {
        const res = await api.get(`/auth/verify-email?token=${token}`)
        setStatus('success')
        setMessage(res.data?.message || 'Enterprise Access Granted.')
        
        // Auto-redirect to login after establishing session state
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } catch (err) {
        setStatus('error')
        setMessage(err.response?.data?.message || 'Verification link integrity check failed.')
      }
    }

    verifyToken()
  }, [searchParams, navigate])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 'clamp(20px, 5vw, 60px)'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card" 
        style={{
          width: '100%', maxWidth: 500, padding: 'clamp(40px, 6vw, 80px)', textAlign: 'center',
          boxShadow: '0 40px 100px -20px rgba(0,0,0,0.15)', border: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(15,23,42,0.2)',
          }}>
            <FileSpreadsheet size={20} color="var(--primary)" strokeWidth={2.5} />
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20, fontWeight: 800,
            color: 'var(--primary)', letterSpacing: '-0.02em',
          }}>PaySlip<span style={{ color: 'var(--primary)' }}>Pro</span></div>
        </div>

        {status === 'loading' && (
          <div className="fade-in">
            <div style={{ margin: '0 auto 32px', color: 'var(--primary)', display: 'flex', justifyContent: 'center' }}>
              <Loader2 size={56} className="animate-spin" strokeWidth={2} />
            </div>
            <h1 style={{ color: 'var(--primary)', marginBottom: 12, letterSpacing: '-0.02em' }}>
              Validating Artifact...
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 500 }}>Establishing secure session protocol.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="fade-in">
            <div style={{
              width: 80, height: 80, borderRadius: 12, background: 'var(--emerald-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--emerald)', margin: '0 auto 32px', border: '2px solid var(--emerald)'
            }}>
              <ShieldCheck size={40} />
            </div>
            <h1 style={{ color: 'var(--emerald)', marginBottom: 16, letterSpacing: '-0.02em' }}>
              Identity Verified
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 500, marginBottom: 40 }}>
              {message} Redirecting to Corporate Portal...
            </p>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--primary)',
              color: 'white', padding: '14px 28px', borderRadius: 6, fontWeight: 800, textDecoration: 'none',
              boxShadow: '0 10px 20px -5px rgba(15,23,42,0.3)'
            }} className="btn-hover">
              Enter Portal <ArrowRight size={20} />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="fade-in">
            <div style={{
              width: 80, height: 80, borderRadius: 12, background: '#fee2e2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ef4444', margin: '0 auto 32px', border: '2px solid #fecaca'
            }}>
              <AlertCircle size={40} />
            </div>
            <h1 style={{ color: '#ef4444', marginBottom: 16, letterSpacing: '-0.02em' }}>
              Link Integrity Compromised
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 500, marginBottom: 40 }}>
              {message} The verification sequence may have expired or was previously utilized.
            </p>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, border: '2.5px solid var(--primary)',
              color: 'var(--primary)', padding: '14px 28px', borderRadius: 6, fontWeight: 800, textDecoration: 'none'
            }} className="btn-hover">
              Return to Access Point
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}
