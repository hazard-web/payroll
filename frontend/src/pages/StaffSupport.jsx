import { useState, useEffect } from 'react'
import {
  Headphones, RefreshCw, CheckCircle, XCircle, Clock, Loader2,
  Eye, LogIn, LogOut, AlertCircle, Filter
} from 'lucide-react'
import api from '../api'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import PageShell, { PageHeader } from '../components/PageShell'

// ── Metadata ──────────────────────────────────────────────────
const STATUS_STYLES = {
  Pending:  { bg: '#fef3c7', color: '#b45309' },
  Approved: { bg: '#dcfce7', color: '#15803d' },
  Rejected: { bg: '#fee2e2', color: '#dc2626' },
}

const TYPE_META = {
  'Attendance / Punch Issue': { emoji: '⏱️', color: '#7c3aed', bg: '#ede9fe', short: 'Punch Issue' },
  'Leave Request Issue':      { emoji: '📅', color: '#0369a1', bg: '#e0f2fe', short: 'Leave' },
  'Payslip / Salary Issue':   { emoji: '💰', color: '#15803d', bg: '#dcfce7', short: 'Payslip' },
  'IT / Technical Problem':   { emoji: '💻', color: '#b45309', bg: '#fef3c7', short: 'IT / Tech' },
  'HR / Policy Query':        { emoji: '📋', color: '#6b21a8', bg: '#f3e8ff', short: 'HR / Policy' },
  'Other':                    { emoji: '💬', color: '#374151', bg: '#f3f4f6', short: 'Other' },
}

// ── Helpers ───────────────────────────────────────────────────
function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function relativeDate(d) {
  if (!d) return '—'
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  return fmtDate(d)
}

// ── Small reusable components ─────────────────────────────────
function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 11px', borderRadius: 20,
      background: s.bg, color: s.color, fontSize: 11, fontWeight: 700
    }}>
      {status === 'Pending'  && <Clock size={10} />}
      {status === 'Approved' && <CheckCircle size={10} />}
      {status === 'Rejected' && <XCircle size={10} />}
      {status}
    </span>
  )
}

function TypeBadge({ type, short }) {
  const m = TYPE_META[type] || TYPE_META['Other']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20,
      background: m.bg, color: m.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap'
    }}>
      {m.emoji} {short ? m.short : type}
    </span>
  )
}

function IconBtn({ onClick, title, children, variant = 'default' }) {
  const variants = {
    default: { bg: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text-muted)' },
    green:   { bg: '#dcfce7',   border: '1.5px solid #bbf7d0',      color: '#15803d' },
    red:     { bg: '#fee2e2',   border: '1.5px solid #fecaca',      color: '#dc2626' },
  }
  const v = variants[variant]
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 8, display: 'flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        background: v.bg, border: v.border, color: v.color, flexShrink: 0,
        transition: 'opacity 0.15s'
      }}
    >
      {children}
    </button>
  )
}

// ── Context view inside modal ─────────────────────────────────
function ContextView({ type, data, loading }) {
  if (loading) {
    return (
      <div style={{ padding: '28px 0', textAlign: 'center' }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    )
  }

  if (type === 'Attendance / Punch Issue') {
    if (!data) return (
      <EmptyContext text="No attendance record is linked to this request." />
    )
    const records = Array.isArray(data) ? data : [data]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {records.map((att, i) => (
          <div key={i} style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {fmtDate(att.date)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <PunchCard icon={<LogIn size={14} color="#15803d" />} iconBg="#dcfce7" label="Punch In" value={fmtTime(att.punchIn)} />
              <PunchCard icon={<LogOut size={14} color={att.punchOut ? '#dc2626' : '#b45309'} />} iconBg={att.punchOut ? '#fee2e2' : '#fef3c7'} label="Punch Out"
                value={att.punchOut ? fmtTime(att.punchOut) : 'Not yet'} valueColor={att.punchOut ? 'var(--text)' : '#b45309'} />
            </div>
            {att.totalHours > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 12 }}>
                <span><span style={{ color: 'var(--text-muted)' }}>Hours:</span> <strong style={{ color: 'var(--text)' }}>{att.totalHours.toFixed(2)}h</strong></span>
                {att.overtimeHours > 0 && <span><span style={{ color: 'var(--text-muted)' }}>OT:</span> <strong style={{ color: '#7c3aed' }}>{att.overtimeHours.toFixed(2)}h</strong></span>}
                <span>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
                  <strong style={{ color: att.status === 'complete' ? '#15803d' : '#b45309' }}>{att.status}</strong>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (type === 'Leave Request Issue') {
    if (!data || data.length === 0) return <EmptyContext text="No leave records found for this team member." />
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((lv, i) => (
          <div key={i} style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{lv.type} Leave</span>
              <StatusPill status={lv.status} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: lv.reason ? 6 : 0 }}>
              {fmtDate(lv.startDate)} → {fmtDate(lv.endDate)}
            </div>
            {lv.reason && (
              <div style={{ fontSize: 12, color: 'var(--text)', background: 'var(--surface)', borderRadius: 6, padding: '6px 10px' }}>
                {lv.reason}
              </div>
            )}
            {lv.adminNotes && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Admin note: {lv.adminNotes}</div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (type === 'Payslip / Salary Issue') {
    if (!data || data.length === 0) return <EmptyContext text="No payslips found for this team member." />
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((ps, i) => (
          <div key={i} style={{
            background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)',
            padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{ps.month} {ps.year}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ps.employeeName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#15803d' }}>₹{ps.netSalary?.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Net Salary</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <EmptyContext text="Review the team member's message below and respond accordingly." />
}

function PunchCard({ icon, iconBg, label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: valueColor || 'var(--text)', marginTop: 1 }}>{value}</div>
      </div>
    </div>
  )
}

function EmptyContext({ text }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <AlertCircle size={15} style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{text}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
const FILTERS = ['All', 'Pending', 'Approved', 'Rejected']

export default function StaffSupport() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  // Confirm action modal
  const [actionModal, setActionModal] = useState(null) // { id, action, requestType }
  const [adminNote, setAdminNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // View detail modal
  const [viewModal, setViewModal] = useState(null)
  const [contextData, setContextData] = useState(null)
  const [contextLoading, setContextLoading] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await api.get('/support/admin')
      setRequests(res.data.data || [])
    } catch {
      toast.error('Failed to load support requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [])

  const openAction = (id, action, requestType) => {
    setAdminNote('')
    setActionModal({ id, action, requestType })
  }

  const handleAction = async () => {
    if (!actionModal) return
    setActionLoading(true)
    try {
      await api.put(`/support/admin/${actionModal.id}/${actionModal.action}`, { adminNote })
      toast.success(actionModal.action === 'approve' ? 'Request approved.' : 'Request rejected.')
      setActionModal(null)
      setAdminNote('')
      fetchRequests()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const openView = async (req) => {
    setViewModal(req)
    setContextData(null)
    setContextLoading(true)
    try {
      const res = await api.get(`/support/admin/${req._id}/context`)
      setContextData(res.data.data)
    } catch {
      setContextData({ type: req.requestType, data: null })
    } finally {
      setContextLoading(false)
    }
  }

  const counts = {
    All: requests.length,
    Pending: requests.filter(r => r.status === 'Pending').length,
    Approved: requests.filter(r => r.status === 'Approved').length,
    Rejected: requests.filter(r => r.status === 'Rejected').length,
  }

  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter)

  return (
    <PageShell wide>
      <PageHeader
        title="Team Support"
        subtitle="Review and respond to team requests"
        actions={
        <button
          onClick={fetchRequests}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}
        >
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </button>
        }
      />

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { key: 'All',      label: 'Total',    icon: <Headphones size={16} color="#7c3aed" />, iconBg: '#ede9fe', numColor: 'var(--text)' },
          { key: 'Pending',  label: 'Pending',  icon: <Clock size={16} color="#b45309" />,      iconBg: '#fef3c7', numColor: '#b45309' },
          { key: 'Approved', label: 'Approved', icon: <CheckCircle size={16} color="#15803d" />, iconBg: '#dcfce7', numColor: '#15803d' },
          { key: 'Rejected', label: 'Rejected', icon: <XCircle size={16} color="#dc2626" />,    iconBg: '#fee2e2', numColor: '#dc2626' },
        ].map(s => (
          <div
            key={s.key}
            onClick={() => setFilter(s.key)}
            style={{
              background: 'var(--surface)', border: filter === s.key ? '2px solid #7c3aed' : '1px solid var(--border)',
              borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
              boxShadow: filter === s.key ? '0 0 0 3px rgba(124,58,237,0.08)' : 'var(--shadow-sm)',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: s.numColor, lineHeight: 1 }}>{counts[s.key]}</div>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--surface)', borderRadius: 12, padding: 5, border: '1px solid var(--border)', width: 'fit-content' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              background: filter === f ? '#7c3aed' : 'transparent',
              color: filter === f ? 'white' : 'var(--text-muted)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            {f}
            {counts[f] > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 800,
                background: filter === f ? 'rgba(255,255,255,0.25)' : 'var(--bg)',
                color: filter === f ? 'white' : 'var(--text-muted)',
                borderRadius: 20, padding: '1px 7px', minWidth: 18, textAlign: 'center'
              }}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        {loading ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Filter size={22} style={{ opacity: 0.3 }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>No {filter !== 'All' ? filter.toLowerCase() : ''} requests</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {filter === 'All' ? 'Team requests will appear here.' : `No requests with ${filter} status.`}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  {['Team', 'Request', 'Date', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '11px 18px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, i) => (
                  <motion.tr
                    key={req._id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
                  >
                    {/* Team */}
                    <td style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{req.staff?.fullName || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{req.staff?.employeeId || ''}</div>
                    </td>

                    {/* Request type + message preview */}
                    <td style={{ padding: '13px 18px', maxWidth: 240 }}>
                      <TypeBadge type={req.requestType} short />
                      {req.message && (
                        <div style={{
                          fontSize: 12, color: 'var(--text-muted)', marginTop: 5,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: 220
                        }}>
                          {req.message}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{relativeDate(req.date)}</div>
                      {relativeDate(req.date) !== fmtDate(req.date) && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{fmtDate(req.date)}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '13px 18px' }}>
                      <StatusPill status={req.status} />
                      {req.adminNote && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.adminNote}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '13px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconBtn onClick={() => openView(req)} title="View Details">
                          <Eye size={13} />
                        </IconBtn>
                        {req.status === 'Pending' && (
                          <>
                            <IconBtn onClick={() => openAction(req._id, 'approve', req.requestType)} title="Approve" variant="green">
                              <CheckCircle size={13} />
                            </IconBtn>
                            <IconBtn onClick={() => openAction(req._id, 'reject', req.requestType)} title="Reject" variant="red">
                              <XCircle size={13} />
                            </IconBtn>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── View Detail Modal ── */}
      <AnimatePresence>
        {viewModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setViewModal(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              style={{
                background: 'var(--surface)', borderRadius: 18,
                width: '100%', maxWidth: 500,
                position: 'relative', zIndex: 1,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{viewModal.staff?.fullName || '—'}</div>
                      <StatusPill status={viewModal.status} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {viewModal.staff?.employeeId} · {viewModal.staff?.designation || ''} · {fmtDate(viewModal.date)}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <TypeBadge type={viewModal.requestType} />
                    </div>
                  </div>
                  <button
                    onClick={() => setViewModal(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, padding: '0 0 0 12px', flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>

                {viewModal.message && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg)', borderRadius: 10, borderLeft: '3px solid #7c3aed' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Team Message</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{viewModal.message}</div>
                  </div>
                )}

                {viewModal.adminNote && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, borderLeft: '3px solid #86efac' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Admin Note</div>
                    <div style={{ fontSize: 12, color: '#166534' }}>{viewModal.adminNote}</div>
                  </div>
                )}
              </div>

              {/* Body */}
              <div style={{ padding: '18px 24px', overflowY: 'auto', flexGrow: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Linked Details
                </div>
                <ContextView
                  type={contextData?.type || viewModal.requestType}
                  data={contextData?.data}
                  loading={contextLoading}
                />
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                {viewModal.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => { setViewModal(null); openAction(viewModal._id, 'approve', viewModal.requestType) }}
                      style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#16a34a', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      onClick={() => { setViewModal(null); openAction(viewModal._id, 'reject', viewModal.requestType) }}
                      style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#dc2626', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setViewModal(null)}
                  style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Approve / Reject Confirm Modal ── */}
      <AnimatePresence>
        {actionModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={() => setActionModal(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              style={{
                background: 'var(--surface)', borderRadius: 16,
                width: '100%', maxWidth: 420,
                position: 'relative', zIndex: 1,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
              }}
            >
              {/* Colored top strip */}
              <div style={{ height: 4, background: actionModal.action === 'approve' ? '#16a34a' : '#dc2626' }} />

              <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: actionModal.action === 'approve' ? '#dcfce7' : '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {actionModal.action === 'approve'
                      ? <CheckCircle size={21} color="#15803d" />
                      : <XCircle size={21} color="#dc2626" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
                      {actionModal.action === 'approve' ? 'Approve Request' : 'Reject Request'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {actionModal.action === 'approve'
                        ? actionModal.requestType === 'Attendance / Punch Issue'
                          ? "This will reset the team member's punch-out so they can re-punch."
                          : 'Team member will be notified of the approval.'
                        : 'Team member will be notified of the rejection.'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '18px 26px' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                  Admin Note <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="Add a note for the team member..."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1.5px solid var(--border)', background: 'var(--bg)',
                    color: 'var(--text)', fontSize: 13, resize: 'vertical',
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ padding: '12px 26px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setActionModal(null)}
                  style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={actionLoading}
                  style={{
                    padding: '9px 22px', borderRadius: 9, border: 'none',
                    background: actionModal.action === 'approve' ? '#16a34a' : '#dc2626',
                    color: 'white', fontWeight: 700, fontSize: 13,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {actionModal.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}
