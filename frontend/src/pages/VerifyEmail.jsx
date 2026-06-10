import { Mail, ArrowRight, FileSpreadsheet, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function VerifyEmail() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 'clamp(20px, 5vw, 60px)'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
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

        <div style={{
          width: 80, height: 80, borderRadius: 12, background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)', margin: '0 auto 32px', border: '2px solid var(--border)'
        }}>
          <Send size={36} />
        </div>
        
        <h1 style={{ color: 'var(--primary)', marginBottom: 16, letterSpacing: '-0.02em' }}>
          Verification Required
        </h1>
        
        <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6, marginBottom: 40, fontWeight: 500 }}>
          Check your enterprise inbox. We've sent a statutory verification link to your registered email address.
        </p>

        <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: 12, marginBottom: 40, border: '1.5px dashed var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-light)', margin: 0, fontWeight: 600 }}>
            No link arrived? Check your filters or <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, padding: 0, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--primary)', textUnderlineOffset: 3 }}>Request Resend</button>.
          </p>
        </div>

        <Link to="/login" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          color: 'var(--primary)', fontWeight: 800, textDecoration: 'none', fontSize: 15
        }}>
          Return to Portal Access <ArrowRight size={18} />
        </Link>
      </motion.div>
    </div>
  )
}
