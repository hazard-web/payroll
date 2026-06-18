import { useState, useEffect, useCallback } from 'react'
import { LogIn, LogOut, Clock, Calendar as CalendarIcon, AlertCircle, Loader2, Timer, Coffee, Briefcase, UserCheck, X, Plus, ListChecks, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import PageShell from '../../components/PageShell'
import { motion, AnimatePresence } from 'framer-motion'
import { useStaffPortal } from '../../context/StaffPortalContext'
import { useNavigate } from 'react-router-dom'

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

  // Show the mandatory profile-completion popup if the employee's
  // profile is incomplete. The popup is non-dismissable and redirects
  // them to /portal/profile.
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
    project: task.project?.trim() || 'General',
    description: task.description?.trim(),
    status: ['Pending', 'In Progress', 'Completed'].includes(task.status) ? task.status : 'Pending'
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
      setTaskItems([{ project: staffUser?.clientAssignment || 'General', description: '', status: 'Pending' }])
    } else {
      const existing = activeShift?.tasks?.map(task => ({
        project: task.project || staffUser?.clientAssignment || 'General',
        description: task.description || '',
        status: task.status || 'Pending'
      }))
      setTaskItems(existing && existing.length > 0 ? existing : [{ project: staffUser?.clientAssignment || 'General', description: '', status: 'Pending' }])
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
    setTaskItems(prev => [...prev, { project: staffUser?.clientAssignment || 'General', description: '', status: 'Pending' }])
  }

  const canAddMoreTask = taskItems.length < 8

  const removeTaskItem = (index) => {
    setTaskItems(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleTaskSubmit = async () => {
    setTaskSubmitting(true)
    try {
      const cleanedTasks = normalizeTasks(taskItems)
      if (taskMode === 'in' && cleanedTasks.filter(task => task.description).length < 2) {
        toast.error('Please fill at least 2 tasks before punching in.')
        return
      }
      if (cleanedTasks.length === 0 || cleanedTasks.some(task => !task.description)) {
        toast.error('Please fill all task descriptions.')
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
      toast.error(err.response?.data?.message || `Failed to ${taskMode === 'in' ? 'punch in' : 'punch out'}`)
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
  const dayOfWeek = new Date().getDay()
  const isPunchedIn = Boolean(activeShift && !activeShift.punchOut)

  // Effective working days: staff override → admin default → Mon-Fri fallback
  const effectiveWorkDays = (staffUser?.workingDays && staffUser.workingDays.length)
    ? staffUser.workingDays
    : (staffUser?.defaultWorkDays || [1, 2, 3, 4, 5])

  const isWorkDay = effectiveWorkDays.includes(dayOfWeek)
  const isOffDay  = !isWorkDay
  const isWeekendWork = !isOffDay && (dayOfWeek === 0 || dayOfWeek === 6) // Sat/Sun but assigned working
  const clientName = staffUser?.clientAssignment || ''

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
      <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
    </div>
  )

  return (
    <PageShell narrow>
      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{greeting}, {staffUser?.fullName?.split(' ')[0]} 👋</h1>
        <p style={{ color: 'var(--text-muted)', fontWeight: 500, marginTop: 4, fontSize: 14 }}>
          {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      {/* Off-day Banner */}
      {isOffDay && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24, padding: '20px 24px', borderRadius: 14, background: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 18, color: 'white' }}>
          <Coffee size={36} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 3 }}>
              {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayOfWeek]} — Your Day Off 🎉
            </div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Attendance tracking is paused. Relax and recharge!</div>
          </div>
        </motion.div>
      )}

      {/* Weekend Work Banner */}
      {isWeekendWork && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24, padding: '20px 24px', borderRadius: 14, background: '#4f46e5', display: 'flex', alignItems: 'center', gap: 18, color: 'white' }}>
          <Briefcase size={36} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 3 }}>
              {dayOfWeek === 6 ? 'Saturday' : 'Sunday'} — Working Day
              {clientName && <span style={{ fontWeight: 500, fontSize: 14, marginLeft: 10, opacity: 0.88 }}>· {clientName}</span>}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>You're scheduled to work today. Punch in when you're ready!</div>
          </div>
        </motion.div>
      )}

      {/* Main Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>

        {/* Clock Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(88,131,59,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Clock size={28} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 10 }}>
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13 }}>
            <CalendarIcon size={14} />
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </motion.div>

        {/* Punch Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card" style={{ padding: '28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 16, fontWeight: 700 }}>Shift Status</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                {isPunchedIn ? 'Currently punched in' : (activeShift?.workStatus ? `Today: ${activeShift.workStatus}` : 'Not punched in yet')}
              </p>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: isPunchedIn ? 'var(--primary)' : '#f1f5f9',
              color: isPunchedIn ? 'white' : 'var(--text-muted)'
            }}>
              {isPunchedIn && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', animation: 'pulse 1.5s infinite' }} />}
              {isPunchedIn ? 'ACTIVE' : (activeShift?.workStatus?.toUpperCase() || 'OFF-DUTY')}
            </span>
          </div>

          {isPunchedIn && activeShift?.punchIn && (
            <div style={{ marginBottom: 24, padding: '14px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Timer size={14} /> Session Duration
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                {formatDuration(activeShift.punchIn)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Punched in at {new Date(activeShift.punchIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </div>
          )}

          {!isPunchedIn ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => openTaskModal('in')} disabled={actionLoading || taskSubmitting} className="btn-primary"
              style={{ width: '100%', height: 52, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 10 }}>
              {actionLoading || taskSubmitting ? <Loader2 size={20} className="animate-spin" /> : <><LogIn size={20} /> Punch In</>}
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => openTaskModal('out')} disabled={actionLoading || taskSubmitting}
              style={{ width: '100%', height: 52, fontSize: 15, fontWeight: 700, borderRadius: 10, background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 14px rgba(239,68,68,0.25)' }}>
              {actionLoading || taskSubmitting ? <Loader2 size={20} className="animate-spin" /> : <><LogOut size={20} /> Punch Out</>}
            </motion.button>
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card"
        style={{ padding: '22px 24px', marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(88,131,59,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ListChecks size={20} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Today's Task Plan</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter tasks before punching in and update statuses before punch out.</div>
            </div>
          </div>

          {activeShift?.tasks?.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {activeShift.tasks.slice(0, 3).map((task, index) => (
                <div key={index} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{task.project || 'General'}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: task.status === 'Completed' ? '#15803d' : task.status === 'In Progress' ? '#c2410c' : '#475569', textTransform: 'uppercase' }}>
                      {task.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.description}</div>
                </div>
              ))}
              {activeShift.tasks.length > 3 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>+ {activeShift.tasks.length - 3} more task(s)</div>
              )}
            </div>
          ) : (
            <div style={{ padding: '18px 16px', borderRadius: 12, background: 'var(--bg)', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: 13 }}>
              No task plan available yet. Use Punch In to add your first tasks.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', background: 'rgba(88,131,59,0.08)', borderRadius: 14, padding: '14px 16px', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(88,131,59,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Task completion</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{activeShift?.tasks?.length ? `${Math.round((activeShift.tasks.filter(t => t.status === 'Completed').length / activeShift.tasks.length) * 100)}%` : '0%'}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10, padding: '16px', borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total tasks</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{activeShift?.tasks?.length || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Completed: {activeShift?.tasks?.filter(t => t.status === 'Completed').length || 0}</div>
          </div>
        </div>
      </motion.div>

      {/* Work Policy */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card"
        style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(88,131,59,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={20} color="var(--primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: 14, fontWeight: 700 }}>Work Hours Policy</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px 24px' }}>
              {[
                ['Start Time', '10:30 AM'],
                ['Half Day Threshold', 'Punch-in after 11:00 AM'],
                ['Full Day', '8.5+ hours logged'],
                ['Half Day', '4 to 7.9 hours logged'],
                ['LOP', 'Less than 4 hours'],
              ].map(([k, v]) => (
                <div key={k} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{k}:</span> {v}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showTaskModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              transition={{ type: 'spring', damping: 24, stiffness: 240 }}
              style={{ width: '100%', maxWidth: 640, background: 'var(--surface)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 28px 70px rgba(0,0,0,0.22)' }}
            >
              <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                      {taskMode === 'in' ? 'Punch In Task Plan' : 'Punch Out Task Update'}
                    </div>
                    <h2 style={{ margin: '10px 0 0', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                      {taskMode === 'in' ? 'Plan your tasks before starting your shift' : 'Review and update task statuses'}
                    </h2>
                  </div>
                  <button onClick={() => setShowTaskModal(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '20px 28px', display: 'grid', gap: 18, maxHeight: '72vh', overflowY: 'auto' }}>
                {taskItems.map((item, index) => (
                  <div key={index} style={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg)', padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Task {index + 1}</div>
                      {taskItems.length > 1 && (
                        <button onClick={() => removeTaskItem(index)} type="button" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Project</label>
                        <input value={item.project} onChange={(e) => updateTaskItem(index, 'project', e.target.value)} placeholder="Project name" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none', transition: 'border-color .15s' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Task description</label>
                        <textarea value={item.description} onChange={(e) => updateTaskItem(index, 'description', e.target.value)} rows={3} placeholder="Describe what you will work on" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none', transition: 'border-color .15s', resize: 'vertical', minHeight: 72 }} />
                      </div>
                      {taskMode === 'out' && (
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Status</label>
                          <select value={item.status} onChange={(e) => updateTaskItem(index, 'status', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none', transition: 'border-color .15s' }}>
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
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      width: '100%',
                      height: 50,
                      padding: '0 18px',
                      borderRadius: 14,
                      border: canAddMoreTask ? '1px dashed var(--primary)' : '1px dashed var(--border)',
                      background: canAddMoreTask ? 'rgba(88,131,59,0.1)' : 'transparent',
                      color: canAddMoreTask ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: canAddMoreTask ? 'pointer' : 'not-allowed',
                      opacity: canAddMoreTask ? 1 : 0.55
                    }}
                  >
                    <Plus size={18} /> Add New Task
                    {!canAddMoreTask && <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>Maximum 8 tasks</span>}
                  </button>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap', position: 'sticky', bottom: 0, paddingTop: 16, paddingBottom: 2, background: 'var(--surface)' }}>
                  <button type="button" onClick={() => setShowTaskModal(false)} style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', borderRadius: 12, padding: '12px 18px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleTaskSubmit} disabled={taskSubmitting} className="btn-primary" style={{ padding: '12px 18px', minWidth: 140 }}>
                    {taskSubmitting ? <Loader2 size={18} className="animate-spin" /> : taskMode === 'in' ? 'Punch In' : 'Punch Out'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }`}</style>

      {/* Mandatory Profile-Completion Popup */}
      <AnimatePresence>
        {showProfilePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
            }}
            // No onClick to backdrop — this popup is non-dismissable
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: 'spring', damping: 24, stiffness: 240 }}
              style={{
                background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 480,
                boxShadow: '0 30px 60px -20px rgba(0,0,0,0.4)', overflow: 'hidden',
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ background: 'linear-gradient(135deg, #FFBE11 0%, #f59e0b 100%)', padding: '24px 28px', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, background: 'rgba(15,23,42,0.9)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 10px 20px -5px rgba(0,0,0,0.3)'
                }}>
                  <UserCheck size={32} color="#FFBE11" />
                </div>
              </div>
              <div style={{ padding: '28px 32px 32px' }}>
                <h2 style={{ margin: 0, marginBottom: 12, color: 'var(--primary)', fontSize: 22, textAlign: 'center' }}>
                  Complete Your Profile
                </h2>
                <p style={{ margin: 0, marginBottom: 24, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, fontSize: 14 }}>
                  Please complete your profile before continuing. This includes your PAN, address, bank details and emergency contact — required for accurate payroll.
                </p>
                <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, marginBottom: 24, fontSize: 13, color: 'var(--text-muted)' }}>
                  <strong>Why is this required?</strong> Your profile information is used to generate your payslips, tax forms (TDS/Form 16) and to disburse your salary.
                </div>
                <button
                  onClick={() => navigate('/portal/profile')}
                  style={{
                    width: '100%', height: 52, background: 'var(--primary)', color: 'white',
                    border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  Complete Profile Now
                </button>
                <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
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
