import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ListChecks, CheckCircle2, Clock, Loader2,
  ChevronLeft, ChevronRight, CalendarDays,
  Circle, AlertCircle, Briefcase, TrendingUp,
  Calendar
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion, AnimatePresence } from 'framer-motion'
import PageShell from '../../components/PageShell'

// ── CSS ──────────────────────────────────────────────────────────────────────
const STYLES = `
  .pt-pill { display:inline-flex;align-items:center;gap:3px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap; }
  .pt-pill-green  { background:#e5ebdd;color:#58833b;border:1px solid rgba(88,131,59,.25); }
  .pt-pill-amber  { background:#fff7ed;color:#b45309;border:1px solid #fed7aa; }
  .pt-pill-slate  { background:#f1f5f9;color:#475569;border:1px solid #e2e8f0; }
  .pt-pill-blue   { background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe; }
  .pt-tab { display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;
            font-size:13px;font-weight:600;cursor:pointer;transition:all .16s;background:transparent;color:var(--text-muted); }
  .pt-tab:hover { background:var(--bg);color:var(--text); }
  .pt-tab.active { background:var(--primary);color:#fff;box-shadow:0 4px 12px rgba(88,131,59,.2); }
  .pt-stat { background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px; }
  .pt-card { background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:12px; }
  .pt-day-head { padding:10px 18px;background:var(--bg);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between; }
  .pt-task-row { padding:14px 18px;border-bottom:1px solid var(--border);display:grid;gap:10px; }
  .pt-task-row:last-child { border-bottom:none; }
  .pt-task-row:hover { background:rgba(0,0,0,.015); }
`

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const fmtDate = dt => dt
  ? new Date(dt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  : '—'

const fmtDateShort = dt => dt
  ? new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  : '—'

function StatusPill({ status }) {
  if (status === 'Completed')  return <span className="pt-pill pt-pill-green"><CheckCircle2 size={10} /> Completed</span>
  if (status === 'In Progress') return <span className="pt-pill pt-pill-amber"><Clock size={10} /> In Progress</span>
  return <span className="pt-pill pt-pill-slate"><Circle size={10} /> Pending</span>
}

// Build date range for "today", "week", or use month/year
function buildFilter(view, month, year) {
  const now = new Date()
  if (view === 'today') {
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  }
  if (view === 'week') {
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  }
  return { month, year }
}

// Check if a record falls in current week
function isThisWeek(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)) // Mon
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)
  return d >= startOfWeek && d <= endOfWeek
}

function isToday(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

export default function PortalTasks() {
  const now = new Date()
  const [view, setView] = useState('today') // 'today' | 'week' | 'month'
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('All') // 'All' | 'Completed' | 'In Progress' | 'Pending'

  // Inject CSS
  useEffect(() => {
    const id = 'pt-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id; el.innerHTML = STYLES
      document.head.appendChild(el)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { month: m, year: y } = buildFilter(view, month, year)
      const res = await api.get(`/attendance/history?month=${m}&year=${y}`)
      setRecords(res.data.history || [])
      setSummary(res.data.summary || null)
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [view, month, year])

  useEffect(() => { fetchData() }, [fetchData])

  // Filter records by view
  const filteredRecords = useMemo(() => {
    let recs = records.filter(r => Array.isArray(r.tasks) && r.tasks.length > 0)
    if (view === 'today')  recs = recs.filter(r => isToday(r.date))
    if (view === 'week')   recs = recs.filter(r => isThisWeek(r.date))
    return recs
  }, [records, view])

  // Flat list of all tasks with parent date info
  const allTasks = useMemo(() => {
    const tasks = []
    filteredRecords.forEach(record => {
      (record.tasks || []).forEach(task => {
        tasks.push({ ...task, _date: record.date, _recordId: record._id })
      })
    })
    return tasks
  }, [filteredRecords])

  // Apply status filter
  const visibleTasks = useMemo(() => {
    if (filterStatus === 'All') return allTasks
    return allTasks.filter(t => t.status === filterStatus)
  }, [allTasks, filterStatus])

  // Aggregate counts
  const counts = useMemo(() => ({
    total: allTasks.length,
    completed: allTasks.filter(t => t.status === 'Completed').length,
    inProgress: allTasks.filter(t => t.status === 'In Progress').length,
    pending: allTasks.filter(t => t.status === 'Pending').length,
  }), [allTasks])

  const completionRate = counts.total ? Math.round((counts.completed / counts.total) * 100) : 0

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // Group by date for display
  const groupedByDate = useMemo(() => {
    const map = {}
    visibleTasks.forEach(task => {
      const key = task._date
      if (!map[key]) map[key] = []
      map[key].push(task)
    })
    return Object.entries(map).sort((a, b) => new Date(b[0]) - new Date(a[0]))
  }, [visibleTasks])

  return (
    <PageShell>
      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>My Tasks</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          All tasks you submitted during punch-in & punch-out
        </p>
      </div>

      {/* ── View Tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {[
            { id: 'today', label: 'Today',  icon: Calendar },
            { id: 'week',  label: 'This Week', icon: CalendarDays },
            { id: 'month', label: 'Monthly', icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`pt-tab${view === id ? ' active' : ''}`}
              onClick={() => setView(id)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Month nav — only shown in monthly view */}
        {view === 'month' && (
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
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total',      value: counts.total,      icon: ListChecks,   bg: '#f1f5f9', color: '#475569' },
          { label: 'Completed',  value: counts.completed,  icon: CheckCircle2, bg: '#e5ebdd', color: '#58833b' },
          { label: 'In Progress',value: counts.inProgress, icon: Clock,        bg: '#fff7ed', color: '#b45309' },
          { label: 'Pending',    value: counts.pending,    icon: AlertCircle,  bg: '#fef2f2', color: '#991b1b' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="pt-stat">
            <div style={{ width: 34, height: 34, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginTop: 1 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      {counts.total > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Completion Rate</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>{completionRate}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ width: `${completionRate}%`, height: '100%', background: 'linear-gradient(90deg, #58833b, #7da859)', borderRadius: 999, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {/* ── Status Filter Chips ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {['All', 'Completed', 'In Progress', 'Pending'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '5px 14px', borderRadius: 999,
              background: filterStatus === s ? 'var(--primary)' : 'var(--bg)',
              color: filterStatus === s ? '#fff' : 'var(--text-muted)',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
              border: filterStatus === s ? '1px solid transparent' : '1px solid var(--border)',
              transition: 'all .15s',
            }}
          >
            {s} {s === 'All' ? `(${counts.total})` : s === 'Completed' ? `(${counts.completed})` : s === 'In Progress' ? `(${counts.inProgress})` : `(${counts.pending})`}
          </button>
        ))}
      </div>

      {/* ── Task List ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : groupedByDate.length === 0 ? (
        <div style={{ padding: 52, textAlign: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <ListChecks size={36} color="var(--text-light)" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>No tasks found</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {view === 'today' ? 'No tasks submitted today.' : view === 'week' ? 'No tasks this week.' : `No tasks for ${MONTHS[month - 1]} ${year}.`}
          </div>
        </div>
      ) : (
        <AnimatePresence>
          {groupedByDate.map(([dateStr, tasks]) => (
            <motion.div
              key={dateStr}
              className="pt-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* Day header */}
              <div className="pt-day-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={14} color="var(--primary)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {fmtDate(dateStr)}
                    {isToday(dateStr) && (
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(88,131,59,0.12)', color: 'var(--primary)' }}>
                        Today
                      </span>
                    )}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {tasks.filter(t => t.status === 'Completed').length}/{tasks.length} done
                </span>
              </div>

              {/* Task rows */}
              {tasks.map((task, idx) => (
                <div key={idx} className="pt-task-row" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                  {/* Status indicator dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                    background: task.status === 'Completed' ? '#58833b' : task.status === 'In Progress' ? '#f59e0b' : '#d1d5db',
                    boxShadow: task.status === 'Completed' ? '0 0 0 3px rgba(88,131,59,0.15)' : 'none',
                  }} />

                  <div style={{ minWidth: 0 }}>
                    {/* Project name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                      <Briefcase size={12} color="var(--text-muted)" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                        {task.project || 'Untitled Project'}
                      </span>
                    </div>
                    {/* Task description */}
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, fontWeight: 500 }}>
                      {task.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description</span>}
                    </div>
                    {/* Notes */}
                    {task.notes && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                        Note: {task.notes}
                      </div>
                    )}
                  </div>

                  <StatusPill status={task.status} />
                </div>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </PageShell>
  )
}
