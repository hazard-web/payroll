import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Radio, Bell, AlertTriangle, Zap, Calendar, Loader2, BellOff, BellRing
} from 'lucide-react'
import api from '../../api'
import PageShell from '../../components/PageShell'
import { PRIORITY_CONFIG } from '../../components/AnnouncementPreviewWidget'

const PRIORITY_ICONS = { Normal: Bell, Important: AlertTriangle, Urgent: Zap }

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

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) {
    return (
      <PageShell narrow>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      </PageShell>
    )
  }

  const urgentCount = announcements.filter(a => a.priority === 'Urgent').length

  return (
    <PageShell narrow>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(88,131,59,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Radio size={22} color="var(--primary)" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Announcements
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Company-wide updates and notices from your HR team
          </p>
        </div>
      </div>

      {/* ── Stats bar ── */}
      {announcements.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Active', value: announcements.length, icon: Radio, accent: '#58833b' },
            { label: 'Urgent', value: urgentCount, icon: Zap, accent: '#dc2626' },
          ].map(stat => (
            <div
              key={stat.label}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: `${stat.accent}15`, color: stat.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <stat.icon size={16} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              </div>
            </div>
          ))}
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
        <div style={{ display: 'grid', gap: 14 }}>
          {announcements.map((item, i) => {
            const cfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.Normal
            const PriorityIcon = PRIORITY_ICONS[item.priority] || Bell

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${cfg.border}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                }}
              >
                {/* Priority header bar */}
                <div style={{
                  height: 3,
                  background: `linear-gradient(90deg, ${cfg.strip} 0%, ${cfg.strip}99 60%, transparent 100%)`,
                }} />

                <div style={{ padding: '18px 20px' }}>
                  {/* Row 1: priority badge + date */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 12, marginBottom: 12,
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: cfg.bg, color: cfg.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <PriorityIcon size={13} />
                      </div>
                      <span
                        style={{
                          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '0.07em',
                          padding: '3px 10px', borderRadius: 999,
                          background: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <span style={{
                      fontSize: 11, color: 'var(--text-light)', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      <Calendar size={11} />
                      {fmtDate(item.createdAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: 15, fontWeight: 700, color: 'var(--text)',
                    margin: '0 0 10px', lineHeight: 1.4,
                  }}>
                    {item.title}
                  </h3>

                  {/* Full message */}
                  <p style={{
                    fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.7,
                    margin: 0, whiteSpace: 'pre-wrap',
                  }}>
                    {item.message}
                  </p>

                  {/* Date range (if set) */}
                  {(item.startDate || item.endDate) && (
                    <div style={{
                      marginTop: 12, paddingTop: 12,
                      borderTop: '1px solid var(--border)',
                      display: 'flex', gap: 16, flexWrap: 'wrap',
                    }}>
                      {item.startDate && (
                        <span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600 }}>
                          From: {fmtDate(item.startDate)}
                        </span>
                      )}
                      {item.endDate && (
                        <span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600 }}>
                          Until: {fmtDate(item.endDate)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
