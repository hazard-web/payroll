import { memo, useState, useEffect, useCallback } from 'react'
import {
  Calendar as CalendarIcon, Clock, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, CheckCircle2, ListChecks
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion } from 'framer-motion'
import PageShell from '../../components/PageShell'

// ── styles ────────────────────────────────────────────────────────────────────
const styles = `
  .pa-pill { display:inline-flex; align-items:center; gap:3px; padding:2px 9px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap; }
  .pa-pill-green  { background:#e5ebdd; color:#58833b; border:1px solid rgba(88,131,59, 0.25); }
  .pa-pill-orange { background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }
  .pa-pill-blue   { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }
  .pa-pill-yellow { background:#fefce8; color:#854d0e; border:1px solid #fde047; }
  .pa-pill-red    { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
  .pa-pill-slate  { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
  .pa-pill-purple { background:#faf5ff; color:#6b21a8; border:1px solid #e9d5ff; }
  .pa-stat { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 18px; display:flex; align-items:center; gap:14px; }
  .pa-table-head { display:grid; padding:10px 20px; background:var(--bg); border-bottom:1px solid var(--border); gap:12px; }
  .pa-table-row  { display:grid; padding:14px 20px; border-bottom:1px solid var(--border); align-items:center; transition:background .12s; gap:12px; }
  .pa-table-row:last-child { border-bottom:none; }
  .pa-table-row:hover { background:rgba(0,0,0,.018); }
  .pa-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
`

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const fmtTime = dt => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'

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

export default function PortalAttendance() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [history, setHistory]   = useState([])
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(true)

  // inject styles once
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

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/attendance/history?month=${month}&year=${year}`)
      setHistory(res.data.history || [])
      setSummary(res.data.summary || null)
    } catch {
      toast.error('Failed to fetch attendance')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <PageShell>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Attendance History</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Your monthly work logs</p>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 6px' }}>
          <button onClick={prevMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--text)' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 110, textAlign: 'center' }}>
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--text)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Present',   value: summary?.presentDays ?? 0,               icon: CalendarIcon, bg: '#e5ebdd', color: '#58833b' },
          { label: 'Avg Hours', value: `${(summary?.avgHours || 0).toFixed(1)}h`, icon: Clock,        bg: '#eff6ff', color: '#1d4ed8' },
          { label: 'Tasks',     value: summary?.totalTasks ?? 0,                 icon: ListChecks,   bg: '#f7f6ff', color: '#4338ca' },
          { label: 'Completed', value: summary?.completedTasks ?? 0,             icon: CheckCircle2, bg: '#e5ebdd', color: '#58833b' },
          { label: 'Flagged',   value: summary?.flaggedCount ?? 0,               icon: AlertCircle,  bg: '#fef2f2', color: '#991b1b' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="pa-stat">
            <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={17} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginTop: 1 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : history.length === 0 ? (
        <div style={{ padding: 52, textAlign: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <CalendarIcon size={36} color="var(--text-light)" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>No records found</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No attendance data for {MONTHS[month - 1]} {year}.</div>
        </div>
      ) : (
        <div className="pa-card">
          <div className="pa-table-head" style={{ gridTemplateColumns: '1.8fr 1.2fr 1.2fr 0.9fr 1fr 1.1fr' }}>
            {['Date', 'Punch In', 'Punch Out', 'Hours', 'Tasks', 'Status'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</div>
            ))}
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {history.map((row, i) => {
              const taskCount = Array.isArray(row.tasks) ? row.tasks.length : 0
              const completed = Array.isArray(row.tasks) ? row.tasks.filter(t => t.status === 'Completed').length : 0
              return (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="pa-table-row" style={{ gridTemplateColumns: '1.8fr 1.2fr 1.2fr 0.9fr 1fr 1.1fr' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{fmtDate(row.date)}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{fmtTime(row.punchIn)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {row.punchOut ? fmtTime(row.punchOut) : <span className="pa-pill pa-pill-blue" style={{ fontSize: 10 }}>Active</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{row.totalHours ? `${row.totalHours.toFixed(1)}h` : '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 700 }}>{taskCount ? `${completed}/${taskCount}` : '—'}</div>
                  <WorkStatusPill status={row.workStatus === 'Active' ? 'Active' : row.workStatus} />
                </motion.div>
              )
            })}
          </div>
          {history.length > 0 && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Total: <strong style={{ color: 'var(--text)' }}>{history.length} days</strong></span>
              <span>Hours: <strong style={{ color: 'var(--text)' }}>{(summary?.totalHours || 0).toFixed(1)}h</strong></span>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
