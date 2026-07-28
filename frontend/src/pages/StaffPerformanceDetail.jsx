import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, CheckCircle2, Clock, ListChecks, Loader2, MoreHorizontal, Timer, Play, Square } from 'lucide-react'
import PageShell, { PageLoading } from '../components/PageShell'
import { Avatar, StatCard } from '../components/UI'
import api from '../api'

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' }
]

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatTime = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const getStatusColor = (status, isRunning) => {
  if (isRunning) return { bg: '#fef3c7', color: '#92400e' }
  switch (status) {
    case 'Completed': return { bg: '#e5ebdd', color: '#58833b' }
    case 'In Progress': return { bg: '#dbeafe', color: '#1e40af' }
    default: return { bg: '#f1f5f9', color: '#475569' }
  }
}

const fmtDuration = (minutes) => {
  if (!minutes || minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Pulse dot for running tasks
function PulseDot() {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: '#f59e0b', marginRight: 4,
      animation: 'spd-pulse 1.2s ease-in-out infinite'
    }} />
  )
}


const TaskRow = ({ task }) => {
  const isRunning = !!task.isRunning
  const colors = getStatusColor(task.status, isRunning)
  const duration = fmtDuration(task.durationMinutes)

  return (
    <div 
      className="panel"
      style={{
        padding: '14px 20px',
        borderRadius: 12,
        marginBottom: 10,
        border: `1px solid ${isRunning ? '#ea580c' : 'var(--border)'}`,
        background: isRunning ? 'rgba(254, 243, 199, 0.4)' : 'var(--surface)',
        transition: 'all .2s',
        fontFamily: 'var(--font-display), sans-serif'
      }}
    >
      <style>{`@keyframes spd-pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.6)}50%{box-shadow:0 0 0 5px rgba(245,158,11,0)}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{task.project || '—'}</span>
            {task.source === 'ASSIGNED' ? (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.15)'
              }}>
                Assigned by Admin
              </span>
            ) : (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                background: 'rgba(88, 131, 59, 0.08)', color: 'var(--primary)', border: '1px solid rgba(88, 131, 59, 0.15)'
              }}>
                Self-Reported (Punch)
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {task.description || 'No description'}
          </div>
        </div>
        <span style={{
          padding: '4px 10px', borderRadius: 999,
          background: colors.bg, color: colors.color,
          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
          display: 'inline-flex', alignItems: 'center',
        }}>
          {isRunning && <PulseDot />}
          {isRunning ? 'Running' : task.status}
        </span>
      </div>

      {/* Time tracking info */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
        {task.startedAt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Play size={10} color="#3b82f6" />
            <span>Started: <strong style={{ color: 'var(--text)' }}>{formatTime(task.startedAt)}</strong></span>
          </div>
        )}
        {task.completedAt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Square size={10} color="#58833b" />
            <span>Completed: <strong style={{ color: 'var(--text)' }}>{formatTime(task.completedAt)}</strong></span>
          </div>
        )}
        {duration && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Timer size={10} color="var(--text-muted)" />
            <span>Duration: <strong style={{ color: 'var(--text)' }}>{duration}</strong></span>
          </div>
        )}
        {isRunning && task.liveDurationFormatted && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)',
            borderRadius: 6, padding: '2px 8px', color: '#92400e', fontWeight: 700,
          }}>
            <Timer size={10} />
            {task.liveDurationFormatted}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
        <div>Assigned: {formatDate(task.taskDate)}</div>
      </div>
    </div>
  )
}

export default function StaffPerformanceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    const fetchStaffPerformance = async () => {
      try {
        setLoading(true)
        const params = { filter }
        if (filter === 'custom' && customStart && customEnd) {
          params.startDate = customStart
          params.endDate = customEnd
        }
        const res = await api.get(`/attendance/admin/staff/${id}/tasks`, { params })
        setData(res.data.data)
      } catch (err) {
        console.error('Failed to fetch staff performance:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStaffPerformance()
  }, [id, filter, customStart, customEnd])

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    if (newFilter !== 'custom') {
      setCustomStart('')
      setCustomEnd('')
    }
  }

  if (loading) return <PageShell><PageLoading label="Loading performance data…" /></PageShell>
  if (!data) return <PageShell><div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Failed to load performance data.</div></PageShell>

  const { staff, summary, tasks } = data

  return (
    <PageShell>
      <button
        type="button"
        onClick={() => navigate('/performance')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-display), sans-serif' }}
      >
        <ArrowLeft size={14} /> Back to Team
      </button>

      {/* Profile Header Box */}
      <div className="panel" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontFamily: 'var(--font-display), sans-serif' }}>
        <Avatar name={staff.fullName} style={{ width: 48, height: 48, borderRadius: 12, fontSize: 16 }} />
        <div>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 17, fontWeight: 800 }}>{staff.fullName}</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>
            {staff.designation || 'Team Member'} {staff.department ? `· ${staff.department}` : ''}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24, fontFamily: 'var(--font-display), sans-serif' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <StatCard icon={ListChecks} label="Total Tasks" value={summary.totalTasks} color="#1d4ed8" />
          <StatCard icon={MoreHorizontal} label="Pending" value={summary.pending} color="#475569" />
          <StatCard icon={Clock} label="In Progress" value={summary.inProgress} color="#c2410c" />
          <StatCard icon={CheckCircle2} label="Completed" value={summary.completed} color="#58833b" />
          <StatCard icon={Timer} label="Total Hours" value={summary.totalHours !== undefined ? `${summary.totalHours.toFixed(1)}h` : '—'} color="#7c3aed" />
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-display), sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task History</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleFilterChange(opt.value)}
                className={filter === opt.value ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, fontWeight: 700 }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {filter === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input-field"
                style={{ padding: '5px 10px', fontSize: 12, width: 130, borderRadius: 6 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input-field"
                style={{ padding: '5px 10px', fontSize: 12, width: 130, borderRadius: 6 }}
              />
            </div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div style={{
            padding: 48,
            textAlign: 'center',
            background: 'var(--surface)',
            borderRadius: 12,
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)'
          }}>
            No tasks found for the selected period.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {tasks.map((task, idx) => (
              <TaskRow key={`${task.attendanceId}-${idx}`} task={task} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
