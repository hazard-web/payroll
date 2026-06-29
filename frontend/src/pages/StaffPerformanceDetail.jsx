import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, CheckCircle2, Clock, ListChecks, Loader2, MoreHorizontal } from 'lucide-react'
import PageShell, { PageLoading } from '../components/PageShell'
import { Avatar } from '../components/UI'
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

const getStatusColor = (status) => {
  switch (status) {
    case 'Completed': return { bg: '#e5ebdd', color: '#58833b' }
    case 'In Progress': return { bg: '#ffedd5', color: '#c2410c' }
    default: return { bg: '#f1f5f9', color: '#475569' }
  }
}

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{value}</div>
  </div>
)

const TaskRow = ({ task }) => {
  const colors = getStatusColor(task.status)
  return (
    <div style={{
      padding: 14,
      borderRadius: 10,
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      marginBottom: 10
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
            {task.project || '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {task.description || 'No description'}
          </div>
        </div>
        <span style={{
          padding: '4px 10px',
          borderRadius: 999,
          background: colors.bg,
          color: colors.color,
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}>
          {task.status}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
        <div>Assigned: {formatDate(task.taskDate)}</div>
        {task.punchIn && <div>Punch In: {formatTime(task.punchIn)}</div>}
        {task.punchOut && <div>Punch Out: {formatTime(task.punchOut)}</div>}
        <div style={{ fontWeight: 600, color: task.sessionStatus === 'Closed' ? '#58833b' : '#c2410c' }}>
          Session: {task.sessionStatus || 'Active'}
        </div>
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
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}
      >
        <ArrowLeft size={16} /> Back to Team
      </button>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <Avatar name={staff.fullName} style={{ width: 56, height: 56, borderRadius: 16, fontSize: 18 }} />
          <div>
            <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: 22, marginBottom: 4 }}>{staff.fullName}</h1>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {staff.designation || 'Team Member'} {staff.department ? `· ${staff.department}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <StatCard icon={ListChecks} label="Total Tasks" value={summary.totalTasks} color="#1d4ed8" />
          <StatCard icon={MoreHorizontal} label="Pending" value={summary.pending} color="#475569" />
          <StatCard icon={Clock} label="In Progress" value={summary.inProgress} color="#c2410c" />
          <StatCard icon={CheckCircle2} label="Completed" value={summary.completed} color="#58833b" />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task History</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleFilterChange(opt.value)}
                className={filter === opt.value ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, fontWeight: 600 }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {filter === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input-field"
                style={{ padding: '6px 10px', fontSize: 12, width: 140 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input-field"
                style={{ padding: '6px 10px', fontSize: 12, width: 140 }}
              />
            </div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div style={{
            padding: 48,
            textAlign: 'center',
            background: 'var(--bg)',
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
