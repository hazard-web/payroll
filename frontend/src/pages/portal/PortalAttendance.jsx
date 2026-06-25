import { memo, useState, useEffect, useCallback } from 'react'
import {
  Calendar as CalendarIcon, Clock, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, FileText, Send, ListChecks
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion, AnimatePresence } from 'framer-motion'

// ── styles ────────────────────────────────────────────────────────────────────
const styles = `
  .pa-layout { display:flex; gap:20px; align-items:flex-start; }
  .pa-sidebar {
    width:160px; flex-shrink:0; background:var(--surface);
    border:1px solid var(--border); border-radius:14px;
    overflow:hidden; position:sticky; top:80px;
  }
  .pa-sidebar-title {
    padding:14px 16px 10px;
    font-size:10px; font-weight:700; color:var(--text-muted);
    text-transform:uppercase; letter-spacing:.07em;
    border-bottom:1px solid var(--border);
  }
  .pa-nav-item {
    display:flex; align-items:center; gap:10px;
    padding:12px 16px; font-size:13px; font-weight:600;
    color:var(--text-muted); cursor:pointer; border:none;
    background:transparent; width:100%; text-align:left;
    transition:all .16s; border-left:3px solid transparent;
  }
  .pa-nav-item:hover { background:var(--bg); color:var(--text); }
  .pa-nav-item.active { color:var(--primary); background:rgba(88,131,59,.06); border-left-color:var(--primary); }
  .pa-content { flex:1; min-width:0; }
  @media(max-width:700px) {
    .pa-layout { flex-direction:column; }
    .pa-sidebar { width:100%; position:static; display:flex; flex-direction:row; }
    .pa-sidebar-title { display:none; }
    .pa-nav-item { flex:1; justify-content:center; border-left:none; border-bottom:3px solid transparent; }
    .pa-nav-item.active { border-bottom-color:var(--primary); border-left:none; }
  }
  /* pill */
  .pa-pill { display:inline-flex; align-items:center; gap:3px; padding:2px 9px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap; }
  .pa-pill-green  { background:#e5ebdd; color:#636B2F; border:1px solid rgba(99, 107, 47, 0.25); }
  .pa-pill-orange { background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }
  .pa-pill-blue   { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }
  .pa-pill-yellow { background:#fefce8; color:#854d0e; border:1px solid #fde047; }
  .pa-pill-red    { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
  .pa-pill-slate  { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
  .pa-pill-purple { background:#faf5ff; color:#6b21a8; border:1px solid #e9d5ff; }
  /* stat card */
  .pa-stat { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 18px; display:flex; align-items:center; gap:14px; }
  /* table */
  .pa-table-head { display:grid; padding:10px 18px; background:var(--bg); border-bottom:1px solid var(--border); }
  .pa-table-row  { display:grid; padding:12px 18px; border-bottom:1px solid var(--border); align-items:center; transition:background .12s; }
  .pa-table-row:last-child { border-bottom:none; }
  .pa-table-row:hover { background:rgba(0,0,0,.018); }
  /* card */
  .pa-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  /* form */
  .pa-label { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; display:block; }
  .pa-input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:13px; outline:none; transition:border-color .15s; }
  .pa-input:focus { border-color:var(--primary); }
`

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const fmtTime = dt => dt ? new Date(dt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : '—'
const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short'}) : '—'
const fmtFullDate = dt => dt ? new Date(dt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'

// Memoized: this renders once per row in the history table. Without memo,
// every parent re-render (timer tick, month nav, etc.) re-runs all the
// string-equality branches below for every row.
const WorkStatusPill = memo(function WorkStatusPill({ status }) {
  if (!status) return null
  if (status === 'Active')    return <span className="pa-pill pa-pill-blue">Active</span>
  if (status === 'Full Day')  return <span className="pa-pill pa-pill-green">Full Day</span>
  if (status === 'Half Day')  return <span className="pa-pill pa-pill-yellow">Half Day</span>
  if (status === 'LOP')       return <span className="pa-pill pa-pill-red">LOP</span>
  if (status === 'Leave')     return <span className="pa-pill pa-pill-purple">Leave</span>
  if (status === 'flagged')   return <span className="pa-pill pa-pill-red">Flagged</span>
  return <span className="pa-pill pa-pill-slate">{status}</span>
})

// ── Attendance Section ────────────────────────────────────────────────────────
function AttendanceSection() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [history, setHistory]   = useState([])
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(true)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/attendance/history?month=${month}&year=${year}`)
      setHistory(res.data.history || [])
      setSummary(res.data.summary || null)
    } catch (err) {
      toast.error('Failed to fetch attendance')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'var(--text)' }}>Attendance History</h2>
          <p style={{ margin:'3px 0 0', fontSize:13, color:'var(--text-muted)' }}>Your monthly work logs</p>
        </div>
        {/* Month nav */}
        <div style={{ display:'flex', alignItems:'center', gap:4, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'3px 6px' }}>
          <button onClick={prevMonth} style={{ border:'none', background:'none', cursor:'pointer', padding:'4px 6px', color:'var(--text)' }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', minWidth:110, textAlign:'center' }}>{MONTHS[month-1]} {year}</span>
          <button onClick={nextMonth} style={{ border:'none', background:'none', cursor:'pointer', padding:'4px 6px', color:'var(--text)' }}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:12, marginBottom:18 }}>
        {[
          { label:'Present',   value: summary?.presentDays ?? 0,                  icon: CalendarIcon, bg:'#e5ebdd', color:'#636B2F' },
          { label:'Avg Hours', value: `${(summary?.avgHours||0).toFixed(1)}h`,     icon: Clock,        bg:'#eff6ff', color:'#1d4ed8' },
          { label:'Tasks',     value: summary?.totalTasks ?? 0,                    icon: ListChecks,  bg:'#f7f6ff', color:'#4338ca' },
          { label:'Completed', value: summary?.completedTasks ?? 0,                icon: CheckCircle2, bg:'#e5ebdd', color:'#636B2F' },
          { label:'Flagged',   value: summary?.flaggedCount ?? 0,                 icon: AlertCircle,  bg:'#fef2f2', color:'#991b1b' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="pa-stat">
            <div style={{ width:36, height:36, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={17} color={color} />
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:'var(--text)', lineHeight:1.2, marginTop:1 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Loader2 size={28} className="animate-spin" style={{ color:'var(--primary)' }} /></div>
      ) : history.length === 0 ? (
        <div style={{ padding:52, textAlign:'center', background:'var(--surface)', borderRadius:12, border:'1px dashed var(--border)' }}>
          <CalendarIcon size={36} color="var(--text-light)" style={{ marginBottom:10 }} />
          <div style={{ fontWeight:700, color:'var(--text)', marginBottom:4 }}>No records found</div>
          <div style={{ color:'var(--text-muted)', fontSize:13 }}>No attendance data for {MONTHS[month-1]} {year}.</div>
        </div>
      ) : (
          <div className="pa-card">
            <div className="pa-table-head" style={{ gridTemplateColumns:'100px 80px 80px 70px 80px 90px' }}>
              {['Date','Punch In','Punch Out','Hours','Tasks','Status'].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight:700, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</div>
              ))}
            </div>
            <div style={{ maxHeight:440, overflowY:'auto' }}>
              {history.map((row, i) => {
                const taskCount = Array.isArray(row.tasks) ? row.tasks.length : 0
                const completed = Array.isArray(row.tasks) ? row.tasks.filter(t => t.status === 'Completed').length : 0
                return (
                  <motion.div key={i} initial={{ opacity:0 }} animate={{ opacity:1 }}
                    className="pa-table-row" style={{ gridTemplateColumns:'100px 80px 80px 70px 80px 90px' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--primary)' }}>{fmtDate(row.date)}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{fmtTime(row.punchIn)}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{row.punchOut ? fmtTime(row.punchOut) : <span className="pa-pill pa-pill-blue" style={{ fontSize:10 }}>Active</span>}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{row.totalHours ? `${row.totalHours.toFixed(1)}h` : '—'}</div>
                    <div style={{ fontSize:12, color:'var(--text)', fontWeight:700 }}>{taskCount ? `${completed}/${taskCount}` : '—'}</div>
                    <WorkStatusPill status={row.workStatus === 'Active' ? 'Active' : row.workStatus} />
                  </motion.div>
                )
              })}
            </div>
            {history.length > 0 && (
              <div style={{ padding:'10px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:18, flexWrap:'wrap', fontSize:12, color:'var(--text-muted)' }}>
                <span>Total: <strong style={{ color:'var(--text)' }}>{history.length} days</strong></span>
                <span>Hours: <strong style={{ color:'var(--text)' }}>{(summary?.totalHours||0).toFixed(1)}h</strong></span>
              </div>
            )}
        </div>
      )}
    </div>
  )
}

// ── Leave Section ─────────────────────────────────────────────────────────────
function LeaveSection() {
  const [leaveHistory, setLeaveHistory]   = useState([])
  const [histLoading, setHistLoading]     = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [form, setForm] = useState({ type:'Casual', startDate:'', endDate:'', reason:'' })

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
      setForm({ type:'Casual', startDate:'', endDate:'', reason:'' })
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
    <div>
      <div>
        <h2 style={{ margin:'0 0 4px', fontSize:18, fontWeight:800, color:'var(--text)' }}>Leave Management</h2>
        <p style={{ margin:'0 0 18px', fontSize:13, color:'var(--text-muted)' }}>Apply for leave and track your requests</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px,1fr))', gap:20 }}>

        {/* Apply Form */}
        <div className="pa-card">
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <Send size={16} color="var(--primary)" />
            <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Apply for Leave</span>
          </div>
          <form onSubmit={handleSubmit} style={{ padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
            {/* Type */}
            <div>
              <label className="pa-label">Leave Type</label>
              <select className="pa-input" value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                <option value="Casual">Paid Casual Leave</option>
                <option value="Sick">Paid Sick Leave</option>
                <option value="Custom">Custom Leave</option>
              </select>
            </div>

            {/* Dates */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="pa-label">Start Date</label>
                <input type="date" className="pa-input" required
                  value={form.startDate} onChange={e => setForm({...form, startDate:e.target.value})}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="pa-label">End Date</label>
                <input type="date" className="pa-input" required
                  value={form.endDate} onChange={e => setForm({...form, endDate:e.target.value})}
                  min={form.startDate || new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            {/* Day count badge */}
            {days !== null && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)' }}>
                <CalendarIcon size={14} color="var(--primary)" />
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                  Duration: <strong style={{ color:'var(--text)' }}>{days} day{days !== 1 ? 's' : ''}</strong>
                </span>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="pa-label">Reason</label>
              <textarea className="pa-input" required rows={3} placeholder="Explain your leave requirement…"
                value={form.reason} onChange={e => setForm({...form, reason:e.target.value})}
                style={{ resize:'vertical', minHeight:80 }} />
            </div>

            <button type="submit" disabled={submitLoading} className="btn-primary"
              style={{ height:44, display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:14, borderRadius:9 }}>
              {submitLoading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={15} /> Submit Request</>}
            </button>
          </form>
        </div>

        {/* Leave History */}
        <div className="pa-card">
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <FileText size={16} color="var(--primary)" />
              <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>My Requests</span>
            </div>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{leaveHistory.length} total</span>
          </div>

          {histLoading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Loader2 size={24} className="animate-spin" style={{ color:'var(--primary)' }} /></div>
          ) : leaveHistory.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              <CalendarIcon size={32} color="var(--text-light)" style={{ marginBottom:8 }} />
              <div>No leave requests yet.</div>
            </div>
          ) : (
            <div style={{ maxHeight:400, overflowY:'auto' }}>
              <AnimatePresence initial={false}>
                {leaveHistory.map(req => {
                  const statusPill =
                    req.status === 'Approved' ? 'pa-pill-green' :
                    req.status === 'Rejected' ? 'pa-pill-red' : 'pa-pill-orange'
                  const icon =
                    req.status === 'Approved' ? <CheckCircle2 size={11} /> :
                    req.status === 'Rejected' ? <XCircle size={11} /> : null
                  const reqDays = Math.max(1, Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / 86400000) + 1)
                  return (
                    <motion.div key={req._id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
                      style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:4 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{req.type} Leave</span>
                            <span className="pa-pill pa-pill-slate" style={{ fontSize:10 }}>{reqDays}d</span>
                          </div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                            {fmtFullDate(req.startDate)} – {fmtFullDate(req.endDate)}
                          </div>
                          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                            {req.reason}
                          </div>
                          {req.adminNotes && (
                            <div style={{ fontSize:11, color:'var(--text-light)', marginTop:4, fontStyle:'italic' }}>
                              Note: {req.adminNotes}
                            </div>
                          )}
                        </div>
                        <span className={`pa-pill ${statusPill}`} style={{ flexShrink:0 }}>
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
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const NAV = [
  { id:'attendance', label:'Attendance', icon: Clock },
  { id:'leave',      label:'Leave',      icon: CalendarIcon },
]

export default function PortalAttendance() {
  const [active, setActive] = useState('attendance')

  useEffect(() => {
    const id = 'pa-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.innerHTML = styles
      document.head.appendChild(el)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  return (
    <div className="pa-layout">
      {/* Left sidebar */}
      <aside className="pa-sidebar">
        <div className="pa-sidebar-title">Menu</div>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`pa-nav-item${active === id ? ' active' : ''}`} onClick={() => setActive(id)}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <div className="pa-content">
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-8 }}
            transition={{ duration:0.18 }}>
            {active === 'attendance' ? <AttendanceSection /> : <LeaveSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
