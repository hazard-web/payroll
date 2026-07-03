import { useState, useEffect, useCallback } from 'react'
import {
  LogIn, LogOut, Clock, Loader2, X, Plus, Timer,
  Briefcase, Activity, CheckCircle2, ListChecks,
  Coffee, Zap
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import PageShell from '../../components/PageShell'
import { motion, AnimatePresence } from 'framer-motion'
import { useStaffPortal } from '../../context/StaffPortalContext'
import { useNavigate } from 'react-router-dom'
import { UserCheck } from 'lucide-react'

// ── Mini stat card for the 4-metric row ──────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, accent, active }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 12,
      background: active
        ? `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`
        : 'var(--surface)',
      border: `1px solid ${active ? `${accent}30` : 'var(--border)'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
      boxShadow: active ? `0 4px 16px ${accent}15` : '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={15} color={accent} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{sub}</div>
    </div>
  )
}

export default function PortalDashboard() {
  const { staffUser } = useStaffPortal()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeShift, setActiveShift] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showProfilePopup, setShowProfilePopup] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchActiveShift = useCallback(async () => {
    try {
      const res = await api.get('/attendance/active')
      setActiveShift(res.data.activeShift || null)
    } catch (err) {
      console.error('Failed to fetch active shift:', err)
      setActiveShift(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActiveShift()
  }, [fetchActiveShift])

  useEffect(() => {
    if (staffUser && staffUser.profileCompleted === false) {
      setShowProfilePopup(true)
    } else {
      setShowProfilePopup(false)
    }
  }, [staffUser])

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskMode, setTaskMode] = useState('in')
  const [taskItems, setTaskItems] = useState([{ project: '', description: '', status: 'Pending', notes: '' }])
  const [taskSubmitting, setTaskSubmitting] = useState(false)

  const normalizeTasks = (items) => items.map(task => ({
    project: (task.project || '').trim(),
    description: (task.description || '').trim(),
    status: ['Pending', 'In Progress', 'Completed'].includes(task.status) ? task.status : 'Pending',
    notes: (task.notes || '').trim()
  }))

  const getLocation = async () => {
    if (!('geolocation' in navigator)) return null
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      return { lat: position.coords.latitude, lng: position.coords.longitude }
    } catch (geoErr) {
      console.warn('Geolocation failed:', geoErr)
      return null
    }
  }

  const openTaskModal = (mode) => {
    setTaskMode(mode)
    if (mode === 'in') {
      const preset = (staffUser?.clientAssignment || '').trim()
      setTaskItems([{ project: preset, description: '', status: 'Pending' }])
    } else {
      const existing = activeShift?.tasks?.map(task => ({
        project: task.project || '',
        description: task.description || '',
        status: task.status || 'Pending'
      }))
      setTaskItems(existing && existing.length > 0 ? existing : [{ project: '', description: '', status: 'Pending' }])
    }
    setShowTaskModal(true)
  }

  const updateTaskItem = (index, field, value) => {
    setTaskItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item))
  }

  const addTaskItem = () => {
    if (taskItems.length >= 8) {
      toast.error('Maximum 8 tasks can be added for one shift.')
      return
    }
    const preset = (staffUser?.clientAssignment || '').trim()
    setTaskItems(prev => [...prev, { project: preset, description: '', status: 'Pending' }])
  }

  const canAddMoreTask = taskItems.length < 8

  const removeTaskItem = (index) => {
    setTaskItems(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleTaskSubmit = async () => {
    setTaskSubmitting(true)
    try {
      const cleanedTasks = normalizeTasks(taskItems)
      if (cleanedTasks.length === 0) {
        toast.error('Please add at least one task before Punch In.')
        return
      }
      if (cleanedTasks.some(task => !task.project)) {
        toast.error('Please select a project.')
        return
      }
      if (cleanedTasks.some(task => !task.description)) {
        toast.error('Please add at least one task before Punch In.')
        return
      }

      const coords = await getLocation()
      const endpoint = taskMode === 'in' ? '/attendance/punch-in' : '/attendance/punch-out'
      const payload = { tasks: cleanedTasks, ...(coords || {}) }
      const res = await api.post(endpoint, payload)
      toast.success(res.data.message)
      setShowTaskModal(false)
      await fetchActiveShift()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || `Failed to ${taskMode === 'in' ? 'punch in' : 'punch out'}`)
    } finally {
      setTaskSubmitting(false)
    }
  }

  const formatDuration = (start) => {
    const diff = Math.max(0, Math.floor((new Date() - new Date(start)) / 1000))
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const hour = currentTime.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const greetingEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙'
  const dayOfWeek = new Date().getDay()
  const isPunchedIn = Boolean(activeShift && !activeShift.punchOut)

  const effectiveWorkDays = (staffUser?.workingDays && staffUser.workingDays.length)
    ? staffUser.workingDays
    : (staffUser?.defaultWorkDays || [1, 2, 3, 4, 5])

  const isWorkDay = effectiveWorkDays.includes(dayOfWeek)
  const isOffDay = !isWorkDay
  const clientName = staffUser?.clientAssignment || ''

  const sessions = Array.isArray(activeShift?.sessions) ? activeShift.sessions : []
  const workedHours = Number(activeShift?.totalHours || 0)
  const remainingHours = Math.max(0, 8 - workedHours)
  const sessionCount = activeShift?.sessionCount ?? sessions.length
  const completedTasks = Array.isArray(activeShift?.tasks) ? activeShift.tasks.filter(task => task.status === 'Completed').length : 0
  const totalTasks = Array.isArray(activeShift?.tasks) ? activeShift.tasks.length : 0
  const pendingTasks = totalTasks - completedTasks
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
  const firstPunchIn = sessions.length > 0 ? sessions[0].startTime : null
  const lastPunchOut = sessions.filter(session => session.endTime).slice(-1)[0]?.endTime || null

  const formatHours = (hours) => {
    const totalMinutes = Math.round((hours || 0) * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h}h ${String(m).padStart(2, '0')}m`
  }

  const formatTimeLabel = (value) => value
    ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '—'

  const getTaskStatusStyle = (status) => {
    if (status === 'Completed') return { bg: 'rgba(88,131,59,0.12)', color: '#58833b' }
    if (status === 'In Progress') return { bg: 'rgba(245,158,11,0.12)', color: '#d97706' }
    return { bg: 'rgba(107,114,128,0.1)', color: '#6b7280' }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
      <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
    </div>
  )

  return (
    <PageShell>
      <div style={{ display: 'grid', gap: 14 }}>

        {/* ── Greeting Header Card ── */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #58833b18, #58833b08)',
              border: '1px solid #58833b25',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {greetingEmoji}
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
                {greeting}, <span style={{ color: 'var(--primary)' }}>{staffUser?.fullName?.split(' ')[0]}</span>
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Live Clock */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {currentTime.toLocaleTimeString('en-IN', { second: '2-digit' })}s
              </div>
            </div>

            {/* Status pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 14px',
              borderRadius: 999,
              background: isPunchedIn ? 'rgba(88,131,59,0.1)' : 'rgba(107,114,128,0.08)',
              border: `1px solid ${isPunchedIn ? 'rgba(88,131,59,0.25)' : 'rgba(107,114,128,0.18)'}`,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: isPunchedIn ? '#58833b' : '#9ca3af',
                display: 'inline-block',
                boxShadow: isPunchedIn ? '0 0 0 3px rgba(88,131,59,0.2)' : 'none',
                animation: isPunchedIn ? 'portalPulse 2s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: isPunchedIn ? '#58833b' : '#6b7280' }}>
                {isPunchedIn ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </motion.header>

        {/* ── Metrics Row (4 compact cards) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}
        >
          <MetricCard
            icon={Timer}
            label="Worked"
            value={formatHours(workedHours)}
            sub="/ 8h target"
            accent="#58833b"
            active={isPunchedIn}
          />
          <MetricCard
            icon={Clock}
            label="Remaining"
            value={formatHours(remainingHours)}
            sub="to target"
            accent="#3b82f6"
          />
          <MetricCard
            icon={Activity}
            label="Sessions"
            value={sessionCount}
            sub={`session${sessionCount === 1 ? '' : 's'} today`}
            accent="#8b5cf6"
          />
          <MetricCard
            icon={Zap}
            label="Status"
            value={isPunchedIn ? 'Active' : (activeShift?.workStatus || 'Idle')}
            sub={isPunchedIn ? 'Punched in' : 'Not punched in'}
            accent={isPunchedIn ? '#58833b' : '#9ca3af'}
            active={isPunchedIn}
          />
        </motion.div>

        {/* ── Punch Card ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          {/* Card header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(88,131,59,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={14} color="var(--primary)" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Today's Attendance</span>
            {clientName && (
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'rgba(88,131,59,0.08)', color: 'var(--primary)' }}>
                {clientName}
              </span>
            )}
          </div>

          <div style={{ padding: '16px 18px' }}>
            {/* Punch times row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'var(--bg)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(88,131,59,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogIn size={13} color="#58833b" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>First Punch In</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginTop: 1 }}>{formatTimeLabel(firstPunchIn)}</div>
                </div>
              </div>
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'var(--bg)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogOut size={13} color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Punch Out</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginTop: 1 }}>{formatTimeLabel(lastPunchOut)}</div>
                </div>
              </div>
            </div>

            {/* Live timer if punched in */}
            {isPunchedIn && firstPunchIn && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(88,131,59,0.06)', border: '1px solid rgba(88,131,59,0.15)',
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 14,
              }}>
                <Coffee size={14} color="#58833b" />
                <span style={{ fontSize: 12, color: '#58833b', fontWeight: 600 }}>Session running:</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDuration(activeShift?.sessions?.slice(-1)[0]?.startTime || firstPunchIn)}
                </span>
              </div>
            )}

            {/* Punch button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openTaskModal(isPunchedIn ? 'out' : 'in')}
              disabled={actionLoading || taskSubmitting}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 10,
                border: 'none',
                color: 'white',
                background: isPunchedIn
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #58833b, #4a7032)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: isPunchedIn
                  ? '0 4px 16px rgba(239,68,68,0.25)'
                  : '0 4px 16px rgba(88,131,59,0.25)',
                transition: 'all 0.2s',
              }}
            >
              {actionLoading || taskSubmitting
                ? <Loader2 size={18} className="animate-spin" />
                : isPunchedIn
                  ? <><LogOut size={16} /> Punch Out</>
                  : <><LogIn size={16} /> Punch In</>
              }
            </motion.button>
          </div>
        </motion.section>

        {/* ── Today's Task Plan ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          {/* Card header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(88,131,59,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ListChecks size={14} color="var(--primary)" />
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Today's Task Plan</span>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, marginTop: 1 }}>
                  Enter tasks on Punch In · Update status on Punch Out
                </p>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'rgba(88,131,59,0.08)', color: 'var(--primary)' }}>
              {totalTasks} Tasks
            </span>
          </div>

          <div style={{ padding: '14px 18px' }}>
            {/* Task list */}
            <div style={{ display: 'grid', gap: 8, marginBottom: totalTasks > 0 ? 16 : 0 }}>
              {activeShift?.tasks?.length ? activeShift.tasks.map((task, index) => {
                const { bg, color } = getTaskStatusStyle(task.status)
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: bg, border: `2px solid ${color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      {task.status === 'Completed' && <CheckCircle2 size={11} color={color} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                        {task.project || 'Untitled project'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{task.description}</div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 999,
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.04em', background: bg, color, flexShrink: 0,
                    }}>
                      {task.status}
                    </span>
                  </div>
                )
              }) : (
                <div style={{
                  padding: '20px', borderRadius: 10,
                  background: 'var(--bg)', border: '1px dashed var(--border)',
                  color: 'var(--text-muted)', textAlign: 'center', fontSize: 13,
                }}>
                  <ListChecks size={22} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
                  No task plan yet. Use <strong>Punch In</strong> to add your first tasks.
                </div>
              )}
            </div>

            {/* Progress + stats */}
            {totalTasks > 0 && (
              <div>
                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${completionRate}%`, height: '100%',
                      background: 'linear-gradient(90deg, #58833b, #7da859)',
                      borderRadius: 999, transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', minWidth: 36 }}>{completionRate}%</span>
                </div>

                {/* Task summary pills */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Total', value: totalTasks, color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
                    { label: 'Done', value: completedTasks, color: '#58833b', bg: 'rgba(88,131,59,0.08)' },
                    { label: 'Pending', value: pendingTasks, color: '#d97706', bg: 'rgba(245,158,11,0.08)' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} style={{
                      padding: '10px 12px', borderRadius: 10,
                      background: bg, textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* ── Pulse keyframe ── */}
      <style>{`
        @keyframes portalPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(88,131,59,0.2); }
          50%       { box-shadow: 0 0 0 5px rgba(88,131,59,0.08); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Task Modal ── */}
      <AnimatePresence>
        {showTaskModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              transition={{ type: 'spring', damping: 24, stiffness: 240 }}
              style={{
                width: '100%', maxWidth: 640,
                background: 'var(--surface)', borderRadius: 18,
                overflow: 'hidden', border: '1px solid var(--border)',
                boxShadow: '0 28px 70px rgba(0,0,0,0.22)',
              }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                      {taskMode === 'in' ? 'Punch In Task Plan' : 'Punch Out Task Update'}
                    </div>
                    <h2 style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                      {taskMode === 'in' ? 'Plan your tasks before starting' : 'Review and update task statuses'}
                    </h2>
                  </div>
                  <button onClick={() => setShowTaskModal(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '16px 24px', display: 'grid', gap: 14, maxHeight: '72vh', overflowY: 'auto' }}>
                {taskItems.map((item, index) => (
                  <div key={index} style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Task {index + 1}</div>
                      {taskItems.length > 1 && (
                        <button onClick={() => removeTaskItem(index)} type="button" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</label>
                        <input value={item.project} onChange={(e) => updateTaskItem(index, 'project', e.target.value)} placeholder="Select a Project" required style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task description</label>
                        <textarea value={item.description} onChange={(e) => updateTaskItem(index, 'description', e.target.value)} rows={2} placeholder="Describe what you will work on" style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 64, fontFamily: 'inherit' }} />
                      </div>
                      {taskMode === 'out' && (
                        <div>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                          <select value={item.status} onChange={(e) => updateTaskItem(index, 'status', e.target.value)} style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
                            <option>Pending</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {taskMode === 'in' && (
                  <button
                    type="button"
                    onClick={addTaskItem}
                    disabled={!canAddMoreTask}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', height: 44, padding: '0 16px', borderRadius: 10,
                      border: canAddMoreTask ? '1px dashed var(--primary)' : '1px dashed var(--border)',
                      background: canAddMoreTask ? 'rgba(88,131,59,0.08)' : 'transparent',
                      color: canAddMoreTask ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: 13,
                      cursor: canAddMoreTask ? 'pointer' : 'not-allowed',
                      opacity: canAddMoreTask ? 1 : 0.55,
                    }}
                  >
                    <Plus size={16} /> Add New Task
                    {!canAddMoreTask && <span style={{ fontSize: 11, opacity: 0.8 }}>Max 8 tasks</span>}
                  </button>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', position: 'sticky', bottom: 0, paddingTop: 12, paddingBottom: 2, background: 'var(--surface)' }}>
                  <button type="button" onClick={() => setShowTaskModal(false)} style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontSize: 13 }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleTaskSubmit} disabled={taskSubmitting} className="btn-primary" style={{ padding: '10px 20px', minWidth: 120, fontSize: 13 }}>
                    {taskSubmitting ? <Loader2 size={16} className="animate-spin" /> : taskMode === 'in' ? 'Punch In' : 'Punch Out'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mandatory Profile-Completion Popup ── */}
      <AnimatePresence>
        {showProfilePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: 'spring', damping: 24, stiffness: 240 }}
              style={{
                background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 480,
                boxShadow: '0 30px 60px -20px rgba(0,0,0,0.4)', overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ background: 'linear-gradient(135deg, #FFBE11 0%, #f59e0b 100%)', padding: '24px 28px', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, background: 'rgba(15,23,42,0.9)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 10px 20px -5px rgba(0,0,0,0.3)',
                }}>
                  <UserCheck size={32} color="#FFBE11" />
                </div>
              </div>
              <div style={{ padding: '24px 28px 28px' }}>
                <h2 style={{ margin: 0, marginBottom: 10, color: 'var(--primary)', fontSize: 20, textAlign: 'center' }}>
                  Complete Your Profile
                </h2>
                <p style={{ margin: 0, marginBottom: 20, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, fontSize: 13 }}>
                  Please complete your profile before continuing. This includes your PAN, address, bank details and emergency contact — required for accurate payroll.
                </p>
                <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                  <strong>Why is this required?</strong> Your profile information is used to generate your payslips, tax forms (TDS/Form 16) and to disburse your salary.
                </div>
                <button
                  onClick={() => navigate('/portal/profile')}
                  style={{
                    width: '100%', height: 46, background: 'var(--primary)', color: 'white',
                    border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  Complete Profile Now
                </button>
                <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                  You will not be able to use the portal until this is done.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}
