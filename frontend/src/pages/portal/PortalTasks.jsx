import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ListChecks, CheckCircle2, Clock, Loader2,
  ChevronLeft, ChevronRight, CalendarDays,
  Circle, AlertCircle, Briefcase, TrendingUp,
  Calendar, Play, Square, RotateCcw, Timer,
  X, AlertTriangle, Zap, Search, Filter, Plus, Lightbulb
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion, AnimatePresence } from 'framer-motion'
import PageShell from '../../components/PageShell'

// ── Injected CSS ─────────────────────────────────────────────────────────────
const STYLES = `
  /* Layout */
  .pt-pill { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;letter-spacing:.02em; }
  .pt-pill-green  { background:linear-gradient(135deg,#e6f0da,#d4e8c4);color:#3d6b20;border:1px solid rgba(88,131,59,.25); }
  .pt-pill-blue   { background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1e40af;border:1px solid #93c5fd; }
  .pt-pill-slate  { background:linear-gradient(135deg,#f1f5f9,#e2e8f0);color:#475569;border:1px solid #cbd5e1; }
  .pt-pill-running { background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;border:1px solid #fcd34d;animation:pt-pulse-badge 1.5s ease-in-out infinite; }
  @keyframes pt-pulse-badge { 0%,100%{opacity:1} 50%{opacity:.7} }

  .pt-tab { display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;
            font-size:13px;font-weight:600;cursor:pointer;transition:all .16s;background:transparent;color:var(--text-muted); }
  .pt-tab:hover { background:var(--bg);color:var(--text); }
  .pt-tab.active { background:var(--primary);color:#fff;box-shadow:0 4px 12px rgba(88,131,59,.25); }

  .pt-stat {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease-in-out;
  }
  .pt-stat:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
    border-color: var(--primary-light, var(--border));
  }

  .pt-task-card {
    background:var(--surface);border:1px solid var(--border);border-radius:14px;
    overflow:hidden;margin-bottom:12px;transition:all .2s;
  }
  .pt-task-card:hover { box-shadow:0 6px 20px rgba(0,0,0,.08);transform:translateY(-1px); }
  .pt-task-card.running {
    border-color:rgba(245,158,11,.4);
    box-shadow:0 0 0 3px rgba(245,158,11,.08), 0 4px 16px rgba(245,158,11,.12);
  }
  .pt-task-card.completed { border-color:rgba(88,131,59,.3); }

  .pt-task-header { padding:14px 16px 10px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px; }
  .pt-task-meta { padding:0 16px 12px;display:flex;align-items:center;flex-wrap:wrap;gap:8px; }
  .pt-task-actions { padding:10px 16px 14px;display:flex;gap:8px;border-top:1px solid var(--border);background:rgba(0,0,0,.015); }

  .pt-action-btn {
    display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;
    border:1px solid;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;
    white-space:nowrap;
  }
  .pt-action-btn:disabled { opacity:.5;cursor:not-allowed; }
  .pt-action-btn.start  { background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border-color:transparent;box-shadow:0 2px 8px rgba(59,130,246,.3); }
  .pt-action-btn.start:hover:not(:disabled)  { box-shadow:0 4px 14px rgba(59,130,246,.45);transform:translateY(-1px); }
  .pt-action-btn.complete { background:linear-gradient(135deg,#58833b,#4a7030);color:#fff;border-color:transparent;box-shadow:0 2px 8px rgba(88,131,59,.3); }
  .pt-action-btn.complete:hover:not(:disabled) { box-shadow:0 4px 14px rgba(88,131,59,.45);transform:translateY(-1px); }
  .pt-action-btn.pending  { background:var(--bg);color:var(--text-muted);border-color:var(--border); }
  .pt-action-btn.pending:hover:not(:disabled)  { background:var(--surface);color:var(--text);box-shadow:0 2px 8px rgba(0,0,0,.08); }

  /* Live timer */
  .pt-timer { font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#92400e;
              background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);
              border-radius:6px;padding:3px 8px;letter-spacing:.05em; }

  /* Modal overlay */
  .pt-modal-overlay {
    position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;
    display:flex;align-items:center;justify-content:center;padding:20px;
    backdrop-filter:blur(4px);
  }
  .pt-modal {
    background:var(--surface);border-radius:16px;padding:28px;max-width:420px;width:100%;
    box-shadow:0 24px 48px rgba(0,0,0,.18);border:1px solid var(--border);
  }
  .pt-modal h3 { margin:0 0 6px;font-size:16px;font-weight:800;color:var(--text); }
  .pt-modal p { margin:0 0 20px;font-size:13px;color:var(--text-muted);line-height:1.5; }
  .pt-modal-btns { display:flex;gap:8px;justify-content:flex-end; }

  .pt-input {
    width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);
    background:var(--bg);color:var(--text);font-size:14px;font-weight:500;
    outline:none;transition:border-color .15s;box-sizing:border-box;
  }
  .pt-input:focus { border-color:var(--primary); }

  .pt-duration-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px; }

  /* Date group */
  .pt-date-section { margin-bottom:20px; }
  .pt-date-label { padding:8px 0;display:flex;align-items:center;gap:8px;margin-bottom:8px; }

  /* Running pulse dot */
  .pt-pulse-dot {
    width:8px;height:8px;border-radius:50%;background:#f59e0b;
    animation:pt-dot-pulse 1.2s ease-in-out infinite;display:inline-block;
  }
  @keyframes pt-dot-pulse {
    0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.6);opacity:1}
    50%{box-shadow:0 0 0 5px rgba(245,158,11,0);opacity:.8}
  }

  /* Progress bar */
  .pt-progress { height:5px;border-radius:999px;background:var(--border);overflow:hidden;margin-top:4px; }
  .pt-progress-fill { height:100%;border-radius:999px;background:linear-gradient(90deg,#58833b,#7cb84c);transition:width .5s ease; }
`

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const fmtDate = dt => dt
  ? new Date(dt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  : '—'

const fmtTime = dt => dt
  ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  : null

const fmtDuration = (minutes) => {
  if (!minutes || minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

const isToday = (dateStr) => new Date(dateStr).toDateString() === new Date().toDateString()
const isThisWeek = (dateStr) => {
  const d = new Date(dateStr), now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
  return d >= start && d <= end
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, isRunning }) {
  if (isRunning) return (
    <span className="pt-pill pt-pill-running">
      <span className="pt-pulse-dot" />
      Running
    </span>
  )
  if (status === 'Completed') return (
    <span className="pt-pill pt-pill-green">
      <CheckCircle2 size={10} />
      Completed
    </span>
  )
  if (status === 'In Progress') return (
    <span className="pt-pill pt-pill-blue">
      <Clock size={10} />
      In Progress
    </span>
  )
  return (
    <span className="pt-pill pt-pill-slate">
      <Circle size={10} />
      Pending
    </span>
  )
}

// ── Live Timer ────────────────────────────────────────────────────────────────
function LiveTimer({ startedAt, baseDurationMinutes = 0 }) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    const calcElapsed = () => {
      const base = (baseDurationMinutes || 0) * 60
      const live = startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0
      return base + live
    }
    setElapsed(calcElapsed())
    intervalRef.current = setInterval(() => setElapsed(calcElapsed()), 1000)
    return () => clearInterval(intervalRef.current)
  }, [startedAt, baseDurationMinutes])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  return (
    <span className="pt-timer">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

// ── Conflict Modal ────────────────────────────────────────────────────────────
function ConflictModal({ task, onConfirm, onCancel }) {
  return (
    <div className="pt-modal-overlay" onClick={onCancel}>
      <motion.div
        className="pt-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <h3>Active Task Running</h3>
        </div>
        <p>
          You already have a task in progress. Do you want to <strong>stop it</strong> and start this new task?
        </p>
        <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
          The elapsed time of the current task will be saved automatically.
        </div>
        <div className="pt-modal-btns">
          <button className="pt-action-btn pending" onClick={onCancel}>Cancel</button>
          <button className="pt-action-btn start" onClick={onConfirm}>
            <Zap size={13} /> Stop & Start New
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Manual Duration Modal ─────────────────────────────────────────────────────
function ManualDurationModal({ task, onSave, onCancel, saving }) {
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')

  const handleSave = () => {
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    if (h === 0 && m === 0) {
      toast.error('Please enter a valid duration')
      return
    }
    onSave(h, m)
  }

  return (
    <div className="pt-modal-overlay" onClick={onCancel}>
      <motion.div
        className="pt-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(88,131,59,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Timer size={18} color="var(--primary)" />
          </div>
          <h3>Enter Task Duration</h3>
        </div>
        <p>
          Start time was not recorded for <strong>"{task?.description}"</strong>. 
          Please enter the total time you worked on this task.
        </p>

        <div className="pt-duration-grid">
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Hours</label>
            <input
              type="number"
              min="0"
              max="23"
              placeholder="0"
              value={hours}
              onChange={e => setHours(e.target.value)}
              className="pt-input"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Minutes</label>
            <input
              type="number"
              min="0"
              max="59"
              placeholder="0"
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
              className="pt-input"
            />
          </div>
        </div>

        <div className="pt-modal-btns">
          <button className="pt-action-btn pending" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="pt-action-btn complete" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {saving ? 'Saving…' : 'Save & Complete'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Add Task Modal ────────────────────────────────────────────────────────────
function AddTaskModal({ onSave, onCancel, saving }) {
  const [project, setProject] = useState('General')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!description.trim()) {
      toast.error('Please enter a task description')
      return
    }
    onSave({ project: project.trim(), description: description.trim(), notes: notes.trim() })
  }

  return (
    <div className="pt-modal-overlay" onClick={onCancel}>
      <motion.div
        className="pt-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 450 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Plus size={18} color="#3b82f6" />
            </div>
            <h3 style={{ margin: 0 }}>Add New Task</h3>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Project Name</label>
            <input
              type="text"
              required
              className="pt-input"
              value={project}
              onChange={e => setProject(e.target.value)}
              placeholder="e.g. General, Frontend, Design"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Task Description</label>
            <input
              type="text"
              required
              className="pt-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What are you working on?"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Additional Notes (Optional)</label>
            <textarea
              className="pt-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Enter additional task details..."
              rows={3}
              style={{ resize: 'vertical', minHeight: 60 }}
            />
          </div>

          <div className="pt-modal-btns" style={{ marginTop: 10 }}>
            <button type="button" className="pt-action-btn pending" onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="pt-action-btn start" style={{ background: '#2563eb' }} disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Adding…' : 'Add Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onAction, actionLoading }) {
  const isRunning = !!task.isRunning
  const isCompleted = task.status === 'Completed'
  const isPending = task.status === 'Pending'

  const startTime = fmtTime(task.startedAt)
  const endTime = fmtTime(task.completedAt)
  const duration = fmtDuration(task.liveDurationMinutes || task.durationMinutes)

  const cardClass = `pt-task-card${isRunning ? ' running' : ''}${isCompleted ? ' completed' : ''}`

  return (
    <motion.div
      className={cardClass}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
    >
      {/* Header */}
      <div className="pt-task-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Project chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <Briefcase size={11} color="var(--text-muted)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {task.project || 'Untitled Project'}
            </span>
          </div>
          {/* Description */}
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4 }}>
            {task.description}
          </div>
          {task.notes && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {task.notes}
            </div>
          )}
        </div>
        <StatusBadge status={task.status} isRunning={isRunning} />
      </div>

      {/* Meta: time info */}
      <div className="pt-task-meta">
        {/* Live timer when running */}
        {isRunning && (
          <LiveTimer startedAt={task.startedAt} baseDurationMinutes={task.durationMinutes || 0} />
        )}

        {/* Start time */}
        {startTime && !isRunning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <Play size={11} color="#3b82f6" />
            <span>Started: <strong style={{ color: 'var(--text)' }}>{startTime}</strong></span>
          </div>
        )}
        {isRunning && startTime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <Play size={11} color="#f59e0b" />
            <span>Started: <strong style={{ color: '#92400e' }}>{startTime}</strong></span>
          </div>
        )}

        {/* End time */}
        {endTime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <Square size={11} color="#58833b" />
            <span>Completed: <strong style={{ color: 'var(--text)' }}>{endTime}</strong></span>
          </div>
        )}

        {/* Duration */}
        {duration && !isRunning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <Clock size={11} color="var(--text-muted)" />
            <span>Duration: <strong style={{ color: 'var(--text)' }}>{duration}</strong></span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-task-actions">
        {/* START button — show for Pending tasks */}
        {isPending && (
          <button
            className="pt-action-btn start"
            onClick={() => onAction(task, 'start')}
            disabled={actionLoading === task._id}
          >
            {actionLoading === task._id
              ? <Loader2 size={13} className="animate-spin" />
              : <Play size={13} />}
            Start Task
          </button>
        )}

        {/* START button — also show for In Progress (restart / resume) */}
        {task.status === 'In Progress' && !isRunning && (
          <button
            className="pt-action-btn start"
            onClick={() => onAction(task, 'start')}
            disabled={actionLoading === task._id}
          >
            {actionLoading === task._id
              ? <Loader2 size={13} className="animate-spin" />
              : <Play size={13} />}
            Resume
          </button>
        )}

        {/* COMPLETE button */}
        {!isCompleted && (
          <button
            className="pt-action-btn complete"
            onClick={() => onAction(task, 'complete')}
            disabled={actionLoading === task._id}
          >
            {actionLoading === task._id
              ? <Loader2 size={13} className="animate-spin" />
              : <CheckCircle2 size={13} />}
            Mark Complete
          </button>
        )}

        {/* PENDING button — show for In Progress and Completed */}
        {!isPending && (
          <button
            className="pt-action-btn pending"
            onClick={() => onAction(task, 'pending')}
            disabled={actionLoading === task._id}
          >
            <RotateCcw size={13} />
            Move to Pending
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function PortalTasks() {
  const now = new Date()
  const [view, setView] = useState('today')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('All')
  const [activeTab, setActiveTab] = useState('daily')
  const [assignedTasks, setAssignedTasks] = useState([])
  const [assignedLoading, setAssignedLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // taskId being acted upon

  const fetchAssignedTasks = async () => {
    setAssignedLoading(true)
    try {
      const res = await api.get('/assigned-tasks/staff')
      setAssignedTasks(res.data.tasks || [])
    } catch {
      toast.error('Failed to load assigned tasks')
    } finally {
      setAssignedLoading(false)
    }
  }

  const handleUpdateAssignedStatus = async (taskId, newStatus) => {
    setActionLoading(taskId)
    try {
      const res = await api.patch(`/assigned-tasks/staff/${taskId}/status`, { status: newStatus })
      if (res.data.success) {
        toast.success(`Task marked as ${newStatus}`)
        setAssignedTasks(prev => prev.map(t => t._id === taskId ? res.data.task : t))
      }
    } catch {
      toast.error('Failed to update task status')
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    fetchAssignedTasks()
  }, [])

  // Search & sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Date') // 'Date' | 'Project' | 'Status'

  // Modals
  const [conflictModal, setConflictModal] = useState(null)   // { task, pendingAction }
  const [manualModal, setManualModal] = useState(null)       // { task, attendanceId }
  const [manualSaving, setManualSaving] = useState(false)
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false)
  const [addTaskSaving, setAddTaskSaving] = useState(false)

  // ── Inject CSS ──
  useEffect(() => {
    const id = 'pt-v2-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id; el.innerHTML = STYLES
      document.head.appendChild(el)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  // ── Fetch tasks ──
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = view === 'month' ? `?month=${month}&year=${year}` : ''
      const res = await api.get(`/attendance/tasks/today${params}`)
      setTasks(res.data.tasks || [])
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [view, month, year])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // ── Refresh live duration for running tasks every 30s ──
  useEffect(() => {
    const hasRunning = tasks.some(t => t.isRunning)
    if (!hasRunning) return
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [tasks, fetchTasks])

  // ── Filter by view ──
  const filteredByView = useMemo(() => {
    if (view === 'today') return tasks.filter(t => isToday(t.taskDate))
    if (view === 'week')  return tasks.filter(t => isThisWeek(t.taskDate))
    return tasks
  }, [tasks, view])

  // ── Search Filtering ──
  const searchedTasks = useMemo(() => {
    if (!searchQuery.trim()) return filteredByView
    const q = searchQuery.toLowerCase()
    return filteredByView.filter(t => 
      (t.project && t.project.toLowerCase().includes(q)) || 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    )
  }, [filteredByView, searchQuery])

  // ── Filter by status ──
  const statusFiltered = useMemo(() => {
    if (filterStatus === 'All') return searchedTasks
    if (filterStatus === 'Running') return searchedTasks.filter(t => t.isRunning)
    return searchedTasks.filter(t => t.status === filterStatus)
  }, [searchedTasks, filterStatus])

  // ── Sort Tasks ──
  const sortedTasks = useMemo(() => {
    const list = [...statusFiltered]
    if (sortBy === 'Project') {
      return list.sort((a, b) => (a.project || '').localeCompare(b.project || ''))
    }
    if (sortBy === 'Status') {
      return list.sort((a, b) => (a.status || '').localeCompare(b.status || ''))
    }
    // Default / Date: newest date first, then newer startedAt first
    return list.sort((a, b) => {
      const d1 = new Date(a.taskDate || 0).getTime()
      const d2 = new Date(b.taskDate || 0).getTime()
      if (d1 !== d2) return d2 - d1
      const t1 = a.startedAt ? new Date(a.startedAt).getTime() : 0
      const t2 = b.startedAt ? new Date(b.startedAt).getTime() : 0
      return t2 - t1
    })
  }, [statusFiltered, sortBy])

  // ── Counts ──
  const counts = useMemo(() => ({
    total: filteredByView.length,
    completed: filteredByView.filter(t => t.status === 'Completed').length,
    inProgress: filteredByView.filter(t => t.status === 'In Progress').length,
    pending: filteredByView.filter(t => t.status === 'Pending').length,
    running: filteredByView.filter(t => t.isRunning).length,
  }), [filteredByView])

  const completionRate = counts.total ? Math.round((counts.completed / counts.total) * 100) : 0

  // ── Group by date ──
  const groupedByDate = useMemo(() => {
    const map = {}
    sortedTasks.forEach(task => {
      const key = new Date(task.taskDate).toDateString()
      if (!map[key]) map[key] = { dateStr: task.taskDate, tasks: [] }
      map[key].tasks.push(task)
    })
    return Object.values(map).sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr))
  }, [sortedTasks])

  // ── Check for running task in current view ──
  const runningTask = useMemo(() => filteredByView.find(t => t.isRunning), [filteredByView])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // ── Action handler ──
  const handleAction = useCallback(async (task, action, confirmed = false) => {
    // If starting a task and there's already a running task (not this one), show conflict modal
    if (action === 'start' && runningTask && runningTask._id !== task._id && !confirmed) {
      setConflictModal({ task, pendingAction: action })
      return
    }

    setActionLoading(task._id)
    try {
      const res = await api.patch(
        `/attendance/tasks/${task.attendanceId}/${task._id}/status`,
        { action }
      )

      if (res.data.needsManualDuration) {
        setManualModal({ task, attendanceId: task.attendanceId })
        return
      }

      setTasks(prev => prev.map(t => {
        if (t._id === task._id) {
          return { ...t, ...res.data.task }
        }
        if (res.data.stoppedPreviousTask && t._id === res.data.stoppedPreviousTask.taskId?.toString()) {
          return { ...t, isRunning: false, durationMinutes: res.data.stoppedPreviousTask.durationMinutes }
        }
        return t
      }))

      const messages = {
        start: '▶ Task started',
        complete: '✓ Task completed',
        pending: '↩ Moved to Pending'
      }
      toast.success(messages[action] || 'Updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task')
    } finally {
      setActionLoading(null)
      setConflictModal(null)
    }
  }, [runningTask])

  // ── Manual duration save ──
  const handleManualDuration = async (hours, minutes) => {
    if (!manualModal) return
    setManualSaving(true)
    try {
      const res = await api.patch(
        `/attendance/tasks/${manualModal.attendanceId}/${manualModal.task._id}/manual-duration`,
        { hours, minutes }
      )
      setTasks(prev => prev.map(t =>
        t._id === manualModal.task._id ? { ...t, ...res.data.task } : t
      ))
      toast.success(`✓ Task completed: ${hours}h ${minutes}m recorded`)
      setManualModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save duration')
    } finally {
      setManualSaving(false)
    }
  }

  // ── Dynamic Task Create ──
  const handleAddTask = async (taskData) => {
    setAddTaskSaving(true)
    try {
      const res = await api.post('/attendance/tasks/add', taskData)
      if (res.data.success) {
        setTasks(prev => [res.data.task, ...prev])
        toast.success('Task added successfully')
        setAddTaskModalOpen(false)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add task. Make sure you have punched in today!')
    } finally {
      setAddTaskSaving(false)
    }
  }

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      {/* Modals */}
      <AnimatePresence>
        {conflictModal && (
          <ConflictModal
            task={conflictModal.task}
            onConfirm={() => handleAction(conflictModal.task, 'start', true)}
            onCancel={() => setConflictModal(null)}
          />
        )}
        {manualModal && (
          <ManualDurationModal
            task={manualModal.task}
            onSave={handleManualDuration}
            onCancel={() => setManualModal(null)}
            saving={manualSaving}
          />
        )}
        {addTaskModalOpen && (
          <AddTaskModal
            onSave={handleAddTask}
            onCancel={() => setAddTaskModalOpen(false)}
            saving={addTaskSaving}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>My Tasks</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Manage and track your assigned tasks</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input
              type="text"
              placeholder="Search tasks..."
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

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="Date">Sort by: Date</option>
            <option value="Project">Sort by: Project</option>
            <option value="Status">Sort by: Status</option>
          </select>

          {/* Add Task button */}
          <button
            onClick={() => setAddTaskModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
            }}
          >
            <Plus size={14} color="white" />
            Add Task
          </button>
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button 
          onClick={() => setActiveTab('daily')} 
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'daily' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'daily' ? 'white' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s'
          }}
        >
          My Daily Tasks
        </button>
        <button 
          onClick={() => setActiveTab('assigned')} 
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'assigned' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'assigned' ? 'white' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.2s, color 0.2s'
          }}
        >
          Admin Assigned
          {assignedTasks.filter(t => t.status === 'Pending').length > 0 && (
            <span style={{ background: '#dc2626', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
              {assignedTasks.filter(t => t.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'daily' ? (
        <>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16, marginBottom: 20 }}>
        {[
          {
            label: 'Total Tasks',
            value: counts.total,
            icon: ListChecks,
            bg: 'rgba(59,130,246,0.08)',
            color: '#3b82f6',
            subText: view === 'today' ? 'Logged today' : view === 'week' ? 'This week' : 'This month',
            rightElement: (
              <svg width="55" height="22" viewBox="0 0 55 22" style={{ overflow: 'visible', flexShrink: 0 }}>
                <path d="M0 10 Q 13.75 18, 27.5 10 T 55 12" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )
          },
          {
            label: 'Completed',
            value: counts.completed,
            icon: CheckCircle2,
            bg: 'rgba(34,197,94,0.08)',
            color: '#22c55e',
            subText: `${completionRate}% of total`,
            rightElement: <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid var(--border)', flexShrink: 0 }} />
          },
          {
            label: 'In Progress',
            value: counts.inProgress,
            icon: Clock,
            bg: 'rgba(59,130,246,0.08)',
            color: '#3b82f6',
            subText: counts.inProgress === 1 ? '1 task active' : `${counts.inProgress} tasks active`,
            rightElement: <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid var(--border)', flexShrink: 0 }} />
          },
          {
            label: 'Pending',
            value: counts.pending,
            icon: AlertCircle,
            bg: 'rgba(249,115,22,0.08)',
            color: '#f97316',
            subText: 'Awaiting action',
            rightElement: <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid var(--border)', flexShrink: 0 }} />
          },
        ].map(({ label, value, icon: Icon, bg, color, subText, rightElement }) => (
          <div key={label} className="pt-stat">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>{subText}</div>
              </div>
            </div>
            {rightElement}
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      {counts.total > 0 && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Completion Rate</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>{completionRate}%</span>
          </div>
          <div className="pt-progress">
            <div className="pt-progress-fill" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
      )}

      {/* ── Running task banner ── */}
      <AnimatePresence>
        {runningTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,.12), rgba(245,158,11,.06))',
              border: '1px solid rgba(245,158,11,.35)',
              borderRadius: 12, padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}
          >
            <span className="pt-pulse-dot" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>Task in progress: </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#78350f' }}>{runningTask.description}</span>
            </div>
            <LiveTimer startedAt={runningTask.startedAt} baseDurationMinutes={runningTask.durationMinutes || 0} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View Tabs + Month nav ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {[
            { id: 'today', label: 'Today',      icon: Calendar },
            { id: 'week',  label: 'This Week',  icon: CalendarDays },
            { id: 'month', label: 'Monthly',    icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`pt-tab${view === id ? ' active' : ''}`}
              onClick={() => setView(id)}
              style={{
                background: view === id ? '#eff6ff' : 'transparent',
                color: view === id ? '#1e40af' : 'var(--text-muted)',
                borderRadius: 8,
                boxShadow: 'none'
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

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

      {/* ── Status Filter Chips ── */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 18 }}>
        {[
          { id: 'All',         label: `All (${counts.total})` },
          { id: 'In Progress', label: `In Progress (${counts.inProgress})` },
          { id: 'Pending',     label: `Pending (${counts.pending})` },
          { id: 'Completed',   label: `Completed (${counts.completed})` },
          ...(counts.running > 0 ? [{ id: 'Running', label: `Running (${counts.running})` }] : []),
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilterStatus(id)}
            style={{
              padding: '6px 4px', fontSize: 13, fontWeight: filterStatus === id ? 700 : 500, cursor: 'pointer',
              background: 'transparent',
              color: filterStatus === id ? 'var(--text)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: filterStatus === id ? '2.5px solid #2563eb' : '2.5px solid transparent',
              borderRadius: 0,
              transition: 'all .15s',
              marginRight: 12
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Task List ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : groupedByDate.length === 0 ? (
        <div style={{
          padding: '64px 32px',
          textAlign: 'center',
          background: 'var(--surface)',
          borderRadius: 14,
          border: '1px solid var(--border)',
          marginBottom: 20
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>
            No Tasks for {view === 'today' ? 'Today' : view === 'week' ? 'This Week' : 'This Month'}
          </h3>
          <p style={{ margin: '0 0 4px 0', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            You're all caught up.
          </p>
          <p style={{ margin: '0 0 24px 0', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            New tasks will appear automatically after Punch In.
          </p>
          <button
            onClick={fetchTasks}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: '#2563eb',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
            className="btn-hover"
          >
            <RotateCcw size={14} />
            Refresh
          </button>
        </div>
      ) : (
        <AnimatePresence>
          {groupedByDate.map(({ dateStr, tasks: dayTasks }) => (
            <div key={dateStr} className="pt-date-section">
              {/* Date label */}
              <div className="pt-date-label">
                <CalendarDays size={14} color="var(--primary)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {fmtDate(dateStr)}
                  {isToday(dateStr) && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(88,131,59,.12)', color: 'var(--primary)' }}>
                      Today
                    </span>
                  )}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {dayTasks.filter(t => t.status === 'Completed').length}/{dayTasks.length} done
                </span>
              </div>

              {/* Task cards */}
              {dayTasks.map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          ))}
        </AnimatePresence>
      )}

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
          Tip: Your assigned tasks will automatically appear after Punch In or when your manager assigns a task.
        </span>
      </div>
      </>
      ) : (
        assignedLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        ) : assignedTasks.length === 0 ? (
          <div style={{
            padding: '64px 32px',
            textAlign: 'center',
            background: 'var(--surface)',
            borderRadius: 14,
            border: '1px solid var(--border)',
            marginBottom: 20
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>
              No Projects Assigned
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              Projects assigned to you by the Admin will appear here.
            </p>
            <button
              onClick={fetchAssignedTasks}
              style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', color: '#2563eb', fontWeight: 700,
                fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
              }}
            >
              <RotateCcw size={14} /> Refresh
            </button>
          </div>
        ) : (
          <div>
            {/* Section header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Assigned Projects</span>
                <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1e40af' }}>
                  {assignedTasks.length}
                </span>
              </div>
              <button onClick={fetchAssignedTasks}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <RotateCcw size={12} /> Refresh
              </button>
            </div>

            {/* Column headers */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', padding: '10px 20px',
                fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
                background: 'var(--bg)', borderBottom: '1px solid var(--border)'
              }}>
                <div style={{ flex: 1 }}>Project</div>
                <div style={{ width: 100, textAlign: 'center' }}>Priority</div>
                <div style={{ width: 110, textAlign: 'center' }}>Status</div>
                <div style={{ width: 130, textAlign: 'center' }}>Due Date</div>
                <div style={{ width: 180, textAlign: 'right', paddingRight: 10 }}>Action</div>
              </div>

              {/* Rows */}
              {assignedTasks.map((task, idx) => {
                const isLast = idx === assignedTasks.length - 1
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed'
                const priorityColor = task.priority === 'Urgent' ? '#dc2626'
                  : task.priority === 'High' ? '#ea580c'
                  : task.priority === 'Medium' ? '#2563eb' : '#64748b'
                const priorityBg = task.priority === 'Urgent' ? '#fee2e2'
                  : task.priority === 'High' ? '#ffedd5'
                  : task.priority === 'Medium' ? '#dbeafe' : '#f1f5f9'
                const statusColor = task.status === 'Completed' ? '#16a34a'
                  : task.status === 'In Progress' ? '#d97706'
                  : task.status === 'Accepted' ? '#2563eb' : '#64748b'
                const statusBg = task.status === 'Completed' ? '#dcfce7'
                  : task.status === 'In Progress' ? '#fef3c7'
                  : task.status === 'Accepted' ? '#dbeafe' : '#f1f5f9'

                return (
                  <div key={task._id} style={{
                    display: 'flex', alignItems: 'center',
                    background: 'var(--surface)', borderBottom: isLast ? 'none' : '1px solid var(--border)',
                    transition: 'background .15s',
                    padding: '10px 20px',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
                  >
                    {/* Col 1 — Project name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13 }}>📁</span>
                        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </span>
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 11, color: '#94a3b8', wordBreak: 'break-word', marginTop: 4, lineHeight: 1.4, maxWidth: 500 }}>
                          {task.description}
                        </div>
                      )}
                    </div>

                    {/* Col 2 — Priority */}
                    <div style={{ width: 100, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: priorityBg, color: priorityColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {task.priority}
                      </span>
                    </div>

                    {/* Col 3 — Status */}
                    <div style={{ width: 110, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: statusBg, color: statusColor, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {task.status === 'Completed' ? '✓ ' : ''}{task.status}
                      </span>
                    </div>

                    {/* Col 4 — Due date */}
                    <div style={{ width: 130, flexShrink: 0 }}>
                      {task.dueDate ? (
                        <div style={{ fontSize: 11, color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? 700 : 500, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                            <Calendar size={12} />
                            {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          {isOverdue && <div style={{ fontSize: 9, color: '#dc2626', fontWeight: 700, marginTop: 1 }}>Overdue</div>}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#cbd5e1', display: 'block', textAlign: 'center' }}>–</span>
                      )}
                    </div>

                    {/* Col 5 — Action */}
                    <div style={{ width: 180, flexShrink: 0, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                      {task.status === 'Pending' && (
                        <button
                          onClick={() => handleUpdateAssignedStatus(task._id, 'Accepted')}
                          disabled={actionLoading === task._id}
                          style={{
                            padding: '5px 12px', borderRadius: 6, border: 'none',
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
                          }}
                        >
                          {actionLoading === task._id ? <Loader2 size={11} className="animate-spin" /> : '✓'} Accept
                        </button>
                      )}
                      {task.status === 'Accepted' && (
                        <button
                          onClick={() => handleUpdateAssignedStatus(task._id, 'In Progress')}
                          disabled={actionLoading === task._id}
                          style={{
                            padding: '5px 12px', borderRadius: 6, border: '1.5px solid #d97706',
                            background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
                          }}
                        >
                          {actionLoading === task._id ? <Loader2 size={11} className="animate-spin" /> : '▶'} Start
                        </button>
                      )}
                      {task.status === 'In Progress' && (
                        <button
                          onClick={() => handleUpdateAssignedStatus(task._id, 'Completed')}
                          disabled={actionLoading === task._id}
                          style={{
                            padding: '5px 12px', borderRadius: 6, border: '1.5px solid #16a34a',
                            background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
                          }}
                        >
                          {actionLoading === task._id ? <Loader2 size={11} className="animate-spin" /> : '✓'} Mark Done
                        </button>
                      )}
                      {task.status === 'Completed' && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', padding: '5px 12px', background: '#dcfce7', borderRadius: 6 }}>
                          ✓ Completed
                        </span>
                      )}
                      {(task.status === 'Accepted' || task.status === 'In Progress') && (
                        <button
                          onClick={() => handleUpdateAssignedStatus(task._id, 'Pending')}
                          disabled={actionLoading === task._id}
                          title="Reset to Pending"
                          style={{ padding: '5px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}
                        >↺</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}
    </PageShell>
  )
}
