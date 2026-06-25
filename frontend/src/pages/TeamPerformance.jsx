import { useEffect, useState } from 'react'
import PageShell, { PageHeader, SectionCard, PageLoading } from '../components/PageShell'
import { Avatar, EmptyState } from '../components/UI'
import { CheckCircle2, Clock, ListChecks, Loader2, RefreshCcw, TrendingUp, Users } from 'lucide-react'
import api from '../api'

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fmtTime = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const statusColor = (status) => {
  if (status === 'Completed') return { bg: '#e5ebdd', color: '#636B2F' }
  if (status === 'In Progress') return { bg: '#ffedd5', color: '#c2410c' }
  return { bg: '#f1f5f9', color: '#475569' }
}

const StatTile = ({ icon: Icon, label, value, sub, color }) => (
  <div style={{ padding: 18, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{label}</div>
    </div>
    <div style={{ fontSize: 28, fontWeight: 850, color: 'var(--text)', letterSpacing: '-0.03em' }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
  </div>
)

const TaskCard = ({ task, index }) => {
  const colors = statusColor(task.status)
  return (
    <div style={{ padding: 13, borderRadius: 13, background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 3 }}>Task {index + 1}</div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{task.project || '—'}</div>
        </div>
        <span style={{ padding: '4px 9px', borderRadius: 999, background: colors.bg, color: colors.color, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>
          {task.status}
        </span>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-muted)' }}>{task.description}</div>
    </div>
  )
}

const EmployeePerformance = ({ record }) => {
  const tasks = Array.isArray(record.tasks) ? record.tasks : []
  const colors = {
    Completed: '#636B2F',
    'In Progress': '#c2410c',
    Pending: '#475569'
  }
  const rateColor = record.taskStats?.completionRate === 100 ? '#636B2F' : record.taskStats?.completionRate > 0 ? '#c2410c' : '#475569'

  return (
    <SectionCard noPadding>
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240 }}>
            <Avatar name={record.staff?.fullName} style={{ width: 46, height: 46, borderRadius: 14, fontSize: 15 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {record.staff?.fullName || 'Unknown Employee'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {record.staff?.designation || 'Team Member'} · {record.staff?.department || 'N/A'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Login {fmtTime(record.punchIn)}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Logout {fmtTime(record.punchOut)}</span>
            <span style={{ padding: '5px 10px', borderRadius: 999, background: `${rateColor}18`, color: rateColor, fontSize: 11, fontWeight: 800 }}>
              {record.taskStats?.completionRate || 0}% done
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(80px, 1fr))', gap: 10, marginTop: 16 }}>
          {[
            ['Total', record.taskStats?.total || 0, '#475569'],
            ['Completed', record.taskStats?.completed || 0, '#636B2F'],
            ['In Progress', record.taskStats?.inProgress || 0, '#c2410c'],
            ['Pending', record.taskStats?.pending || 0, '#475569'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ padding: 12, borderRadius: 13, background: `${color}10`, border: `1px solid ${color}22` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 850, color, marginTop: 3 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '0 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ListChecks size={16} color="var(--primary)" />
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Tasks added today</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {tasks.filter(t => t.status === 'Completed').length} completed / {tasks.length} total
          </div>
        </div>

        {tasks.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {tasks.map((task, index) => <TaskCard key={`${task.project}-${task.description}-${index}`} task={task} index={index} />)}
          </div>
        ) : (
          <div style={{ padding: 16, borderRadius: 13, background: 'var(--bg)', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: 13 }}>
            No tasks added for this employee yet.
          </div>
        )}
      </div>
    </SectionCard>
  )
}

export default function TeamPerformance() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPerformance = async () => {
    setLoading(true)
    try {
      const res = await api.get('/attendance/admin/performance', { params: { date } })
      setRecords(res.data.data || [])
      setSummary(res.data.summary || null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPerformance() }, [date])

  if (loading) return <PageShell><PageLoading label="Loading team performance…" /></PageShell>

  return (
    <PageShell wide>
      <PageHeader
        title="Team Performance"
        subtitle="Today's task progress from team login punch-in and punch-out updates."
        actions={
          <button onClick={fetchPerformance} className="btn-secondary btn-sm" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <RefreshCcw size={14} /> Refresh
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatTile icon={Users} label="Present Today" value={summary?.presentCount || 0} sub="Employees with attendance" color="#1d4ed8" />
        <StatTile icon={ListChecks} label="Total Tasks" value={summary?.totalTasks || 0} sub="Added by team today" color="#636B2F" />
        <StatTile icon={CheckCircle2} label="Completed" value={summary?.completedTasks || 0} sub={`${summary?.completionRate || 0}% completion`} color="#636B2F" />
        <StatTile icon={Clock} label="Pending / In Progress" value={(summary?.pendingTasks || 0) + (summary?.inProgressTasks || 0)} sub={`${summary?.pendingTasks || 0} pending · ${summary?.inProgressTasks || 0} in progress`} color="#c2410c" />
      </div>

      {records.length ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {records.map(record => <EmployeePerformance key={record._id} record={record} />)}
        </div>
      ) : (
        <SectionCard>
          <EmptyState message="No attendance or task data found for the selected date.">
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} />
            </div>
          </EmptyState>
        </SectionCard>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" style={{ width: 170, padding: '8px 10px', fontSize: 13 }} />
      </div>
    </PageShell>
  )
}
