import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Radio, Bell, AlertTriangle, Zap, Loader2, BellOff
} from 'lucide-react'
import api from '../../api'
import PageShell, { PageHeader } from '../../components/PageShell'
import { StatCard } from '../../components/UI'

const priorityConfig = {
  Normal:    { icon: Bell,     badge: 'pill--green',  color: '#58833b', bg: '#e5ebdd', border: 'rgba(88,131,59,0.25)' },
  Important: { icon: AlertTriangle, badge: 'pill--amber', color: '#b45309', bg: '#fef3c7', border: 'rgba(180,83,9,0.25)' },
  Urgent:    { icon: Zap,      badge: 'pill--red',    color: '#dc2626', bg: '#fee2e2', border: 'rgba(220,38,38,0.25)' },
}

const priorityOrder = { Urgent: 0, Important: 1, Normal: 2 }

export default function PortalAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Use the portal-auth endpoint so staff JWT is used
        const res = await api.get('/portal/announcements')
        const data = res.data.data || []
        // Sort: Urgent → Important → Normal, newest first
        data.sort((a, b) => {
          const pDiff = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
          if (pDiff !== 0) return pDiff
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
        setAnnouncements(data)
      } catch (err) {
        console.error('Failed to fetch announcements:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnnouncements()
  }, [])

  const fmtDate = (d) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <PageShell style={{ maxWidth: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      </PageShell>
    )
  }

  const urgentCount = announcements.filter(a => a.priority === 'Urgent').length

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
          Announcements
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          Company-wide updates and notices from your HR team
        </p>
      </div>

      {/* ── Stats bar ── */}
      {announcements.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard icon={Radio} label="ACTIVE ANNOUNCEMENTS" value={announcements.length} color="#58833b" />
          <StatCard icon={Zap} label="URGENT" value={urgentCount} color="#dc2626" />
        </div>
      )}

      {/* ── Empty state ── */}
      {announcements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px',
            background: 'var(--surface)', border: '1px dashed var(--border)',
            borderRadius: 16, textAlign: 'center',
          }}
        >
          <div style={{
            width: 56, height: 56, marginBottom: 16,
            borderRadius: 14, background: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BellOff size={26} color="var(--text-light)" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
            No active announcements
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
            Check back later for company-wide updates, policies, and important notices from your admin team.
          </p>
        </motion.div>
      ) : (
        /* ── Announcement cards ── */
        <div style={{ display: 'grid', gap: 16 }}>
          {announcements.map((item, i) => {
            const config = priorityConfig[item.priority] || priorityConfig.Normal

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 14, padding: '18px 20px', height: '100%', boxSizing: 'border-box' }}>
                  {/* Priority indicator strip */}
                  <div style={{
                    width: 4, borderRadius: 4,
                    background: config.color, flexShrink: 0,
                  }} />

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>{item.title}</h3>
                        <span className={`pill ${config.badge}`} style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
                          {item.priority}
                        </span>
                      </div>

                      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                        {item.message}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      {item.startDate && (
                        <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 600 }}>
                          From: {fmtDate(item.startDate)}
                        </span>
                      )}
                      {item.endDate && (
                        <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 600 }}>
                          Until: {fmtDate(item.endDate)}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 600, marginLeft: 'auto' }}>
                        {fmtDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
