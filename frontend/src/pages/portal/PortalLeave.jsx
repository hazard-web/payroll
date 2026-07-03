import { useState, useEffect, useCallback } from 'react'
import {
  Calendar as CalendarIcon, Loader2,
  CheckCircle2, XCircle, FileText, Send
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion, AnimatePresence } from 'framer-motion'
import PageShell from '../../components/PageShell'

// ── shared styles ────────────────────────────────────────────────────────────
const styles = `
  .pl-pill { display:inline-flex; align-items:center; gap:3px; padding:2px 9px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap; }
  .pl-pill-green  { background:#e5ebdd; color:#58833b; border:1px solid rgba(88,131,59, 0.25); }
  .pl-pill-orange { background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }
  .pl-pill-slate  { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
  .pl-pill-red    { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
  .pl-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  .pl-label { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; display:block; }
  .pl-input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:13px; outline:none; transition:border-color .15s; }
  .pl-input:focus { border-color:var(--primary); }
`

const fmtFullDate = dt => dt ? new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function PortalLeave() {
  const [leaveHistory, setLeaveHistory] = useState([])
  const [histLoading, setHistLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [form, setForm] = useState({ type: 'Casual', startDate: '', endDate: '', reason: '' })

  // inject styles once
  useEffect(() => {
    const id = 'pl-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.innerHTML = styles
      document.head.appendChild(el)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  const fetchLeaveHistory = useCallback(async () => {
    try {
      const res = await api.get('/leaves/my-requests')
      setLeaveHistory(res.data.data || [])
    } catch {
      toast.error('Failed to fetch leave history')
    } finally {
      setHistLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeaveHistory() }, [fetchLeaveHistory])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitLoading(true)
    try {
      await api.post('/leaves/apply', form)
      toast.success('Leave request submitted successfully')
      setForm({ type: 'Casual', startDate: '', endDate: '', reason: '' })
      fetchLeaveHistory()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit leave request')
    } finally {
      setSubmitLoading(false)
    }
  }

  const days = form.startDate && form.endDate
    ? Math.max(1, Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1)
    : null

  return (
    <PageShell>
      {/* Page heading */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Leave Management</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Apply for leave and track your requests
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 20 }}>

        {/* ── Apply Form ── */}
        <div className="pl-card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={16} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Apply for Leave</span>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Leave type */}
            <div>
              <label className="pl-label">Leave Type</label>
              <select className="pl-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="Casual">Paid Casual Leave</option>
                <option value="Sick">Paid Sick Leave</option>
                <option value="Custom">Custom Leave</option>
              </select>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="pl-label">Start Date</label>
                <input type="date" className="pl-input" required
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="pl-label">End Date</label>
                <input type="date" className="pl-input" required
                  value={form.endDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })}
                  min={form.startDate || new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            {/* Day count badge */}
            {days !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <CalendarIcon size={14} color="var(--primary)" />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Duration: <strong style={{ color: 'var(--text)' }}>{days} day{days !== 1 ? 's' : ''}</strong>
                </span>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="pl-label">Reason</label>
              <textarea className="pl-input" required rows={3}
                placeholder="Explain your leave requirement…"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                style={{ resize: 'vertical', minHeight: 80 }} />
            </div>

            <button type="submit" disabled={submitLoading} className="btn-primary"
              style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, borderRadius: 9 }}>
              {submitLoading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={15} /> Submit Request</>}
            </button>
          </form>
        </div>

        {/* ── Leave History ── */}
        <div className="pl-card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>My Requests</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{leaveHistory.length} total</span>
          </div>

          {histLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
          ) : leaveHistory.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <CalendarIcon size={32} color="var(--text-light)" style={{ marginBottom: 8 }} />
              <div>No leave requests yet.</div>
            </div>
          ) : (
            <div style={{ maxHeight: 440, overflowY: 'auto' }}>
              <AnimatePresence initial={false}>
                {leaveHistory.map(req => {
                  const statusPill =
                    req.status === 'Approved' ? 'pl-pill-green' :
                    req.status === 'Rejected' ? 'pl-pill-red' : 'pl-pill-orange'
                  const icon =
                    req.status === 'Approved' ? <CheckCircle2 size={11} /> :
                    req.status === 'Rejected' ? <XCircle size={11} /> : null
                  const reqDays = Math.max(1, Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / 86400000) + 1)
                  return (
                    <motion.div key={req._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{req.type} Leave</span>
                            <span className="pl-pill pl-pill-slate" style={{ fontSize: 10 }}>{reqDays}d</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {fmtFullDate(req.startDate)} – {fmtFullDate(req.endDate)}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {req.reason}
                          </div>
                          {req.adminNotes && (
                            <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4, fontStyle: 'italic' }}>
                              Note: {req.adminNotes}
                            </div>
                          )}
                        </div>
                        <span className={`pl-pill ${statusPill}`} style={{ flexShrink: 0 }}>
                          {icon} {req.status}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
