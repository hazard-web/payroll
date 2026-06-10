import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStaffPortal } from '../../context/StaffPortalContext'
import { Lock, ShieldAlert, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion } from 'framer-motion'

export default function PortalChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { staffUser, setStaffUser } = useStaffPortal()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match')
    }

    setLoading(true)
    try {
      await api.post('/portal/change-password', {
        currentPassword,
        newPassword
      })

      toast.success('Security credentials updated.')
      
      // Update local state so ProtectedRoute lets them in
      setStaffUser(prev => ({ ...prev, mustChangePassword: false }))
      
      // Small delay to let state propagate if needed, though navigate should wait
      setTimeout(() => {
        navigate('/portal/dashboard')
      }, 100)
    } catch (err) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      background: 'var(--bg)', padding: 'clamp(20px, 5vw, 60px)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '40%', height: '40%', background: 'var(--emerald)', opacity: 0.05, filter: 'blur(100px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '40%', height: '40%', background: 'var(--primary)', opacity: 0.05, filter: 'blur(100px)', borderRadius: '50%' }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%', maxWidth: 480,
          borderRadius: 12, padding: 'clamp(32px, 5vw, 60px)',
          zIndex: 10
        }}
        className="card"
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ 
            width: 60, height: 60, borderRadius: 12, background: '#fee2e2', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 24px', color: '#ef4444',
            boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.2)'
          }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: 28, color: 'var(--primary)', marginBottom: 12 }}>Mandatory Reset</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 500, lineHeight: 1.6 }}>
            For your security, you must set a permanent password before accessing your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temporary Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="password" required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="The password provided by Admin"
                style={{
                  width: '100%', padding: '16px 16px 16px 50px', background: 'var(--bg)',
                  border: '2px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15,
                  color: 'var(--text)', transition: 'all 0.2s', fontWeight: 600
                }}
                className="btn-hover"
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Secure Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="password" required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                style={{
                  width: '100%', padding: '16px 16px 16px 50px', background: 'var(--bg)',
                  border: '2px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15,
                  color: 'var(--text)', transition: 'all 0.2s', fontWeight: 600
                }}
                className="btn-hover"
              />
            </div>
          </div>

          <div style={{ marginBottom: 40 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="password" required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
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
            {loading ? <Loader2 size={24} className="animate-spin" /> : <>Update & Continue <ArrowRight size={20} /></>}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
