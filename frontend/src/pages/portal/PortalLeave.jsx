import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar as CalendarIcon, Loader2,
  CheckCircle2, XCircle, FileText, Send,
  Briefcase, User, Search, Filter, Plus, Lightbulb
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion, AnimatePresence } from 'framer-motion'
import PageShell from '../../components/PageShell'

// ── Shared styles ────────────────────────────────────────────────────────────
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

export default function PortalLeave() {
  const [leaveHistory, setLeaveHistory] = useState([])
  const [histLoading, setHistLoading]   = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [form, setForm] = useState({ type: 'Casual', startDate: '', endDate: '', reason: '' })

  // Leave balance
  const [balance, setBalance] = useState({ casual: 0, sick: 0 })
  const [policyLimit, setPolicyLimit] = useState({ casual: 12, sick: 12 })
  const [balanceLoading, setBalanceLoading] = useState(true)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  // Inject styles once
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

  const fetchBalanceAndPolicy = useCallback(async () => {
    try {
      const [profileRes, policyRes] = await Promise.all([
        api.get('/portal/me'),
        api.get('/leaves/policy')
      ])
      if (profileRes.data?.staff?.leaveBalance) {
        setBalance(profileRes.data.staff.leaveBalance)
      }
      if (policyRes.data?.data) {
        const policy = policyRes.data.data
        setPolicyLimit({
          casual: policy.casualLeave?.daysPerYear ?? 12,
          sick: policy.sickLeave?.daysPerYear ?? 12
        })
      }
    } catch {
      console.warn('Could not fetch leave balance or policy')
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeaveHistory(); fetchBalanceAndPolicy() }, [fetchLeaveHistory, fetchBalanceAndPolicy])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitLoading(true)
    try {
      const payload = {
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason
      }
      await api.post('/leaves/apply', payload)
      toast.success('Leave request submitted successfully')
      setForm({ type: 'Casual', startDate: '', endDate: '', reason: '' })
      fetchLeaveHistory()
      fetchBalanceAndPolicy()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit leave request')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Days calculation
  const days = useMemo(() => {
    if (form.startDate && form.endDate) {
      return Math.max(1, Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1)
    }
    return null
  }, [form.startDate, form.endDate])

  // Total leave taken calculation
  const leaveTaken = useMemo(() => {
    const approved = leaveHistory.filter(req => req.status === 'Approved')
    if (approved.length === 0) return 0
    return approved.reduce((sum, req) => {
      const reqDays = Math.max(1, Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / 86400000) + 1)
      return sum + reqDays
    }, 0)
  }, [leaveHistory])

  // Local Search & Filter logic on Leave History
  const filteredHistory = useMemo(() => {
    let list = [...leaveHistory]

    // Status Filter Tab
    if (filterStatus !== 'All') {
      list = list.filter(req => req.status === filterStatus)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(req => 
        (req.type && req.type.toLowerCase().includes(q)) ||
        (req.reason && req.reason.toLowerCase().includes(q))
      )
    }

    return list
  }, [leaveHistory, filterStatus, searchQuery])

  // Scroll shortcut to apply form
  const handleScrollToApply = () => {
    const el = document.getElementById('apply-leave-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      const firstInput = el.querySelector('select')
      if (firstInput) firstInput.focus()
    }
  }

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      {/* ── Header Section ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>Leave Management</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Apply for leave, view your balance, and track your requests
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input
              type="text"
              placeholder="Search Requests..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px 8px 32px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 13,
                width: 180,
                outline: 'none',
                transition: 'border-color 0.15s'
              }}
            />
          </div>

          {/* Filter button */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Filter size={13} color="var(--text-muted)" />
            Filter
          </button>

          {/* Apply Leave button */}
          <button
            onClick={handleScrollToApply}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#0f766e',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15,118,110,0.2)'
            }}
          >
            <Plus size={14} color="white" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* ── Leave Balance Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Casual Leave */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(37,99,235,0.08)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Casual Leave</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2, minHeight: 24 }}>
              {balanceLoading ? <div style={{ width: 40, height: 24, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', display: 'inline-block' }} /> : `${balance.casual} / ${policyLimit.casual}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontWeight: 600 }}>Days Available</div>
          </div>
        </div>

        {/* Sick Leave */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(249,115,22,0.08)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={18} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sick Leave</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2, minHeight: 24 }}>
              {balanceLoading ? <div style={{ width: 40, height: 24, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', display: 'inline-block' }} /> : `${balance.sick} / ${policyLimit.sick}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontWeight: 600 }}>Days Available</div>
          </div>
        </div>

        {/* Earned Leave */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(168,85,247,0.08)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Briefcase size={18} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earned Leave</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2, minHeight: 24 }}>
              {balanceLoading ? <div style={{ width: 40, height: 24, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', display: 'inline-block' }} /> : 8}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontWeight: 600 }}>Days Available</div>
          </div>
        </div>

        {/* Leave Taken */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,197,94,0.08)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Taken</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2, minHeight: 24 }}>
              {histLoading ? <div style={{ width: 40, height: 24, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', display: 'inline-block' }} /> : leaveTaken}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontWeight: 600 }}>Days This Year</div>
          </div>
        </div>
      </div>

      {/* ── Disclaimer Line ── */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, fontWeight: 600, paddingLeft: 4 }}>
        • CL & SL are paid leaves. Excess leave beyond available balance will be approval as Leave Without Pay (LWP).
      </div>

      {/* ── Main Two-Column Content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'flex-start' }}>

        {/* ── Apply Form (Left Column) ── */}
        <div className="pl-card" id="apply-leave-section">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={16} color="var(--primary)" />
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>Apply for Leave</span>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Leave type */}
            <div>
              <label className="pl-label">Leave Type</label>
              <select className="pl-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ fontWeight: 600 }}>
                <option value="Casual">Paid Casual Leave (CL)</option>
                <option value="Sick">Paid Sick Leave (SL)</option>
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

            {/* Attachment (Optional) */}
            <div>
              <label className="pl-label">Attach Document (Optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label className="btn-secondary" style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', gap: 6
                }}>
                  <Plus size={14} /> Upload File
                  <input type="file" style={{ display: 'none' }} accept="image/*,application/pdf" />
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF, JPG, PNG (Max. 3MB)</span>
              </div>
            </div>

            <button type="submit" disabled={submitLoading} className="btn-primary"
              style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, borderRadius: 9, background: '#0f766e', border: 'none' }}>
              {submitLoading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={15} /> Submit Request</>}
            </button>
          </form>
        </div>

        {/* ── Leave History (Right Column) ── */}
        <div className="pl-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} color="var(--primary)" />
              <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>Leave History</span>
            </div>
            <button onClick={() => setFilterStatus('All')} style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>View All</button>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)', padding: '0 16px' }}>
            {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '10px 12px', fontSize: 12, fontWeight: filterStatus === status ? 700 : 500,
                  color: filterStatus === status ? 'var(--text)' : 'var(--text-muted)',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  borderBottom: filterStatus === status ? '2.5px solid #0f766e' : '2.5px solid transparent'
                }}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Table column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1.8fr 1fr 1.2fr',
            padding: '10px 20px',
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            fontSize: 10.5,
            fontWeight: 800,
            color: 'var(--text-light)',
            letterSpacing: '0.04em'
          }}>
            <div>DATE</div>
            <div>LVE TYPE</div>
            <div>FROM - TO</div>
            <div>DURATION</div>
            <div>STATUS</div>
          </div>

          {histLoading && filteredHistory.length === 0 ? (
            <div>
              {Array(4).fill(0).map((_, i) => (
                <div key={`skel-h-${i}`} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.8fr 1fr 1.2fr', padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ width: 40, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: 60, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: 100, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: 30, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: 60, height: 18, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                </div>
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <CalendarIcon size={36} color="var(--text-light)" style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>No leave requests yet</div>
              <div>Submit your first leave request to get started.</div>
            </div>
          ) : (
            <div style={{ maxHeight: 440, overflowY: 'auto' }}>
              <AnimatePresence initial={false}>
                {filteredHistory.map((req, index) => {
                  const statusPill =
                    req.status === 'Approved' ? 'pl-pill-green' :
                    req.status === 'Rejected' ? 'pl-pill-red' : 'pl-pill-orange'
                  
                  const isHalf = req.reason?.includes('(Half Day)')
                  const reqDays = isHalf ? 0.5 : Math.max(1, Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / 86400000) + 1)
                  
                  return (
                    <motion.div key={req._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 1.8fr 1fr 1.2fr',
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                        fontSize: 12.5,
                        color: 'var(--text)'
                      }}>
                      <div>
                        {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                      <div style={{ fontWeight: 700 }}>
                        {req.type}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                        {new Date(req.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(req.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {reqDays}d
                      </div>
                      <div>
                        <span className={`pl-pill ${statusPill}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                          {req.status}
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

      {/* ── Tip Alert Banner ── */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 24,
        marginBottom: 24
      }}>
        <Lightbulb size={16} color="#1e40af" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 600 }}>
          Tip: Medical certificates are required as attachments for Sick Leaves longer than 3 consecutive days. Check your Leave Balance status before planning custom unpaid leaves.
        </span>
      </div>
    </PageShell>
  )
}
