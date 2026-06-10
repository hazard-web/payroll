import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Building2, MapPin, Loader2, UserPlus, FileSpreadsheet, ArrowRight, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ 
    email: '', password: '', companyName: '', companyAddress: '' 
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/register', form)
      toast.success('Enterprise account initiated!')
      navigate('/verify-email')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 'clamp(20px, 5vw, 60px)'
    }}>
      <div className="fade-in glass" style={{
        width: '100%', maxWidth: 500, padding: 'clamp(32px, 5vw, 60px)', 
        animationDuration: '0.6s'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
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
          <h1 style={{ color: 'var(--primary)', marginBottom: 8, letterSpacing: '-0.01em' }}>Initialize Workspace</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 500 }}>
            Setup your statutory payroll dashboard in seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entity Name</label>
            <div style={{ position: 'relative' }}>
              <Building2 size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="text" required
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                placeholder="Formal Company Name"
                style={{
                  width: '100%', padding: '14px 14px 14px 44px', background: 'var(--bg)',
                  border: '2px solid var(--border)', borderRadius: 6, outline: 'none', fontSize: 14,
                  fontWeight: 600, color: 'var(--text)'
                }}
                className="btn-hover"
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statutory Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="hr@enterprise.com"
                style={{
                  width: '100%', padding: '14px 14px 14px 44px', background: 'var(--bg)',
                  border: '2px solid var(--border)', borderRadius: 6, outline: 'none', fontSize: 14,
                  fontWeight: 600, color: 'var(--text)'
                }}
                className="btn-hover"
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Corporate Headquarters</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="text" required
                value={form.companyAddress}
                onChange={e => setForm({ ...form, companyAddress: e.target.value })}
                placeholder="Full Statutory Address"
                style={{
                  width: '100%', padding: '14px 14px 14px 44px', background: 'var(--bg)',
                  border: '2px solid var(--border)', borderRadius: 6, outline: 'none', fontSize: 14,
                  fontWeight: 600, color: 'var(--text)'
                }}
                className="btn-hover"
              />
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Master Security Key</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="password" required minLength={6}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '14px 14px 14px 44px', background: 'var(--bg)',
                  border: '2px solid var(--border)', borderRadius: 6, outline: 'none', fontSize: 14,
                  fontWeight: 600, color: 'var(--text)'
                }}
                className="btn-hover"
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', height: 56, background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 10px 25px -5px rgba(15,23,42,0.3)', transition: 'all 0.3s'
            }}
            className="btn-hover"
          >
            {loading ? <Loader2 size={24} className="spin" /> : <>Initiate Workspace <ArrowRight size={18} /></>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
          Existing enterprise account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'none' }}>Sign In</Link>
        </div>
      </div>
    </div>
  )
}
