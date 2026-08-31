import { motion } from 'framer-motion'
import { Radio, BellOff, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── Shared priority colour tokens ──────────────────────────────────────────────
export const PRIORITY_CONFIG = {
  Normal:    { color: '#58833b', bg: '#e5ebdd', border: 'rgba(88,131,59,0.25)',  strip: '#58833b' },
  Important: { color: '#b45309', bg: '#fef3c7', border: 'rgba(180,83,9,0.25)',  strip: '#f59e0b' },
  Urgent:    { color: '#dc2626', bg: '#fee2e2', border: 'rgba(220,38,38,0.25)', strip: '#dc2626' },
}

/**
 * AnnouncementPreviewWidget
 *
 * Props:
 *   announcements  - already-filtered active list (all of them; we slice to 3 here)
 *   loading        - boolean
 *   viewAllPath    - react-router path for "View All" button  e.g. '/announcements'
 *   emptyMessage   - string shown when list is empty (optional)
 *   title          - widget header title (optional, defaults to "Announcements")
 */
export default function AnnouncementPreviewWidget({
  announcements = [],
  loading = false,
  viewAllPath = '/announcements',
  emptyMessage = 'No active announcements.',
  title = 'Announcements',
}) {
  const navigate = useNavigate()
  const preview = announcements.slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        marginBottom: 'var(--space-6)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'rgba(88,131,59,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Radio size={16} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
              {title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
              Latest company-wide updates
            </div>
          </div>
          {announcements.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800,
              padding: '2px 8px', borderRadius: 999,
              background: 'rgba(88,131,59,0.1)', color: 'var(--primary)',
              letterSpacing: '0.04em',
            }}>
              {announcements.length}
            </span>
          )}
        </div>

        <button
          onClick={() => navigate(viewAllPath)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--primary)',
            fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          View All <ArrowRight size={12} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 20px 18px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '28px 0' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        ) : announcements.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '28px 20px', textAlign: 'center',
            background: 'var(--bg)', borderRadius: 10,
            border: '1px dashed var(--border)',
          }}>
            <BellOff size={26} style={{ color: 'var(--text-light)', marginBottom: 8, opacity: 0.6 }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {preview.map((item, i) => {
              const cfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.Normal
              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: 'flex',
                    background: 'var(--bg)',
                    border: `1px solid ${cfg.border}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  {/* Priority colour strip */}
                  <div style={{ width: 4, flexShrink: 0, background: cfg.strip }} />

                  <div style={{ flex: 1, padding: '12px 14px' }}>
                    {/* Badge + date row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 999,
                        background: cfg.bg, color: cfg.color,
                        border: `1px solid ${cfg.border}`,
                        flexShrink: 0,
                      }}>
                        {item.priority}
                      </span>
                      <span style={{
                        fontSize: 10, color: 'var(--text-light)', fontWeight: 600,
                        marginLeft: 'auto', whiteSpace: 'nowrap',
                      }}>
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: 'var(--text)',
                      marginBottom: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.title}
                    </div>

                    {/* 2-line message preview */}
                    <div style={{
                      fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {item.message}
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {/* Overflow hint */}
            {announcements.length > 3 && (
              <button
                onClick={() => navigate(viewAllPath)}
                style={{
                  width: '100%', padding: '9px', borderRadius: 8,
                  border: '1px dashed var(--border)',
                  background: 'transparent', color: 'var(--text-muted)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                +{announcements.length - 3} more - View All <ArrowRight size={11} />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
